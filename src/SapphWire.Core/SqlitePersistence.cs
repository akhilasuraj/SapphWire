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

            CREATE TABLE IF NOT EXISTS flows_1s_by_app (
                timestamp  INTEGER NOT NULL,
                app_name   TEXT NOT NULL,
                publisher  TEXT NOT NULL DEFAULT '',
                bytes_up   INTEGER NOT NULL,
                bytes_down INTEGER NOT NULL,
                PRIMARY KEY (timestamp, app_name)
            );

            CREATE TABLE IF NOT EXISTS flows_1h_by_app (
                timestamp  INTEGER NOT NULL,
                app_name   TEXT NOT NULL,
                publisher  TEXT NOT NULL DEFAULT '',
                bytes_up   INTEGER NOT NULL,
                bytes_down INTEGER NOT NULL,
                PRIMARY KEY (timestamp, app_name)
            );

            CREATE TABLE IF NOT EXISTS flows_1s_detail (
                timestamp    INTEGER NOT NULL,
                app_name     TEXT NOT NULL,
                publisher    TEXT NOT NULL DEFAULT '',
                remote_host  TEXT NOT NULL,
                remote_port  INTEGER NOT NULL,
                bytes_up     INTEGER NOT NULL,
                bytes_down   INTEGER NOT NULL,
                PRIMARY KEY (timestamp, app_name, remote_host, remote_port)
            );

            CREATE TABLE IF NOT EXISTS flows_1h_detail (
                timestamp    INTEGER NOT NULL,
                app_name     TEXT NOT NULL,
                publisher    TEXT NOT NULL DEFAULT '',
                remote_host  TEXT NOT NULL,
                remote_port  INTEGER NOT NULL,
                bytes_up     INTEGER NOT NULL,
                bytes_down   INTEGER NOT NULL,
                PRIMARY KEY (timestamp, app_name, remote_host, remote_port)
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

            CREATE TABLE IF NOT EXISTS blocked_parents (
                app_id TEXT PRIMARY KEY
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

    public async Task WriteGroupedBucketsAsync(IReadOnlyList<GroupedThroughputBucket> buckets)
    {
        if (buckets.Count == 0) return;

        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            using var cmd = _connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = """
                INSERT INTO flows_1s_by_app (timestamp, app_name, publisher, bytes_up, bytes_down)
                VALUES (@ts, @app, @pub, @up, @down)
                ON CONFLICT(timestamp, app_name) DO UPDATE SET
                    bytes_up   = flows_1s_by_app.bytes_up   + excluded.bytes_up,
                    bytes_down = flows_1s_by_app.bytes_down + excluded.bytes_down;
                """;

            var tsParam = cmd.Parameters.Add("@ts", SqliteType.Integer);
            var appParam = cmd.Parameters.Add("@app", SqliteType.Text);
            var pubParam = cmd.Parameters.Add("@pub", SqliteType.Text);
            var upParam = cmd.Parameters.Add("@up", SqliteType.Integer);
            var downParam = cmd.Parameters.Add("@down", SqliteType.Integer);

            foreach (var bucket in buckets)
            {
                tsParam.Value = bucket.Timestamp.ToUnixTimeSeconds();
                appParam.Value = bucket.AppName;
                pubParam.Value = bucket.Publisher;
                upParam.Value = bucket.BytesUp;
                downParam.Value = bucket.BytesDown;
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

    public async Task<IReadOnlyList<GraphSeriesPoint>> GetGroupedSeriesAsync(
        DateTimeOffset from, DateTimeOffset to, TimeSpan bucketSize, GroupBy groupBy)
    {
        if (groupBy == GroupBy.None)
        {
            var series = await GetSeriesAsync(from, to, bucketSize);
            return series.Select(b => new GraphSeriesPoint(
                b.Timestamp.ToString("o"),
                new Dictionary<string, long> { ["Total"] = b.TotalUp + b.TotalDown }
            )).ToList();
        }

        var sourceTable = bucketSize.TotalHours >= 1 ? "flows_1h_by_app" : "flows_1s_by_app";
        var groupColumn = groupBy == GroupBy.App ? "app_name" : "publisher";
        var bucketExpr = bucketSize.TotalSeconds >= 60
            ? $"(timestamp / {(long)bucketSize.TotalSeconds}) * {(long)bucketSize.TotalSeconds}"
            : "timestamp";

        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = $"""
                SELECT {bucketExpr} AS ts, {groupColumn} AS grp,
                       SUM(bytes_up + bytes_down) AS total
                FROM {sourceTable}
                WHERE timestamp >= @from AND timestamp <= @to
                GROUP BY ts, grp
                ORDER BY ts ASC;
                """;
            cmd.Parameters.AddWithValue("@from", from.ToUnixTimeSeconds());
            cmd.Parameters.AddWithValue("@to", to.ToUnixTimeSeconds());

            var rawData = new Dictionary<long, Dictionary<string, long>>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var ts = reader.GetInt64(0);
                var grp = reader.GetString(1);
                var total = reader.GetInt64(2);

                if (!rawData.TryGetValue(ts, out var bucket))
                {
                    bucket = new Dictionary<string, long>();
                    rawData[ts] = bucket;
                }
                bucket[grp] = total;
            }

            var allGroups = rawData.Values
                .SelectMany(d => d.Keys)
                .Distinct()
                .ToList();

            var totalPerGroup = allGroups
                .ToDictionary(g => g, g => rawData.Values.Sum(d => d.GetValueOrDefault(g)));

            var top5 = totalPerGroup
                .OrderByDescending(kv => kv.Value)
                .Take(5)
                .Select(kv => kv.Key)
                .ToHashSet();

            return rawData
                .OrderBy(kv => kv.Key)
                .Select(kv =>
                {
                    var values = new Dictionary<string, long>();
                    long other = 0;
                    foreach (var (grp, total) in kv.Value)
                    {
                        if (top5.Contains(grp))
                            values[grp] = total;
                        else
                            other += total;
                    }
                    if (other > 0)
                        values["Other"] = other;

                    return new GraphSeriesPoint(
                        DateTimeOffset.FromUnixTimeSeconds(kv.Key).ToString("o"),
                        values);
                })
                .ToList();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task WriteDetailBucketsAsync(IReadOnlyList<DetailFlowBucket> buckets)
    {
        if (buckets.Count == 0) return;

        await _semaphore.WaitAsync();
        try
        {
            using var transaction = _connection.BeginTransaction();

            using var cmd = _connection.CreateCommand();
            cmd.Transaction = transaction;
            cmd.CommandText = """
                INSERT INTO flows_1s_detail (timestamp, app_name, publisher, remote_host, remote_port, bytes_up, bytes_down)
                VALUES (@ts, @app, @pub, @host, @port, @up, @down)
                ON CONFLICT(timestamp, app_name, remote_host, remote_port) DO UPDATE SET
                    bytes_up   = flows_1s_detail.bytes_up   + excluded.bytes_up,
                    bytes_down = flows_1s_detail.bytes_down + excluded.bytes_down;
                """;

            var tsParam = cmd.Parameters.Add("@ts", SqliteType.Integer);
            var appParam = cmd.Parameters.Add("@app", SqliteType.Text);
            var pubParam = cmd.Parameters.Add("@pub", SqliteType.Text);
            var hostParam = cmd.Parameters.Add("@host", SqliteType.Text);
            var portParam = cmd.Parameters.Add("@port", SqliteType.Integer);
            var upParam = cmd.Parameters.Add("@up", SqliteType.Integer);
            var downParam = cmd.Parameters.Add("@down", SqliteType.Integer);

            foreach (var bucket in buckets)
            {
                tsParam.Value = bucket.Timestamp.ToUnixTimeSeconds();
                appParam.Value = bucket.AppName;
                pubParam.Value = bucket.Publisher;
                hostParam.Value = bucket.RemoteHost;
                portParam.Value = bucket.RemotePort;
                upParam.Value = bucket.BytesUp;
                downParam.Value = bucket.BytesDown;
                await cmd.ExecuteNonQueryAsync();
            }

            transaction.Commit();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<UsageResult> GetUsageAsync(
        DateTimeOffset from, DateTimeOffset to, string groupBy, UsageFilters filters)
    {
        var fromUnix = from.ToUnixTimeSeconds();
        var toUnix = to.ToUnixTimeSeconds();
        var rangeSec = toUnix - fromUnix;
        var table = rangeSec > 86400 ? "flows_1h_detail" : "flows_1s_detail";

        await _semaphore.WaitAsync();
        try
        {
            var leftColumn = groupBy switch
            {
                "App" => "app_name",
                "Publisher" => "publisher",
                "Protocol" => "remote_port",
                _ => "app_name",
            };

            var whereFilters = new List<string> { "timestamp >= @from", "timestamp <= @to" };
            var parameters = new Dictionary<string, object>
            {
                ["@from"] = fromUnix,
                ["@to"] = toUnix,
            };

            if (filters.Left.Count > 0)
            {
                var placeholders = new List<string>();
                for (var i = 0; i < filters.Left.Count; i++)
                {
                    var p = $"@fl{i}";
                    placeholders.Add(p);
                    parameters[p] = filters.Left[i];
                }
                whereFilters.Add($"{leftColumn} IN ({string.Join(", ", placeholders)})");
            }

            if (filters.Middle.Count > 0)
            {
                var placeholders = new List<string>();
                for (var i = 0; i < filters.Middle.Count; i++)
                {
                    var p = $"@fm{i}";
                    placeholders.Add(p);
                    parameters[p] = filters.Middle[i];
                }
                whereFilters.Add($"remote_host IN ({string.Join(", ", placeholders)})");
            }

            if (filters.Right.Count > 0)
            {
                var placeholders = new List<string>();
                for (var i = 0; i < filters.Right.Count; i++)
                {
                    var p = $"@fr{i}";
                    placeholders.Add(p);
                    parameters[p] = int.TryParse(filters.Right[i], out var port) ? port : -1;
                }
                whereFilters.Add($"remote_port IN ({string.Join(", ", placeholders)})");
            }

            var whereClause = string.Join(" AND ", whereFilters);

            var left = await QueryGroupedUsage(table, leftColumn, whereClause, parameters, groupBy == "Protocol");
            var middle = await QueryGroupedUsage(table, "remote_host", whereClause, parameters, false);
            var right = await QueryGroupedUsage(table, "remote_port", whereClause, parameters, true);

            var (totalUp, totalDown) = await QueryTotals(table, whereClause, parameters);

            var sparkline = await QuerySparkline(table, whereClause, parameters, rangeSec);

            return new UsageResult(left, middle, right, totalUp, totalDown, sparkline);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task<IReadOnlyList<UsageRow>> QueryGroupedUsage(
        string table, string groupColumn, string whereClause,
        Dictionary<string, object> parameters, bool mapPort)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = $"""
            SELECT {groupColumn}, SUM(bytes_up), SUM(bytes_down)
            FROM {table}
            WHERE {whereClause}
            GROUP BY {groupColumn}
            ORDER BY SUM(bytes_up + bytes_down) DESC
            LIMIT 50;
            """;

        foreach (var (key, value) in parameters)
            cmd.Parameters.AddWithValue(key, value);

        var results = new List<UsageRow>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var name = mapPort
                ? PortProtocol.Resolve(reader.GetInt32(0))
                : reader.GetString(0);
            var up = reader.GetInt64(1);
            var down = reader.GetInt64(2);
            results.Add(new UsageRow(name, up, down));
        }

        if (mapPort)
        {
            results = results
                .GroupBy(r => r.Name)
                .Select(g => new UsageRow(g.Key, g.Sum(r => r.BytesUp), g.Sum(r => r.BytesDown)))
                .OrderByDescending(r => r.BytesUp + r.BytesDown)
                .ToList();
        }

        return results;
    }

    private async Task<(long Up, long Down)> QueryTotals(
        string table, string whereClause, Dictionary<string, object> parameters)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = $"""
            SELECT COALESCE(SUM(bytes_up), 0), COALESCE(SUM(bytes_down), 0)
            FROM {table}
            WHERE {whereClause};
            """;

        foreach (var (key, value) in parameters)
            cmd.Parameters.AddWithValue(key, value);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            return (reader.GetInt64(0), reader.GetInt64(1));
        return (0, 0);
    }

    private async Task<IReadOnlyList<SparklinePoint>> QuerySparkline(
        string table, string whereClause, Dictionary<string, object> parameters,
        long rangeSec)
    {
        var bucketSec = rangeSec switch
        {
            <= 86400 => 300,
            <= 604800 => 3600,
            _ => 86400,
        };

        using var cmd = _connection.CreateCommand();
        cmd.CommandText = $"""
            SELECT (timestamp / {bucketSec}) * {bucketSec} AS ts,
                   SUM(bytes_up + bytes_down) AS total
            FROM {table}
            WHERE {whereClause}
            GROUP BY ts
            ORDER BY ts ASC;
            """;

        foreach (var (key, value) in parameters)
            cmd.Parameters.AddWithValue(key, value);

        var results = new List<SparklinePoint>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new SparklinePoint(
                DateTimeOffset.FromUnixTimeSeconds(reader.GetInt64(0)).ToString("o"),
                reader.GetInt64(1)));
        }
        return results;
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

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = """
                    INSERT INTO flows_1h_by_app (timestamp, app_name, publisher, bytes_up, bytes_down)
                    SELECT (timestamp / 3600) * 3600, app_name, publisher,
                           SUM(bytes_up), SUM(bytes_down)
                    FROM flows_1s_by_app
                    WHERE timestamp < @cutoff
                    GROUP BY timestamp / 3600, app_name
                    ON CONFLICT(timestamp, app_name) DO UPDATE SET
                        bytes_up   = flows_1h_by_app.bytes_up   + excluded.bytes_up,
                        bytes_down = flows_1h_by_app.bytes_down + excluded.bytes_down;
                    """;
                cmd.Parameters.AddWithValue("@cutoff", cutoff);
                await cmd.ExecuteNonQueryAsync();
            }

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = "DELETE FROM flows_1s_by_app WHERE timestamp < @cutoff;";
                cmd.Parameters.AddWithValue("@cutoff", cutoff);
                await cmd.ExecuteNonQueryAsync();
            }

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = """
                    INSERT INTO flows_1h_detail (timestamp, app_name, publisher, remote_host, remote_port, bytes_up, bytes_down)
                    SELECT (timestamp / 3600) * 3600, app_name, publisher, remote_host, remote_port,
                           SUM(bytes_up), SUM(bytes_down)
                    FROM flows_1s_detail
                    WHERE timestamp < @cutoff
                    GROUP BY timestamp / 3600, app_name, remote_host, remote_port
                    ON CONFLICT(timestamp, app_name, remote_host, remote_port) DO UPDATE SET
                        bytes_up   = flows_1h_detail.bytes_up   + excluded.bytes_up,
                        bytes_down = flows_1h_detail.bytes_down + excluded.bytes_down;
                    """;
                cmd.Parameters.AddWithValue("@cutoff", cutoff);
                await cmd.ExecuteNonQueryAsync();
            }

            using (var cmd = _connection.CreateCommand())
            {
                cmd.Transaction = transaction;
                cmd.CommandText = "DELETE FROM flows_1s_detail WHERE timestamp < @cutoff;";
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

    public async Task SaveBlockedParentAsync(string appId)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "INSERT OR IGNORE INTO blocked_parents (app_id) VALUES (@id);";
            cmd.Parameters.AddWithValue("@id", appId);
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task RemoveBlockedParentAsync(string appId)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "DELETE FROM blocked_parents WHERE app_id = @id;";
            cmd.Parameters.AddWithValue("@id", appId);
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<string>> GetBlockedParentsAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT app_id FROM blocked_parents;";
            var results = new List<string>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(reader.GetString(0));
            return results;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<long> WriteAlertAsync(AlertRecord alert)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = """
                INSERT INTO alerts (timestamp, app_name, exe_path, remote_ip, remote_port, is_read)
                VALUES (@ts, @app, @exe, @ip, @port, 0);
                SELECT last_insert_rowid();
                """;
            cmd.Parameters.AddWithValue("@ts", alert.Timestamp.ToUnixTimeMilliseconds());
            cmd.Parameters.AddWithValue("@app", alert.AppName);
            cmd.Parameters.AddWithValue("@exe", (object?)alert.ExePath ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ip", (object?)alert.RemoteIp ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@port", (object?)alert.RemotePort ?? DBNull.Value);

            var result = await cmd.ExecuteScalarAsync();
            return (long)result!;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<AlertRecord>> GetAlertsAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = """
                SELECT id, timestamp, app_name, exe_path, remote_ip, remote_port, is_read
                FROM alerts
                ORDER BY timestamp DESC;
                """;

            var results = new List<AlertRecord>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new AlertRecord(
                    Id: reader.GetInt64(0),
                    Timestamp: DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(1)),
                    AppName: reader.GetString(2),
                    ExePath: reader.IsDBNull(3) ? null : reader.GetString(3),
                    RemoteIp: reader.IsDBNull(4) ? null : reader.GetString(4),
                    RemotePort: reader.IsDBNull(5) ? null : reader.GetInt32(5),
                    IsRead: reader.GetInt64(6) != 0
                ));
            }
            return results;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task MarkAlertReadAsync(long alertId)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE alerts SET is_read = 1 WHERE id = @id;";
            cmd.Parameters.AddWithValue("@id", alertId);
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task MarkAllAlertsReadAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "UPDATE alerts SET is_read = 1 WHERE is_read = 0;";
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task DeleteAlertAsync(long alertId)
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "DELETE FROM alerts WHERE id = @id;";
            cmd.Parameters.AddWithValue("@id", alertId);
            await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyList<string>> GetKnownAlertAppsAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT DISTINCT app_name FROM alerts;";
            var results = new List<string>();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(reader.GetString(0));
            return results;
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
