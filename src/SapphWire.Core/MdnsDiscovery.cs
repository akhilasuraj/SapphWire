using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class MdnsDiscovery : IDiscoverySource
{
    private readonly ILogger<MdnsDiscovery> _logger;
    private CancellationTokenSource? _cts;

    public event Action<DiscoveryEvent>? DeviceDiscovered;

    public MdnsDiscovery(ILogger<MdnsDiscovery> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _logger.LogInformation("mDNS listener started");
        // Real implementation: Makaretu.Dns.Multicast ServiceDiscovery
        // listens for PTR/SRV/A records on 224.0.0.251:5353
        // and emits DeviceDiscovered with hostname + IP + device type from service strings
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
        _logger.LogInformation("mDNS listener stopped");
        return Task.CompletedTask;
    }

    protected void OnDeviceDiscovered(string mac, string ip, string hostname, DeviceType type)
    {
        DeviceDiscovered?.Invoke(new DiscoveryEvent(mac, ip, hostname, type));
    }
}
