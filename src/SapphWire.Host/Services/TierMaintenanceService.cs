using SapphWire.Core;

namespace SapphWire.Host.Services;

public class TierMaintenanceService : BackgroundService
{
    private readonly ITieredFlowStore _store;

    public TierMaintenanceService(ITieredFlowStore store)
    {
        _store = store;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var now = DateTimeOffset.UtcNow;
            await _store.DownsampleAsync(now);
            await _store.PruneAsync(now);
        }
    }
}
