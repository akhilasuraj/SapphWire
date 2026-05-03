using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ThroughputPublisher : BackgroundService
{
    private readonly FlowAggregator _aggregator;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly IPersistence _persistence;
    private readonly IProcessResolver _processResolver;

    public ThroughputPublisher(
        FlowAggregator aggregator,
        IHubContext<DashboardHub> hub,
        IPersistence persistence,
        IProcessResolver processResolver)
    {
        _aggregator = aggregator;
        _hub = hub;
        _persistence = persistence;
        _processResolver = processResolver;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var bucket = _aggregator.Tick(DateTimeOffset.UtcNow);
            var perPid = _aggregator.DrainPerPid();

            try
            {
                await _persistence.WriteBucketsAsync(new[] { bucket });

                if (perPid.Count > 0)
                {
                    var grouped = perPid.Select(kv =>
                    {
                        var info = _processResolver.Resolve(kv.Key);
                        return new GroupedThroughputBucket(
                            bucket.Timestamp, info.ExeName, info.Publisher,
                            kv.Value.Up, kv.Value.Down);
                    }).ToList();

                    await _persistence.WriteGroupedBucketsAsync(grouped);
                }
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
