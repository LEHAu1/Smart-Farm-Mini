using System.Text.Json;
using MQTTnet;
using MQTTnet.Protocol;

if (args.Length != 2)
{
    Console.WriteLine("Usage: harness <repo-root> <user-secrets-json>");
    return 2;
}

using var appDoc = JsonDocument.Parse(File.ReadAllText(Path.Combine(args[0], "backend/SmartFarm.WebAPI/appsettings.Development.json")));
using var secretsDoc = JsonDocument.Parse(File.ReadAllText(args[1]));
var app = appDoc.RootElement;
var secrets = secretsDoc.RootElement;

string GetConfig(string name)
{
    if (secrets.TryGetProperty("Mqtt:" + name, out var secretValue) && secretValue.ValueKind == JsonValueKind.String)
        return secretValue.GetString() ?? string.Empty;
    if (app.TryGetProperty("Mqtt", out var mqtt) && mqtt.TryGetProperty(name, out var appValue))
        return appValue.ValueKind == JsonValueKind.String ? appValue.GetString() ?? string.Empty : appValue.ToString();
    return string.Empty;
}

var host = GetConfig("Host");
var port = GetConfig("Port");
var username = GetConfig("Username");
var password = GetConfig("Password");
var enabled = GetConfig("Enabled");
var tls = GetConfig("UseTls");
var dispatch = GetConfig("CommandDispatchEnabled");
var topic = GetConfig("TelemetryTopicFilter");
var ack = GetConfig("AcknowledgementTopicFilter");
var preflightPassed = host == "w9d01192.ala.asia-southeast1.emqxsl.com"
    && port == "8883"
    && username == "smartfarm_backend"
    && password.Length > 0
    && enabled.Equals("true", StringComparison.OrdinalIgnoreCase)
    && tls.Equals("true", StringComparison.OrdinalIgnoreCase)
    && dispatch.Equals("false", StringComparison.OrdinalIgnoreCase)
    && topic == "smartfarm/test/cloud-connectivity"
    && string.IsNullOrEmpty(ack);

Console.WriteLine($"PREFLIGHT={(preflightPassed ? "PASS" : "FAIL")}; endpointOk={host == "w9d01192.ala.asia-southeast1.emqxsl.com"}; portOk={port == "8883"}; usernameOk={username == "smartfarm_backend"}; passwordPresent={password.Length > 0}; tlsEnabled={tls.Equals("true", StringComparison.OrdinalIgnoreCase)}; commandDispatchDisabled={dispatch.Equals("false", StringComparison.OrdinalIgnoreCase)}; testTopicOnly={topic == "smartfarm/test/cloud-connectivity"}; ackFilterBlank={string.IsNullOrEmpty(ack)}");
if (!preflightPassed)
    return 10;

using var client = new MqttClientFactory().CreateMqttClient();
try
{
    var options = new MqttClientOptionsBuilder()
        .WithClientId("SmartFarm-Subscription-QA-" + Guid.NewGuid().ToString("N"))
        .WithTcpServer(host, int.Parse(port))
        .WithCredentials(username, password)
        .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
        .WithTlsOptions(tlsOptions => tlsOptions.UseTls())
        .Build();

    var connect = await client.ConnectAsync(options, new CancellationTokenSource(TimeSpan.FromSeconds(25)).Token);
    Console.WriteLine($"CONNECT_RESULT={connect.ResultCode}");
    if (!client.IsConnected)
    {
        Console.WriteLine("CONNECT=FAIL");
        return 11;
    }
    Console.WriteLine("CONNECT=PASS; AUTHENTICATION=PASS");

    var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
        .WithTopicFilter(filter => filter.WithTopic(topic).WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce))
        .Build();
    var subscribe = await client.SubscribeAsync(subscribeOptions, new CancellationTokenSource(TimeSpan.FromSeconds(20)).Token);
    var codes = subscribe.Items.Select(item => item.ResultCode.ToString()).ToArray();
    Console.WriteLine("SUBACK=" + (codes.Length == 0 ? "NO_ITEMS" : string.Join(",", codes)));
    var granted = codes.Length > 0 && codes.All(code => code is "GrantedQoS0" or "GrantedQoS1");
    Console.WriteLine($"SUBSCRIPTION={(granted ? "PASS" : "FAIL")}; grantedQoS={(granted ? string.Join(",", codes) : "none")}");

    await client.DisconnectAsync();
    Console.WriteLine("DISCONNECT=PASS; PUBLISH_COUNT=0; DATABASE=NOT_USED");
    return granted ? 0 : 12;
}
catch (Exception exception)
{
    Console.WriteLine($"SESSION=FAIL; exceptionType={exception.GetType().Name}; detailSuppressed=true");
    if (client.IsConnected)
    {
        await client.DisconnectAsync();
        Console.WriteLine("DISCONNECT=PASS; PUBLISH_COUNT=0; DATABASE=NOT_USED");
    }
    return 13;
}
