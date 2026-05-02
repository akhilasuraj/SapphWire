using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class PersistenceTests : IAsyncLifetime
{
    private SqlitePersistence _persistence = null!;

    public async Task InitializeAsync()
    {
        _persistence = new SqlitePersistence("Data Source=:memory:");
        await _persistence.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        await _persistence.DisposeAsync();
    }

    private static DateTimeOffset Ts(int year, int month, int day, int hour, int minute, int second) =>
        new(year, month, day, hour, minute, second, TimeSpan.Zero);

    [Fact]
    public async Task WriteBuckets_AndGetSeries_RoundTrips()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);
        var buckets = new[]
        {
            new ThroughputBucket(t0, 100, 200),
            new ThroughputBucket(t0.AddSeconds(1), 150, 250),
        };

        await _persistence.WriteBucketsAsync(buckets);

        var result = await _persistence.GetSeriesAsync(
            t0.AddSeconds(-1), t0.AddSeconds(2), TimeSpan.FromSeconds(1));

        result.Should().HaveCount(2);
        result[0].TotalUp.Should().Be(100);
        result[0].TotalDown.Should().Be(200);
        result[1].TotalUp.Should().Be(150);
        result[1].TotalDown.Should().Be(250);
    }

    [Fact]
    public async Task GetSeries_OneSecondBucket_QueriesFlows1s()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);
        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(t0, 100, 200),
        });

        var result = await _persistence.GetSeriesAsync(
            t0.AddSeconds(-1), t0.AddSeconds(1), TimeSpan.FromSeconds(1));

        result.Should().ContainSingle()
            .Which.TotalUp.Should().Be(100);
    }

    [Fact]
    public async Task GetSeries_OneHourBucket_QueriesFlows1h()
    {
        var hourStart = Ts(2024, 6, 15, 10, 0, 0);

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(hourStart, 100, 200),
            new ThroughputBucket(hourStart.AddSeconds(1), 50, 50),
        });

        await _persistence.RunRollupAsync(hourStart.AddHours(25));

        var result = await _persistence.GetSeriesAsync(
            hourStart.AddHours(-1), hourStart.AddHours(1), TimeSpan.FromHours(1));

        result.Should().ContainSingle();
        result[0].TotalUp.Should().Be(150);
        result[0].TotalDown.Should().Be(250);
    }

    [Fact]
    public async Task Rollup_AggregatesExpiredRowsIntoHourly()
    {
        var hourStart = Ts(2024, 1, 1, 10, 0, 0);
        var buckets = new[]
        {
            new ThroughputBucket(hourStart, 100, 200),
            new ThroughputBucket(hourStart.AddSeconds(30), 150, 250),
            new ThroughputBucket(hourStart.AddMinutes(59), 50, 50),
        };

        await _persistence.WriteBucketsAsync(buckets);
        await _persistence.RunRollupAsync(hourStart.AddHours(25));

        var oneSecRows = await _persistence.GetSeriesAsync(
            hourStart.AddSeconds(-1), hourStart.AddHours(1), TimeSpan.FromSeconds(1));
        oneSecRows.Should().BeEmpty();

        var oneHourRows = await _persistence.GetSeriesAsync(
            hourStart.AddHours(-1), hourStart.AddHours(1), TimeSpan.FromHours(1));
        oneHourRows.Should().ContainSingle();
        oneHourRows[0].TotalUp.Should().Be(300);
        oneHourRows[0].TotalDown.Should().Be(500);
    }

    [Fact]
    public async Task Rollup_RetentionBoundary_PreservesRecentRows()
    {
        var now = Ts(2024, 6, 15, 12, 0, 0);
        var recent = now.AddHours(-23);
        var old = now.AddHours(-25);

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(recent, 100, 200),
            new ThroughputBucket(old, 50, 50),
        });

        await _persistence.RunRollupAsync(now);

        var recentRows = await _persistence.GetSeriesAsync(
            recent.AddSeconds(-1), recent.AddSeconds(1), TimeSpan.FromSeconds(1));
        recentRows.Should().ContainSingle()
            .Which.TotalUp.Should().Be(100);

        var hourlyRows = await _persistence.GetSeriesAsync(
            old.AddHours(-1), old.AddHours(1), TimeSpan.FromHours(1));
        hourlyRows.Should().ContainSingle();
    }

    [Fact]
    public async Task Rollup_AccumulatesIntoExistingHourlyRows()
    {
        var hourStart = Ts(2024, 1, 1, 10, 0, 0);

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(hourStart, 100, 200),
        });
        await _persistence.RunRollupAsync(hourStart.AddHours(25));

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(hourStart.AddSeconds(30), 50, 50),
        });
        await _persistence.RunRollupAsync(hourStart.AddHours(25).AddMinutes(5));

        var result = await _persistence.GetSeriesAsync(
            hourStart.AddHours(-1), hourStart.AddHours(1), TimeSpan.FromHours(1));

        result.Should().ContainSingle();
        result[0].TotalUp.Should().Be(150);
        result[0].TotalDown.Should().Be(250);
    }

    [Fact]
    public async Task GetSeries_ReturnsEmptyForNoData()
    {
        var result = await _persistence.GetSeriesAsync(
            Ts(2024, 1, 1, 0, 0, 0), Ts(2024, 1, 2, 0, 0, 0), TimeSpan.FromSeconds(1));
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task WriteBuckets_EmptyList_DoesNotThrow()
    {
        var act = () => _persistence.WriteBucketsAsync(Array.Empty<ThroughputBucket>());
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task GetSeries_ResultsAreOrderedByTimestamp()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(t0.AddSeconds(2), 30, 30),
            new ThroughputBucket(t0, 10, 10),
            new ThroughputBucket(t0.AddSeconds(1), 20, 20),
        });

        var result = await _persistence.GetSeriesAsync(
            t0.AddSeconds(-1), t0.AddSeconds(3), TimeSpan.FromSeconds(1));

        result.Should().HaveCount(3);
        result[0].TotalUp.Should().Be(10);
        result[1].TotalUp.Should().Be(20);
        result[2].TotalUp.Should().Be(30);
    }

    [Fact]
    public async Task Rollup_MultipleHours_ProduceSeparateHourlyRows()
    {
        var hour1 = Ts(2024, 1, 1, 10, 0, 0);
        var hour2 = Ts(2024, 1, 1, 11, 0, 0);

        await _persistence.WriteBucketsAsync(new[]
        {
            new ThroughputBucket(hour1, 100, 100),
            new ThroughputBucket(hour1.AddMinutes(30), 100, 100),
            new ThroughputBucket(hour2, 200, 200),
            new ThroughputBucket(hour2.AddMinutes(30), 200, 200),
        });

        await _persistence.RunRollupAsync(hour1.AddHours(26));

        var result = await _persistence.GetSeriesAsync(
            hour1.AddHours(-1), hour2.AddHours(1), TimeSpan.FromHours(1));

        result.Should().HaveCount(2);
        result[0].TotalUp.Should().Be(200);
        result[1].TotalUp.Should().Be(400);
    }
