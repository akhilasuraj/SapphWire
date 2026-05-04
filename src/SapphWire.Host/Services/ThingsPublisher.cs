using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ThingsPublisher : BackgroundService
{
    private readonly DeviceTracker _tracker;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<ThingsPublisher> _logger;

    public ThingsPublisher(
        DeviceTracker tracker,
        IHubContext<DashboardHub> hub,
        ILogger<ThingsPublisher> logger)
    {
        _tracker = tracker;
        _hub = hub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _tracker.DeviceUpdated += OnDeviceUpdated;
        _tracker.DeviceRemoved += OnDeviceRemoved;

        // 30-second heartbeat
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var snapshot = _tracker.GetSnapshot();
            await _hub.Clients.Group("things")
                .SendAsync("ThingsHeartbeat", snapshot, stoppingToken);
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _tracker.DeviceUpdated -= OnDeviceUpdated;
        _tracker.DeviceRemoved -= OnDeviceRemoved;
        return base.StopAsync(cancellationToken);
    }

    private async void OnDeviceUpdated(DiscoveredDevice device)
    {
        try
        {
            var dto = new
            {
                device.Mac,
                device.Ip,
                device.Hostname,
                device.Vendor,
                DeviceType = device.DeviceType.ToString(),
                device.FriendlyName,
                device.Pinned,
                device.NetworkId,
                FirstSeen = device.FirstSeen.ToString("o"),
                LastSeen = device.LastSeen.ToString("o"),
                Online = device.IsOnline(TimeSpan.FromSeconds(90)),
                device.IsThisPc,
                device.IsGateway,
            };
            await _hub.Clients.Group("things").SendAsync("DeviceUpdate", dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish device update for {Mac}", device.Mac);
        }
    }

    private async void OnDeviceRemoved(string mac)
    {
        try
        {
            await _hub.Clients.Group("things").SendAsync("DeviceRemove", mac);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish device removal for {Mac}", mac);
        }
    }
}
