namespace SapphWire.Core;

public enum GroupBy { None, App, Publisher }

public interface IPersistence : IAsyncDisposable
{
    Task InitializeAsync();
    Task WriteBucketsAsync(IReadOnlyList<ThroughputBucket> buckets);
    Task WriteGroupedBucketsAsync(IReadOnlyList<GroupedThroughputBucket> buckets);
    Task<IReadOnlyList<ThroughputBucket>> GetSeriesAsync(DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize);
    Task<IReadOnlyList<GraphSeriesPoint>> GetGroupedSeriesAsync(DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize, GroupBy groupBy);
    Task WriteDetailBucketsAsync(IReadOnlyList<DetailFlowBucket> buckets);
    Task<UsageResult> GetUsageAsync(DateTimeOffset from, DateTimeOffset to, string groupBy, UsageFilters filters);
    Task RunRollupAsync(DateTimeOffset now);
}
