$ErrorActionPreference = 'Stop'

# Safe bootstrap -> API registration -> operational E2E startup.
# This script is pinned to one disposable LocalDB and emits no secret values.
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot 'backend\SmartFarm.WebAPI\SmartFarm.WebAPI.csproj'
$apiDll = Join-Path $repoRoot 'backend\SmartFarm.WebAPI\bin\Debug\net10.0\SmartFarm.WebAPI.dll'
$firmwareConfig = Join-Path $repoRoot 'firmware\esp32-controller\telemetry\include\config.h'
$databaseName = 'SmartFarmMini_E2E_20261125_9C4A'
$deviceCode = 'FARM-ESP32-001'
$mqttHost = 'w9d01192.ala.asia-southeast1.emqxsl.com'
$baseUrl = 'http://127.0.0.1:5206'
$runId = [Guid]::NewGuid().ToString('N').Substring(0, 8)

function Invoke-E2ESqlReadOnly([string]$query) {
    $output = & sqlcmd -S '(localdb)\MSSQLLocalDB' -E -d $databaseName -h -1 -W -Q $query 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Read-only E2E database check failed.' }
    return @($output | ForEach-Object { "$($_)".Trim() } | Where-Object { $_ })
}

function Get-DeviceState {
    $query = "SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM dbo.Devices WHERE DeviceCode = '$deviceCode') SELECT CONCAT('DEVICE_STATE|', CONVERT(varchar(1), IsActive)) FROM dbo.Devices WHERE DeviceCode = '$deviceCode'; ELSE SELECT 'DEVICE_STATE|MISSING';"
    $rows = Invoke-E2ESqlReadOnly $query
    return ($rows | Where-Object { $_ -like 'DEVICE_STATE|*' } | Select-Object -Last 1)
}

