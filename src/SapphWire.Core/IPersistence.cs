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
    Task SaveBlockedParentAsync(string appId);
    Task RemoveBlockedParentAsync(string appId);
    Task<IReadOnlyList<string>> GetBlockedParentsAsync();

    Task<long> WriteAlertAsync(AlertRecord alert);
    Task<IReadOnlyList<AlertRecord>> GetAlertsAsync();
    Task MarkAlertReadAsync(long alertId);
    Task MarkAllAlertsReadAsync();
    Task DeleteAlertAsync(long alertId);
    Task<IReadOnlyList<string>> GetKnownAlertAppsAsync();

    Task ClearDataAsync();
    Task<long> GetDatabaseSizeBytesAsync();
    string GetDatabasePath();
}
