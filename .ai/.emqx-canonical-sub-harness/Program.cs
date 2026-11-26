using MQTTnet;
using MQTTnet.Protocol;

const string expectedHost = "w9d01192.ala.asia-southeast1.emqxsl.com";
const int expectedPort = 8883;
const string expectedUsername = "smartfarm_backend";
const string telemetryTopic = "smartfarm/device/FARM-ESP32-001/telemetry";

var host = Environment.GetEnvironmentVariable("Mqtt__Host");
var portText = Environment.GetEnvironmentVariable("Mqtt__Port");
var username = Environment.GetEnvironmentVariable("Mqtt__Username");
var password = Environment.GetEnvironmentVariable("Mqtt__Password");
var tls = string.Equals(Environment.GetEnvironmentVariable("Mqtt__UseTls"), "true", StringComparison.OrdinalIgnoreCase);
var dispatchDisabled = string.Equals(Environment.GetEnvironmentVariable("Mqtt__CommandDispatchEnabled"), "false", StringComparison.OrdinalIgnoreCase);

if (host != expectedHost || !int.TryParse(portText, out var port) || port != expectedPort ||
    username != expectedUsername || !tls || !dispatchDisabled || string.IsNullOrWhiteSpace(password))
{
    Console.WriteLine($"PREFLIGHT=FAIL; endpointOk={host == expectedHost}; portOk={portText == expectedPort.ToString()}; tls={tls}; usernameOk={username == expectedUsername}; passwordPresent={!string.IsNullOrWhiteSpace(password)}; commandDispatchDisabled={dispatchDisabled}");
    return 2;
}

Console.WriteLine("PREFLIGHT=PASS; endpoint/TLS/username verified; dedicated password present; command dispatch disabled.");
Console.WriteLine($"TARGET_SUBSCRIPTION={telemetryTopic}");

using var client = new MqttClientFactory().CreateMqttClient();
try
{
    var options = new MqttClientOptionsBuilder()
        .WithClientId("FarmE2E-ConnectProbe-" + Guid.NewGuid().ToString("N"))
        .WithTcpServer(host, port)
        .WithCredentials(username, password)
        .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
        .WithTlsOptions(tlsOptions => tlsOptions.UseTls())
        .Build();

    var connectResult = await client.ConnectAsync(options, new CancellationTokenSource(TimeSpan.FromSeconds(25)).Token);
    Console.WriteLine($"CONNACK={connectResult.ResultCode}");
    if (!client.IsConnected)
        return 3;

    var subscribeResult = await client.SubscribeAsync(
        new MqttClientSubscribeOptionsBuilder()
            .WithTopicFilter(filter => filter
                .WithTopic(telemetryTopic)
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce))
            .Build(),
        new CancellationTokenSource(TimeSpan.FromSeconds(20)).Token);

    foreach (var item in subscribeResult.Items)
        Console.WriteLine($"SUBACK topicExact={item.TopicFilter.Topic == telemetryTopic}; result={item.ResultCode}");

    await client.DisconnectAsync();
    Console.WriteLine("RESULT=COMPLETE; PUBLISH_COUNT=0; DB=NOT_USED; WEBAPI=NOT_STARTED; HARDWARE=NOT_TOUCHED");
    return subscribeResult.Items.Any(item =>
        item.TopicFilter.Topic == telemetryTopic && item.ResultCode is
            MqttClientSubscribeResultCode.GrantedQoS0 or MqttClientSubscribeResultCode.GrantedQoS1) ? 0 : 4;
}
catch (Exception exception)
{
    var reason = exception.GetType().GetProperties()
        .Where(property => property.Name is "ResultCode" or "ReasonCode" or "ReturnCode")
        .Select(property =>
        {
            try { return property.GetValue(exception)?.ToString(); }
            catch { return null; }
        })
        .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    Console.WriteLine($"MQTT=FAIL; exceptionType={exception.GetType().Name}; CONNACK_REASON={reason ?? "Unavailable"}; details=Suppressed");
    if (client.IsConnected)
        await client.DisconnectAsync();
    return 5;
}
