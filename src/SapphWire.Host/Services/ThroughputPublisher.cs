using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ThroughputPublisher : BackgroundService
{
    private readonly FlowAggregator _aggregator;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly IPersistence _persistence;

    public ThroughputPublisher(
        FlowAggregator aggregator,
        IHubContext<DashboardHub> hub,
        IPersistence persistence)
    {
        _aggregator = aggregator;
        _hub = hub;
        _persistence = persistence;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var bucket = _aggregator.Tick(DateTimeOffset.UtcNow);

            try
            {
                await _persistence.WriteBucketsAsync(new[] { bucket });
            }
            catch
            {
                // Best-effort: live broadcast continues even if persistence fails
            }

            await _hub.Clients.Group("liveThroughput")
                .SendAsync("ThroughputDelta", bucket, stoppingToken);
        }
    }
}
