using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class ArpDiscovery : IDiscoverySource
{
    private readonly ILogger<ArpDiscovery> _logger;
    private CancellationTokenSource? _cts;

    public event Action<DiscoveryEvent>? DeviceDiscovered;

    public ArpDiscovery(ILogger<ArpDiscovery> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = PollLoopAsync(_cts.Token);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
        return Task.CompletedTask;
    }

    private async Task PollLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                ReadArpTable();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ARP table read failed");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    public void ReadArpTable()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return;

        // GetIpNetTable2 P/Invoke — the actual interop is Windows-only
        // and requires elevation. The structure is:
        //   - Call GetIpNetTable2(AF_INET, out table)
        //   - Iterate MIB_IPNET_ROW2 entries
        //   - Extract IP + MAC for each entry
        //   - Invoke DeviceDiscovered for each
        //
        // Stubbed for non-Windows builds; real implementation uses:
        // [DllImport("iphlpapi.dll")] static extern int GetIpNetTable2(int family, out IntPtr table);
        _logger.LogDebug("ARP table poll (stub — real impl uses GetIpNetTable2)");
    }

    protected void OnDeviceDiscovered(string mac, string ip)
    {
        DeviceDiscovered?.Invoke(new DiscoveryEvent(mac, ip));
    }
}
