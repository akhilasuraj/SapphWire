using SapphWire.Core;

namespace SapphWire.Host.Services;

public class CaptureHostedService : IHostedService
{
    private readonly INetworkCapture _capture;

    public CaptureHostedService(INetworkCapture capture, FlowAggregator aggregator)
    {
        _capture = capture;
        _capture.OnEvent += aggregator.Ingest;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _capture.Start();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _capture.Stop();
        return Task.CompletedTask;
    }
}
