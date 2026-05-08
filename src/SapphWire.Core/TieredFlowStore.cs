using Microsoft.Data.Sqlite;

namespace SapphWire.Core;

public class TieredFlowStore : ITieredFlowStore
{
    private readonly SqliteConnection _connection;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    internal static readonly TimeSpan LiveRetention = TimeSpan.FromMinutes(10);

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
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = """
                SELECT timestamp, total_up, total_down
                FROM flows_live
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

    public async Task PruneAsync(DateTimeOffset now)
    {
        var cutoff = now.Add(-LiveRetention).ToUnixTimeSeconds();

        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "DELETE FROM flows_live WHERE timestamp < @cutoff;";
            cmd.Parameters.AddWithValue("@cutoff", cutoff);
            await cmd.ExecuteNonQueryAsync();
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
}
