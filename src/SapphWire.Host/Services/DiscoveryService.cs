using SapphWire.Core;

namespace SapphWire.Host.Services;

public class DiscoveryService : BackgroundService
{
    private readonly IEnumerable<IDiscoverySource> _sources;
    private readonly DeviceTracker _tracker;
    private readonly NetworkContext _networkContext;
    private readonly ILogger<DiscoveryService> _logger;

    public DiscoveryService(
        IEnumerable<IDiscoverySource> sources,
        DeviceTracker tracker,
        NetworkContext networkContext,
        ILogger<DiscoveryService> logger)
    {
        _sources = sources;
        _tracker = tracker;
        _networkContext = networkContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        foreach (var source in _sources)
        {
            source.DeviceDiscovered += OnDeviceDiscovered;
            await source.StartAsync(stoppingToken);
        }

        // Refresh network context periodically
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            _networkContext.Refresh();
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        foreach (var source in _sources)
        {
            source.DeviceDiscovered -= OnDeviceDiscovered;
            await source.StopAsync(cancellationToken);
        }
        await base.StopAsync(cancellationToken);
    }

    private void OnDeviceDiscovered(DiscoveryEvent evt)
    {
        var networkId = _networkContext.Current?.GatewayMac ?? "unknown";
        _tracker.Upsert(evt.Mac, evt.Ip, evt.Hostname, networkId, evt.DeviceType);
    }
}
