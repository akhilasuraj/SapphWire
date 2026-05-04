using System.Net;
using System.Net.NetworkInformation;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class SubnetScanner
{
    private readonly ILogger<SubnetScanner> _logger;
    private readonly NetworkContext _networkContext;

    public event Action<int>? ProgressChanged;
    public event Action? ScanComplete;

    public bool IsScanning { get; private set; }

    public SubnetScanner(ILogger<SubnetScanner> logger, NetworkContext networkContext)
    {
        _logger = logger;
        _networkContext = networkContext;
    }

    public async Task ScanAsync(CancellationToken ct = default)
    {
        if (IsScanning) return;

        var subnet = _networkContext.GetSubnet();
        if (subnet == null)
        {
            _logger.LogWarning("Cannot scan: no subnet info available");
            return;
        }

        IsScanning = true;
        ProgressChanged?.Invoke(0);

        try
        {
            var (network, prefixLength) = subnet.Value;
            var hostCount = (int)Math.Pow(2, 32 - prefixLength) - 2;
            var networkBytes = network.GetAddressBytes();
            var scanned = 0;

            var batchSize = Math.Min(64, hostCount);
            var semaphore = new SemaphoreSlim(batchSize);

            var tasks = new List<Task>();
            for (int i = 1; i <= hostCount && !ct.IsCancellationRequested; i++)
            {
                var hostBytes = (byte[])(networkBytes.Clone());
                hostBytes[3] = (byte)((networkBytes[3] + i) & 0xFF);
                hostBytes[2] = (byte)((networkBytes[2] + ((networkBytes[3] + i) >> 8)) & 0xFF);
                var target = new IPAddress(hostBytes);

                await semaphore.WaitAsync(ct);
                tasks.Add(PingHostAsync(target, semaphore, ct).ContinueWith(_ =>
                {
                    var progress = (int)(Interlocked.Increment(ref scanned) * 100.0 / hostCount);
                    ProgressChanged?.Invoke(Math.Min(progress, 100));
                }, TaskScheduler.Default));
            }

            await Task.WhenAll(tasks);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Subnet scan failed");
        }
        finally
        {
            IsScanning = false;
            ProgressChanged?.Invoke(100);
            ScanComplete?.Invoke();
        }
    }

    private static async Task PingHostAsync(IPAddress target, SemaphoreSlim semaphore, CancellationToken ct)
    {
        try
        {
            using var ping = new Ping();
            await ping.SendPingAsync(target, 1000);
        }
        catch { }
        finally
        {
            semaphore.Release();
        }
    }
}
