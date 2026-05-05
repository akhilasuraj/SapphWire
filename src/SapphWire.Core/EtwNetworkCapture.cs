using Microsoft.Diagnostics.Tracing;
using Microsoft.Diagnostics.Tracing.Parsers;
using Microsoft.Diagnostics.Tracing.Session;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class EtwNetworkCapture : INetworkCapture
{
    private readonly ILogger<EtwNetworkCapture> _logger;
    private CancellationTokenSource? _cts;
    private Task? _captureTask;

    public event Action<NetworkEvent>? OnEvent;

    public EtwNetworkCapture(ILogger<EtwNetworkCapture> logger)
    {
        _logger = logger;
    }

    public void Start()
    {
        _cts = new CancellationTokenSource();
        _captureTask = Task.Run(() => CaptureLoop(_cts.Token));
    }

    public void Stop()
    {
        _cts?.Cancel();
        _captureTask?.Wait(TimeSpan.FromSeconds(5));
    }

    private async Task CaptureLoop(CancellationToken ct)
    {
        var backoffMs = 1000;
        const int maxBackoffMs = 30_000;

        while (!ct.IsCancellationRequested)
        {
            TraceEventSession? session = null;
            CancellationTokenRegistration ctr = default;
            try
            {
                session = new TraceEventSession("SapphWire-NetworkCapture");
                session.EnableKernelProvider(KernelTraceEventParser.Keywords.NetworkTCPIP);

                session.Source.Kernel.TcpIpSend += data =>
                    Emit(data.TimeStamp, data.ProcessID, TrafficDirection.Up,
                        data.size, data.daddr.ToString(), data.dport, "TCP");

                session.Source.Kernel.TcpIpRecv += data =>
                    Emit(data.TimeStamp, data.ProcessID, TrafficDirection.Down,
                        data.size, data.saddr.ToString(), data.sport, "TCP");

                session.Source.Kernel.UdpIpSend += data =>
                    Emit(data.TimeStamp, data.ProcessID, TrafficDirection.Up,
                        data.size, data.daddr.ToString(), data.dport, "UDP");

                session.Source.Kernel.UdpIpRecv += data =>
                    Emit(data.TimeStamp, data.ProcessID, TrafficDirection.Down,
                        data.size, data.saddr.ToString(), data.sport, "UDP");

                ctr = ct.Register(() => session.Stop());

                _logger.LogInformation("ETW capture session started");
                backoffMs = 1000;
                session.Source.Process();
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "ETW session dropped, restarting in {BackoffMs}ms", backoffMs);
                try { await Task.Delay(backoffMs, ct); }
                catch (OperationCanceledException) { break; }
                backoffMs = Math.Min(backoffMs * 2, maxBackoffMs);
            }
            finally
            {
                ctr.Dispose();
                session?.Dispose();
            }
        }

        _logger.LogInformation("ETW capture loop stopped");
    }

    private void Emit(DateTime ts, int pid, TrafficDirection dir, int bytes,
        string remoteIp, int remotePort, string proto)
    {
        var utc = ts.Kind switch
        {
            DateTimeKind.Utc => ts,
            DateTimeKind.Local => ts.ToUniversalTime(),
            _ => DateTime.SpecifyKind(ts, DateTimeKind.Local).ToUniversalTime(),
        };
        OnEvent?.Invoke(new NetworkEvent(
            new DateTimeOffset(utc, TimeSpan.Zero),
            pid, dir, bytes, remoteIp, remotePort, proto));
    }

    public void Dispose()
    {
        Stop();
        _cts?.Dispose();
        GC.SuppressFinalize(this);
    }
}
