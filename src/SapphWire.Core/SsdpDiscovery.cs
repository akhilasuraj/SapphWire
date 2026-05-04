using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class SsdpDiscovery : IDiscoverySource
{
    private readonly ILogger<SsdpDiscovery> _logger;
    private CancellationTokenSource? _cts;

    public event Action<DiscoveryEvent>? DeviceDiscovered;

    public SsdpDiscovery(ILogger<SsdpDiscovery> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _logger.LogInformation("SSDP listener started");
        // Real implementation: Rssdp SsdpDeviceLocator
        // listens for NOTIFY + M-SEARCH responses on 239.255.255.250:1900
        // parses deviceType from UPnP XML to map to DeviceType enum
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
        _logger.LogInformation("SSDP listener stopped");
        return Task.CompletedTask;
    }

    protected void OnDeviceDiscovered(string mac, string ip, string hostname, DeviceType type)
    {
        DeviceDiscovered?.Invoke(new DiscoveryEvent(mac, ip, hostname, type));
    }
}
