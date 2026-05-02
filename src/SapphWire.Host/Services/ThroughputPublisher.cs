using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ThroughputPublisher : BackgroundService
{
    private readonly FlowAggregator _aggregator;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<ThroughputPublisher> _logger;

    public ThroughputPublisher(
        FlowAggregator aggregator,
        IHubContext<DashboardHub> hub,
        ILogger<ThroughputPublisher> logger)
    {
        _aggregator = aggregator;
        _hub = hub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var bucket = _aggregator.Tick(DateTimeOffset.UtcNow);
            await _hub.Clients.Group("liveThroughput")
                .SendAsync("ThroughputDelta", bucket, stoppingToken);
        }
    }
}
