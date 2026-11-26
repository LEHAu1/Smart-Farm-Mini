using System.Text.Json;
using MQTTnet;
using MQTTnet.Protocol;

static string ReadSetting(JsonElement root, JsonElement secrets, string name)
{
    if (secrets.ValueKind == JsonValueKind.Object && secrets.TryGetProperty("Mqtt:" + name, out var flat) && flat.ValueKind == JsonValueKind.String) return flat.GetString() ?? "";
    if (secrets.ValueKind == JsonValueKind.Object && secrets.TryGetProperty("Mqtt", out var nested) && nested.ValueKind == JsonValueKind.Object && nested.TryGetProperty(name, out var nestedValue)) return nestedValue.GetString() ?? "";
    return root.TryGetProperty("Mqtt", out var section) && section.TryGetProperty(name, out var value) ? value.ToString() : "";
}
var rootPath = args[0];
var secretPath = args[1];
using var app = JsonDocument.Parse(File.ReadAllText(Path.Combine(rootPath, "backend/SmartFarm.WebAPI/appsettings.Development.json")));
using var secrets = JsonDocument.Parse(File.ReadAllText(secretPath));
var a=app.RootElement; var s=secrets.RootElement;
var host=ReadSetting(a,s,"Host"); var port=ReadSetting(a,s,"Port"); var tls=ReadSetting(a,s,"UseTls"); var user=ReadSetting(a,s,"Username"); var password=ReadSetting(a,s,"Password");
var enabled=ReadSetting(a,s,"Enabled"); var dispatch=ReadSetting(a,s,"CommandDispatchEnabled"); var topic=ReadSetting(a,s,"TelemetryTopicFilter"); var ack=ReadSetting(a,s,"AcknowledgementTopicFilter");
var preflight=host=="w9d01192.ala.asia-southeast1.emqxsl.com" && port=="8883" && tls.Equals("true",StringComparison.OrdinalIgnoreCase) && user=="smartfarm_backend" && enabled.Equals("true",StringComparison.OrdinalIgnoreCase) && dispatch.Equals("false",StringComparison.OrdinalIgnoreCase) && topic=="smartfarm/test/cloud-connectivity" && string.IsNullOrEmpty(ack) && !string.IsNullOrWhiteSpace(password);
Console.WriteLine($"PREFLIGHT={(preflight?"PASS":"FAIL")} hostOk={host=="w9d01192.ala.asia-southeast1.emqxsl.com"} portOk={port=="8883"} tls={tls} usernameOk={user=="smartfarm_backend"} enabled={enabled} commandDispatchEnabled={dispatch} topicOk={topic=="smartfarm/test/cloud-connectivity"} ackBlank={string.IsNullOrEmpty(ack)} passwordPresent={!string.IsNullOrWhiteSpace(password)}");
if (!preflight) return 2;
using var client=new MqttClientFactory().CreateMqttClient();
try
{
    var opts=new MqttClientOptionsBuilder().WithClientId("SmartFarm-Subscription-QA-"+Guid.NewGuid().ToString("N")).WithTcpServer(host,int.Parse(port)).WithCredentials(user,password).WithKeepAlivePeriod(TimeSpan.FromSeconds(30)).WithTlsOptions(o=>o.UseTls()).Build();
    var conn=await client.ConnectAsync(opts,new CancellationTokenSource(TimeSpan.FromSeconds(25)).Token);
    Console.WriteLine($"MQTT_CONNECT_RESULT={conn.ResultCode}");
    if (!client.IsConnected) { Console.WriteLine("CONNECT=FAIL"); return 3; }
    var sub=await client.SubscribeAsync(new MqttClientSubscribeOptionsBuilder().WithTopicFilter(f=>f.WithTopic(topic).WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)).Build(),new CancellationTokenSource(TimeSpan.FromSeconds(20)).Token);
    foreach (var item in sub.Items) Console.WriteLine($"SUBACK={item.ResultCode}; Topic={topic}");
    if (sub.Items.Count==0) Console.WriteLine("SUBACK=NO_ITEMS");
    var ok=sub.Items.Count>0 && sub.Items.All(x=>x.ResultCode.ToString()=="GrantedQoS0" || x.ResultCode.ToString()=="GrantedQoS1");
    Console.WriteLine($"SUBSCRIPTION={(ok?"PASS":"FAIL")}; GrantedQoS={(ok?string.Join(",",sub.Items.Select(x=>x.ResultCode.ToString())):"none")}");
    await client.DisconnectAsync();
    Console.WriteLine("DISCONNECT=PASS; PUBLISH_COUNT=0; DATABASE=NOT_USED; WEBAPI=NOT_STARTED; HARDWARE=NOT_TOUCHED");
    return ok?0:4;
}
catch(Exception ex)
{
    Console.WriteLine($"MQTT_SESSION=FAIL; ExceptionType={ex.GetType().Name}; Details=SUPPRESSED");
    if(client.IsConnected) { await client.DisconnectAsync(); Console.WriteLine("DISCONNECT=PASS"); }
    return 5;
}

