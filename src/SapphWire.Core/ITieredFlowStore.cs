namespace SapphWire.Core;

public interface ITieredFlowStore : IAsyncDisposable
{
    Task InitializeAsync();
    Task WriteAsync(IReadOnlyList<ThroughputBucket> buckets);
    Task<IReadOnlyList<ThroughputBucket>> QueryAsync(DateTimeOffset from, DateTimeOffset to);
    Task PruneAsync(DateTimeOffset now);
}
