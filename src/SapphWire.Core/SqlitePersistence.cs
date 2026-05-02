using Microsoft.Data.Sqlite;

namespace SapphWire.Core;

public class SqlitePersistence : IPersistence
{
    private readonly SqliteConnection _connection;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public SqlitePersistence(string connectionString)
    {
        _connection = new SqliteConnection(connectionString);
    }

    public static string GetDefaultConnectionString()
    {
        var folder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SapphWire");
        Directory.CreateDirectory(folder);
        return $"Data Source={Path.Combine(folder, "sapphwire.db")}";
    }

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();

        using var pragmaCmd = _connection.CreateCommand();
        pragmaCmd.CommandText = "PRAGMA journal_mode=WAL;";
        await pragmaCmd.ExecuteNonQueryAsync();

        using var schemaCmd = _connection.CreateCommand();
        schemaCmd.CommandText = """
            CREATE TABLE IF NOT EXISTS flows_1s (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS flows_1h (
                timestamp  INTEGER NOT NULL PRIMARY KEY,
                total_up   INTEGER NOT NULL,
                total_down INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   INTEGER NOT NULL,
                app_name    TEXT    NOT NULL,
                exe_path    TEXT,
                remote_ip   TEXT,
                remote_port INTEGER,
                is_read     INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS devices (
                mac           TEXT PRIMARY KEY,
                name          TEXT,
                ip            TEXT,
                vendor        TEXT,
                last_seen     INTEGER NOT NULL,
                friendly_name TEXT,
                network_id    TEXT
            );
            """;
        await schemaCmd.ExecuteNonQueryAsync();
    }

    public async Task WriteBucketsAsync(IReadOnlyList<ThroughputBucket> buckets)
    {
        if (buckets.Count == 0) return;

        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            using var cmd = _connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = """
                INSERT OR REPLACE INTO flows_1s (timestamp, total_up, total_down)
                VALUES (@ts, @up, @down);
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

    public async Task<IReadOnlyList<ThroughputBucket>> GetSeriesAsync(
        DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize)
    {
        var table = bucketSize.TotalHours >= 1 ? "flows_1h" : "flows_1s";

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

    public async Task RunRollupAsync(DateTimeOffset now)
    {
        var cutoff = now.AddHours(-24).ToUnixTimeSeconds();

        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = """
                    INSERT INTO flows_1h (timestamp, total_up, total_down)
                    SELECT (timestamp / 3600) * 3600, SUM(total_up), SUM(total_down)
                    FROM flows_1s
                    WHERE timestamp < @cutoff
                    GROUP BY timestamp / 3600
                    ON CONFLICT(timestamp) DO UPDATE SET
                        total_up   = flows_1h.total_up   + excluded.total_up,
                        total_down = flows_1h.total_down + excluded.total_down;
                    """;
                cmd.Parameters.AddWithValue("@cutoff", cutoff);
                await cmd.ExecuteNonQueryAsync();
            }

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = "DELETE FROM flows_1s WHERE timestamp < @cutoff;";
                cmd.Parameters.AddWithValue("@cutoff", cutoff);
                await cmd.ExecuteNonQueryAsync();
            }

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
}
