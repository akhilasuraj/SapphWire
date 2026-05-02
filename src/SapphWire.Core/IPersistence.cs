namespace SapphWire.Core;

public interface IPersistence : IAsyncDisposable
{
    Task InitializeAsync();
    Task WriteBucketsAsync(IReadOnlyList<ThroughputBucket> buckets);
    Task<IReadOnlyList<ThroughputBucket>> GetSeriesAsync(DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize);
    Task RunRollupAsync(DateTimeOffset now);
}
