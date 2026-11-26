using System.Text.Json;
using MQTTnet;
using MQTTnet.Protocol;

if (args.Length != 2)
    return 2;

using var appDoc = JsonDocument.Parse(File.ReadAllText(Path.Combine(args[0], "backend/SmartFarm.WebAPI/appsettings.Development.json")));
using var secretsDoc = JsonDocument.Parse(File.ReadAllText(args[1]));
var app = appDoc.RootElement;
var secrets = secretsDoc.RootElement;

string Setting(string name)
{
    if (secrets.TryGetProperty("Mqtt:" + name, out var value) && value.ValueKind == JsonValueKind.String)
        return value.GetString() ?? string.Empty;
    if (app.TryGetProperty("Mqtt", out var mqtt) && mqtt.TryGetProperty(name, out var configured))
        return configured.ValueKind == JsonValueKind.String ? configured.GetString() ?? string.Empty : configured.ToString();
    return string.Empty;
}

var host = Setting("Host");
var port = Setting("Port");
var username = Setting("Username");
var password = Setting("Password");
var dispatchDisabled = Setting("CommandDispatchEnabled").Equals("false", StringComparison.OrdinalIgnoreCase);
var expectedTopic = "smartfarm/device/FARM-E2E-25NOV26-9C4A/telemetry";
Console.WriteLine($"PREFLIGHT={(host == "w9d01192.ala.asia-southeast1.emqxsl.com" && port == "8883" && username == "smartfarm_backend" && password.Length > 0 && dispatchDisabled ? "PASS" : "FAIL")}; passwordPresent={password.Length > 0}; dispatchDisabled={dispatchDisabled}; topicIsSingleSyntheticDevice={expectedTopic.Contains("FARM-E2E-")}");
if (password.Length == 0 || !dispatchDisabled || host != "w9d01192.ala.asia-southeast1.emqxsl.com" || port != "8883")
    return 10;

using var client = new MqttClientFactory().CreateMqttClient();
var connected = false;
try
{
    var options = new MqttClientOptionsBuilder()
        .WithClientId("SmartFarm-E2E-Telemetry-Publisher-" + Guid.NewGuid().ToString("N"))
        .WithTcpServer(host, int.Parse(port))
        .WithCredentials(username, password)
        .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
        .WithTlsOptions(tls => tls.UseTls())
        .Build();
    var connect = await client.ConnectAsync(options, new CancellationTokenSource(TimeSpan.FromSeconds(25)).Token);
    connected = client.IsConnected;
    Console.WriteLine($"CONNECT={connect.ResultCode}; AUTHENTICATION={(connected ? "PASS" : "FAIL")}");
    if (!connected)
        return 11;

    var duplicateId = Guid.NewGuid();
    var readings = new (string Type, decimal Value, string Unit, Guid? Id)[]
    {
        ("SoilMoisture", 42m, "%", Guid.NewGuid()),
        ("AirTemperature", 27.5m, "°C", duplicateId),
        ("AirHumidity", 61.5m, "%", Guid.NewGuid()),
        ("WaterTemperature", 25m, "°C", Guid.NewGuid()),
        ("WaterLevel", 80m, "%", Guid.NewGuid()),
        ("AirTemperature", 27.5m, "°C", duplicateId)
    };
    var publishCount = 0;
    foreach (var reading in readings)
    {
        var payload = JsonSerializer.Serialize(new
        {
            messageId = reading.Id,
            sensorType = reading.Type,
            value = reading.Value,
            unit = reading.Unit,
            recordedAtUtc = DateTimeOffset.UtcNow
        });
        var message = new MqttApplicationMessageBuilder()
            .WithTopic(expectedTopic)
            .WithPayload(payload)
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .WithRetainFlag(false)
            .Build();
        var result = await client.PublishAsync(message, new CancellationTokenSource(TimeSpan.FromSeconds(15)).Token);
        publishCount++;
        Console.WriteLine($"TELEMETRY_PUBLISH_{publishCount}={(result.ReasonCode == MqttClientPublishReasonCode.Success ? "ACCEPTED" : "REJECTED")}; reason={result.ReasonCode}; type={reading.Type}; duplicate={(reading.Id == duplicateId)}");
    }

    var invalid = JsonSerializer.Serialize(new
    {
        messageId = Guid.NewGuid(),
        sensorType = "AirHumidity",
        value = 120m,
        unit = "%",
        recordedAtUtc = DateTimeOffset.UtcNow
    });
    var invalidMessage = new MqttApplicationMessageBuilder()
        .WithTopic(expectedTopic)
        .WithPayload(invalid)
        .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
        .WithRetainFlag(false)
        .Build();
    var invalidResult = await client.PublishAsync(invalidMessage, new CancellationTokenSource(TimeSpan.FromSeconds(15)).Token);
    Console.WriteLine($"INVALID_TELEMETRY_PUBLISH={(invalidResult.ReasonCode == MqttClientPublishReasonCode.Success ? "ACCEPTED_BY_BROKER" : "REJECTED_BY_BROKER")}; reason={invalidResult.ReasonCode}; expectedBackendOutcome=reject_without_persistence");
    await Task.Delay(TimeSpan.FromSeconds(4));
    await client.DisconnectAsync();
    Console.WriteLine($"PUBLISHES={publishCount + 1}; COMMAND_PUBLISHES=0; DISCONNECT=PASS; DATABASE=NOT_USED_BY_PUBLISHER");
    return 0;
}
catch (Exception exception)
{
    Console.WriteLine($"PUBLISHER_SESSION=FAIL; exceptionType={exception.GetType().Name}; detailSuppressed=true");
    if (client.IsConnected)
        await client.DisconnectAsync();
    return 12;
}