function Start-E2EApi([bool]$mqttEnabled, [string]$clientId) {
    $values = @{
        ASPNETCORE_ENVIRONMENT = 'Development'
        ASPNETCORE_URLS = $baseUrl
        'ConnectionStrings__DefaultConnection' = "Server=(localdb)\MSSQLLocalDB;Database=$databaseName;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
        Mqtt__Enabled = ([string]$mqttEnabled).ToLowerInvariant()
        Mqtt__Host = $mqttHost
        Mqtt__Port = '8883'
        Mqtt__UseTls = 'true'
        Mqtt__Username = 'smartfarm_backend'
        Mqtt__Password = $backendPassword
        Mqtt__CommandDispatchEnabled = 'false'
        Mqtt__TelemetryTopicFilter = "smartfarm/device/$deviceCode/telemetry"
        Mqtt__TelemetryDeviceCode = $deviceCode
        Mqtt__AcknowledgementTopicFilter = ' '
        Mqtt__ClientId = $clientId
    }

    $saved = @{}
    try {
        foreach ($name in $values.Keys) {
            $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
            [Environment]::SetEnvironmentVariable($name, [string]$values[$name], 'Process')
        }

        $arguments = "`"$apiDll`" --urls $baseUrl"
        return Start-Process -FilePath 'dotnet' -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    }
    finally {
        foreach ($name in $values.Keys) {
            [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process')
        }
    }
}

function Get-HealthSnapshot([System.Net.Http.HttpClient]$client) {
    try {
        $response = $client.GetAsync("$baseUrl/health/ready").GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        return ($body | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}

function Wait-ForBootstrap([System.Diagnostics.Process]$process) {
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(3)
    $deadline = (Get-Date).AddSeconds(45)
    try {
        while ((Get-Date) -lt $deadline -and -not $process.HasExited) {
            $health = Get-HealthSnapshot $client
            if ($health -and $health.mode -eq 'Bootstrap' -and $health.database -eq 'Ready' -and
                $health.databaseName -eq $databaseName -and $health.mqttBroker -eq 'Disabled' -and
                $health.telemetryReady -eq $false -and $health.commandDispatchEnabled -eq $false) {
                return $health
            }
            Start-Sleep -Seconds 1
        }
        throw 'Bootstrap API did not report isolated database Ready with MQTT disabled. No secret details were emitted.'
    }
    finally { $client.Dispose() }
}

function Wait-ForOperational([System.Diagnostics.Process]$process) {
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(3)
    $deadline = (Get-Date).AddSeconds(75)
    $lastHealth = $null
    try {
        while ((Get-Date) -lt $deadline -and -not $process.HasExited) {
            $health = Get-HealthSnapshot $client
            if ($health) {
                $lastHealth = $health
                if ($health.telemetrySubscription -and
                    $health.telemetrySubscription -notin @('GrantedQoS0', 'GrantedQoS1', 'NotGranted', 'Pending', 'Disabled')) {
                    throw ('Broker SUBACK did not grant telemetry subscription: ' + $health.telemetrySubscription)
                }
                if ($health.status -eq 'Ready' -and $health.mode -eq 'Operational' -and
                    $health.databaseName -eq $databaseName -and $health.mqttBroker -eq 'Connected' -and
                    $health.mqttHost -eq $mqttHost -and $health.mqttPort -eq 8883 -and $health.mqttUseTls -eq $true -and
                    $health.mqttUsernameIsBackend -eq $true -and $health.commandDispatchEnabled -eq $false -and
                    $health.telemetryTopicFilter -eq "smartfarm/device/$deviceCode/telemetry" -and
                    $health.telemetrySubscription -in @('GrantedQoS0', 'GrantedQoS1') -and
                    $health.acknowledgementSubscriptionEnabled -eq $false -and
                    $health.deviceRegisteredAndActive -eq $true -and $health.telemetryReady -eq $true) {
                    return $health
                }
            }
            Start-Sleep -Seconds 1
        }
        if ($lastHealth -and $lastHealth.telemetrySubscription) {
            throw ('Operational E2E did not become ready. Last safe status: database=' + $lastHealth.database +
                ', mqttBroker=' + $lastHealth.mqttBroker + ', telemetrySubscription=' + $lastHealth.telemetrySubscription +
                ', deviceRegisteredAndActive=' + $lastHealth.deviceRegisteredAndActive + '.')
        }
        throw 'Operational E2E did not become ready within 75 seconds. No secret details were emitted.'
    }
    finally { $client.Dispose() }
}

function New-TestPassword {
    $bytes = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return 'FarmE2E1-' + [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', 'A').Replace('/', 'b')
}

if (-not (Test-Path -LiteralPath $project) -or -not (Test-Path -LiteralPath $apiDll)) {
    throw 'Build the Web API before running this E2E launcher.'
}
if (-not (Test-Path -LiteralPath $firmwareConfig)) { throw 'Local firmware config.h is missing.' }

$firmwareText = Get-Content -Raw -LiteralPath $firmwareConfig
$configuredDevice = [regex]::Match($firmwareText, '(?m)^\s*constexpr\s+char\s+DeviceCode\[\]\s*=\s*"([^"]+)"').Groups[1].Value
$configuredHost = [regex]::Match($firmwareText, '(?m)^\s*constexpr\s+char\s+MqttHost\[\]\s*=\s*"([^"]+)"').Groups[1].Value
if ($configuredDevice -cne $deviceCode -or $configuredHost -cne $mqttHost -or
    $firmwareText -notmatch '(?m)constexpr\s+bool\s+TelemetryOnly\s*=\s*true' -or
    $firmwareText -notmatch '(?m)constexpr\s+bool\s+MqttUseTls\s*=\s*true' -or
    $firmwareText -notmatch '(?m)constexpr\s+uint16_t\s+MqttPort\s*=\s*8883' -or
    $firmwareText -notmatch 'BEGIN CERTIFICATE') {
    throw 'Firmware identity/TLS/TelemetryOnly preflight failed; Backend not started.'
}

# Read User Secrets in memory only. The dedicated Backend secret must not be
# confused with the legacy generic/ESP32 MQTT password.
$secretLines = & dotnet user-secrets list --project $project 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Unable to read Web API User Secrets; Backend not started.' }
$secrets = @{}
foreach ($line in $secretLines) {
    if ($line -match '^\s*([^=]+?)\s*=\s*(.*)$') {
        $secrets[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}
$backendPassword = $secrets['Mqtt:BackendE2E:Password']
if ([string]::IsNullOrWhiteSpace($backendPassword)) {
    throw 'Missing dedicated User Secret Mqtt:BackendE2E:Password; Backend not started.'
}
if ([string]::IsNullOrWhiteSpace($secrets['JwtSettings:SecretKey'])) {
    throw 'Missing JWT signing secret; Backend not started.'
}

$dbIdentity = Invoke-E2ESqlReadOnly 'SET NOCOUNT ON; SELECT DB_NAME();'
if (($dbIdentity | Select-Object -Last 1) -cne $databaseName) {
    throw 'Database identity is not the approved disposable E2E DB; Backend not started.'
}
$initialDeviceState = Get-DeviceState
if ($initialDeviceState -notin @('DEVICE_STATE|MISSING', 'DEVICE_STATE|1')) {
    throw 'DeviceCode exists but is inactive or its E2E state cannot be established; Backend not started.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 5206 -ErrorAction SilentlyContinue) {
    throw 'Port 5206 is already in use; Backend not started.'
}
Write-Output ('Preflight=PASS; database=' + $databaseName + '; firmwareDevice=' + $deviceCode + '; dedicatedBackendSecret=Present.')

$bootstrap = $null
$operational = $null
try {
    # Stage 1: an API-only bootstrap process; it cannot connect to EMQX.
    $bootstrap = Start-E2EApi -mqttEnabled $false -clientId "FarmE2E-Boot-$runId"
    Write-Output 'Stage1Process=Started; MQTT=Disabled.'
    $bootstrapHealth = Wait-ForBootstrap $bootstrap

    # Stage 2: create a disposable test owner and device using the normal API.
    if ($initialDeviceState -eq 'DEVICE_STATE|MISSING') {
        $accountId = [Guid]::NewGuid().ToString('N')
        $email = "esp32-e2e-$accountId@example.test"
        $userName = "esp32e2e_$accountId"
        $testPassword = New-TestPassword
        try {
            $registerBody = @{
                userName = $userName
                email = $email
                password = $testPassword
                displayName = 'ESP32 Telemetry E2E'
            } | ConvertTo-Json
            $auth = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/Auth/register" -ContentType 'application/json' -Body $registerBody -TimeoutSec 15
            $token = $auth.accessToken
            if ([string]::IsNullOrWhiteSpace($token)) { throw 'No access token returned.' }

            $deviceBody = @{
                deviceCode = $deviceCode
                name = 'ESP32 vườn mini E2E'
                description = 'Disposable E2E telemetry-only device'
            } | ConvertTo-Json
            $headers = @{ Authorization = "Bearer $token" }
            $createdDevice = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/Devices" -Headers $headers -ContentType 'application/json' -Body $deviceBody -TimeoutSec 15
            if ($createdDevice.deviceCode -cne $deviceCode -or $createdDevice.isActive -ne $true) {
                throw 'API response did not confirm the expected active device.'
            }
        }
        catch {
            throw 'E2E test account/device registration through the API failed; response details suppressed.'
        }
        finally {
            $testPassword = $null
            $token = $null
            $auth = $null
            $headers = $null
            $registerBody = $null
            $deviceBody = $null
            $createdDevice = $null
        }
    }
    Write-Output 'Stage2Registration=CompletedThroughApi.'

    $postRegistrationState = Get-DeviceState
    if ($postRegistrationState -cne 'DEVICE_STATE|1') {
        throw 'Read-only E2E postflight did not find the expected active device.'
    }

    Stop-Process -Id $bootstrap.Id -Force -ErrorAction SilentlyContinue
    $bootstrap.WaitForExit()
    Start-Sleep -Seconds 2

    # Stage 3: operational process with only the exact telemetry filter and no ACK or command dispatch.
    $operational = Start-E2EApi -mqttEnabled $true -clientId "FarmE2E-Run-$runId"
    Write-Output 'Stage3Process=Started; commandDispatch=Disabled; acknowledgementSubscription=Disabled.'
    $health = Wait-ForOperational $operational

    Write-Output ('Stage1=PASS; database=' + $bootstrapHealth.database + '; mqttBroker=' + $bootstrapHealth.mqttBroker + '; telemetryReady=' + $bootstrapHealth.telemetryReady)
    Write-Output ('Stage2=PASS; API device registration persisted and active in ' + $databaseName + '.')
    Write-Output ('Stage3=PASS; database=' + $health.database + '; mqttBroker=' + $health.mqttBroker +
        '; telemetrySubscription=' + $health.telemetrySubscription + '; commandDispatchEnabled=' +
        $health.commandDispatchEnabled + '; acknowledgementSubscriptionEnabled=' +
        $health.acknowledgementSubscriptionEnabled + '; telemetryReady=' + $health.telemetryReady + '.')
    Write-Output ('Operational Backend remains running at ' + $baseUrl + '; process ID: ' + $operational.Id + '.')
}
catch {
    if ($bootstrap -and -not $bootstrap.HasExited) { Stop-Process -Id $bootstrap.Id -Force -ErrorAction SilentlyContinue }
    if ($operational -and -not $operational.HasExited) { Stop-Process -Id $operational.Id -Force -ErrorAction SilentlyContinue }
    throw $_.Exception.Message
}
