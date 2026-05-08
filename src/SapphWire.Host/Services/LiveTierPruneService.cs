using SapphWire.Core;

namespace SapphWire.Host.Services;

public class LiveTierPruneService : BackgroundService
{
    private readonly ITieredFlowStore _store;

    public LiveTierPruneService(ITieredFlowStore store)
    {
        _store = store;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await _store.PruneAsync(DateTimeOffset.UtcNow);
        }
    }
}
