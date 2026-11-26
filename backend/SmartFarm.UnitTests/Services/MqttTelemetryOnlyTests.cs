using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SmartFarm.Application.Contracts.Services;
using SmartFarm.Application.DTOs.DeviceCommand;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure;
using SmartFarm.Infrastructure.Mqtt;

namespace SmartFarm.UnitTests.Services;

public sealed class MqttTelemetryOnlyTests
{
    [Fact]
    public void MqttBrokerSettings_CommandDispatchIsDisabledByDefault()
    {
        Assert.False(new MqttBrokerSettings().CommandDispatchEnabled);
    }

    [Fact]
    public void InfrastructureConfiguration_BindsEmqxTlsAndTelemetryOnlySettings()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=(localdb)\\MSSQLLocalDB;Database=NeverOpened;Trusted_Connection=True;",
                ["Mqtt:Enabled"] = "true",
                ["Mqtt:Host"] = "w9d01192.ala.asia-southeast1.emqxsl.com",
                ["Mqtt:Port"] = "8883",
                ["Mqtt:UseTls"] = "true",
                ["Mqtt:Username"] = "smartfarm_backend",
                ["Mqtt:TelemetryTopicFilter"] = "smartfarm/test/cloud-connectivity",
                ["Mqtt:AcknowledgementTopicFilter"] = "",
                ["Mqtt:CommandDispatchEnabled"] = "false"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);

        using var provider = services.BuildServiceProvider();
        var settings = provider.GetRequiredService<IOptions<MqttBrokerSettings>>().Value;

        Assert.True(settings.Enabled);
        Assert.Equal("w9d01192.ala.asia-southeast1.emqxsl.com", settings.Host);
        Assert.Equal(8883, settings.Port);
        Assert.True(settings.UseTls);
        Assert.Equal("smartfarm_backend", settings.Username);
        Assert.Equal("smartfarm/test/cloud-connectivity", settings.TelemetryTopicFilter);
        Assert.Empty(settings.AcknowledgementTopicFilter);
        Assert.False(settings.CommandDispatchEnabled);
        Assert.Null(settings.Password);
    }

    [Fact]
    public async Task ConnectAndSubscribe_RejectsMissingCredentialsBeforeNetworkConnect()
    {
        using var client = new MqttClientService(
            Options.Create(new MqttBrokerSettings
            {
                Enabled = true,
                Host = "w9d01192.ala.asia-southeast1.emqxsl.com",
                Port = 8883,
                UseTls = true,
                CommandDispatchEnabled = false
            }),
            NullLogger<MqttClientService>.Instance);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.ConnectAndSubscribeAsync((_, _, _) => Task.CompletedTask, CancellationToken.None));

        Assert.Contains("requires broker credentials", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task MqttPublisher_DeniesStartPumpWhenCommandDispatchIsDisabled()
    {
        using var client = new MqttClientService(
            Options.Create(new MqttBrokerSettings
            {
                Enabled = true,
                Host = "w9d01192.ala.asia-southeast1.emqxsl.com",
                Port = 8883,
                UseTls = true,
                CommandDispatchEnabled = false
            }),
            NullLogger<MqttClientService>.Instance);
        var publisher = new MqttPublisher(client);
        var command = new DeviceCommandDto
        {
            Id = Guid.NewGuid(),
            DeviceId = Guid.NewGuid(),
            CommandCode = "TEST-ONLY",
            Action = "START_PUMP",
            Status = CommandStatus.Pending,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(1)
        };

        var exception = await Assert.ThrowsAsync<MqttPublishNotStartedException>(() =>
            publisher.PublishCommandAsync("FARM-TEST-ONLY", command, CancellationToken.None));

        Assert.Contains("command dispatch is disabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task MqttClient_DeniesDirectCommandTopicPublishWhenDispatchIsDisabled()
    {
        using var client = new MqttClientService(
            Options.Create(new MqttBrokerSettings
            {
                Enabled = true,
                Host = "w9d01192.ala.asia-southeast1.emqxsl.com",
                Port = 8883,
                UseTls = true,
                CommandDispatchEnabled = false
            }),
            NullLogger<MqttClientService>.Instance);

        var exception = await Assert.ThrowsAsync<MqttPublishNotStartedException>(() =>
            client.PublishAsync(
                "smartfarm/device/FARM-TEST-ONLY/command",
                "test-only"u8.ToArray(),
                CancellationToken.None));

        Assert.Contains("command dispatch is disabled", exception.Message, StringComparison.Ordinal);
    }
}
