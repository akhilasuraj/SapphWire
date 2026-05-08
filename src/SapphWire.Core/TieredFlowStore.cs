using Microsoft.Data.Sqlite;

namespace SapphWire.Core;

public class TieredFlowStore : ITieredFlowStore
{
    private readonly SqliteConnection _connection;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    internal static readonly TimeSpan LiveRetention = TimeSpan.FromMinutes(10);
    internal static readonly TimeSpan ShortRetention = TimeSpan.FromHours(24);
    internal static readonly TimeSpan MediumRetention = TimeSpan.FromDays(30);
    internal static readonly TimeSpan LongRetention = TimeSpan.FromDays(365);

    internal const int ShortBucketSeconds = 60;
    internal const int MediumBucketSeconds = 600;
    internal const int LongBucketSeconds = 3600;

    public TieredFlowStore(string connectionString)
    {
        _connection = new SqliteConnection(connectionString);
    }

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();

        using var pragmaCmd = _connection.CreateCommand();
        pragmaCmd.CommandText = "PRAGMA journal_mode=WAL;";
        await pragmaCmd.ExecuteNonQueryAsync();

        using var schemaCmd = _connection.CreateCommand();
        schemaCmd.CommandText = """
            CREATE TABLE IF NOT EXISTS flows_live (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS flows_short (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS flows_medium (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS flows_long (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );
            """;
        await schemaCmd.ExecuteNonQueryAsync();
    }

    public async Task WriteAsync(IReadOnlyList<ThroughputBucket> buckets)
    {
        if (buckets.Count == 0) return;

        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();
            using var cmd = _connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = """
                INSERT INTO flows_live (timestamp, total_up, total_down)
                VALUES (@ts, @up, @down)
                ON CONFLICT(timestamp) DO UPDATE SET
                    total_up   = excluded.total_up,
                    total_down = excluded.total_down;
                """;

            var tsParam = cmd.Parameters.Add("@ts", SqliteType.Integer);
            var upParam = cmd.Parameters.Add("@up", SqliteType.Integer);
            var downParam = cmd.Parameters.Add("@down", SqliteType.Integer);

            foreach (var bucket in buckets)
            {
                tsParam.Value = bucket.Timestamp.ToUnixTimeSeconds();
                upParam.Value = bucket.TotalUp;
                downParam.Value = bucket.TotalDown;
                await cmd.ExecuteNonQueryAsync();
            }

            transaction.Commit();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<ThroughputBucket>> QueryAsync(
        DateTimeOffset from, DateTimeOffset to)
    {
        var table = GetTierTable(to - from);

        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = $"""
                SELECT timestamp, total_up, total_down
                FROM {table}
                WHERE timestamp >= @from AND timestamp <= @to
                ORDER BY timestamp ASC;
                """;
            cmd.Parameters.AddWithValue("@from", from.ToUnixTimeSeconds());
            cmd.Parameters.AddWithValue("@to", to.ToUnixTimeSeconds());

            var results = new List<ThroughputBucket>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new ThroughputBucket(
                    DateTimeOffset.FromUnixTimeSeconds(reader.GetInt64(0)),
                    reader.GetInt64(1),
                    reader.GetInt64(2)));
            }

            return results;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task DownsampleAsync(DateTimeOffset now)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            await DownsampleTier(transaction,
                "flows_live", "flows_short", ShortBucketSeconds);
            await DownsampleTier(transaction,
                "flows_short", "flows_medium", MediumBucketSeconds);
            await DownsampleTier(transaction,
                "flows_medium", "flows_long", LongBucketSeconds);

            transaction.Commit();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task PruneAsync(DateTimeOffset now)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            await PruneTier(transaction, "flows_live",
                now.Add(-LiveRetention).ToUnixTimeSeconds());
            await PruneTier(transaction, "flows_short",
                now.Add(-ShortRetention).ToUnixTimeSeconds());
            await PruneTier(transaction, "flows_medium",
                now.Add(-MediumRetention).ToUnixTimeSeconds());
            await PruneTier(transaction, "flows_long",
                now.Add(-LongRetention).ToUnixTimeSeconds());

            transaction.Commit();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        _semaphore.Dispose();
        await _connection.DisposeAsync();
    }

    private static string GetTierTable(TimeSpan range)
    {
        var seconds = range.TotalSeconds;
        if (seconds <= LiveRetention.TotalSeconds) return "flows_live";
        if (seconds <= ShortRetention.TotalSeconds) return "flows_short";
        if (seconds <= TimeSpan.FromDays(7).TotalSeconds) return "flows_medium";
        return "flows_long";
    }

    private async Task DownsampleTier(
        SqliteTransaction transaction, string source, string target, int bucketSeconds)
    {
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = $"""
            INSERT INTO {target} (timestamp, total_up, total_down)
            SELECT (timestamp / @bucket) * @bucket, SUM(total_up), SUM(total_down)
            FROM {source}
            GROUP BY (timestamp / @bucket) * @bucket
            ON CONFLICT(timestamp) DO UPDATE SET
                total_up   = excluded.total_up,
                total_down = excluded.total_down;
            """;
        cmd.Parameters.AddWithValue("@bucket", bucketSeconds);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task PruneTier(
        SqliteTransaction transaction, string table, long cutoff)
    {
        using var cmd = _connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = $"DELETE FROM {table} WHERE timestamp < @cutoff;";
        cmd.Parameters.AddWithValue("@cutoff", cutoff);
        await cmd.ExecuteNonQueryAsync();
    }
}
