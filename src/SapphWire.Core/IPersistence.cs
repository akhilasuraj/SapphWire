namespace SapphWire.Core;

public enum GroupBy { None, App, Publisher }

public interface IPersistence : IAsyncDisposable
{
    Task InitializeAsync();
    Task WriteBucketsAsync(IReadOnlyList<ThroughputBucket> buckets);
    Task WriteGroupedBucketsAsync(IReadOnlyList<GroupedThroughputBucket> buckets);
    Task<IReadOnlyList<ThroughputBucket>> GetSeriesAsync(DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize);
    Task<IReadOnlyList<GraphSeriesPoint>> GetGroupedSeriesAsync(DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize, GroupBy groupBy);
    Task RunRollupAsync(DateTimeOffset now);
    Task SaveBlockedParentAsync(string appId);
    Task RemoveBlockedParentAsync(string appId);
    Task<IReadOnlyList<string>> GetBlockedParentsAsync();
}
