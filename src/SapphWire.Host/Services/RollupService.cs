using SapphWire.Core;

namespace SapphWire.Host.Services;

public class RollupService : BackgroundService
{
    private readonly IPersistence _persistence;

    public RollupService(IPersistence persistence)
    {
        _persistence = persistence;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _persistence.RunRollupAsync(DateTimeOffset.UtcNow);

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await _persistence.RunRollupAsync(DateTimeOffset.UtcNow);
        }
    }
}
