using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class TieredFlowStoreTests : IAsyncLifetime
{
    private TieredFlowStore _store = null!;

    public async Task InitializeAsync()
    {
        _store = new TieredFlowStore("Data Source=:memory:");
        await _store.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        await _store.DisposeAsync();
    }

    private static DateTimeOffset Ts(int year, int month, int day, int hour, int minute, int second) =>
        new(year, month, day, hour, minute, second, TimeSpan.Zero);

    [Fact]
    public async Task WriteAndQuery_RoundTrips()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);
        var buckets = new[]
        {
            new ThroughputBucket(t0, 100, 200),
            new ThroughputBucket(t0.AddSeconds(1), 150, 250),
            new ThroughputBucket(t0.AddSeconds(2), 50, 75),
        };

        await _store.WriteAsync(buckets);

        var result = await _store.QueryAsync(t0.AddSeconds(-1), t0.AddSeconds(3));

        result.Should().HaveCount(3);
        result[0].Timestamp.Should().Be(t0);
        result[0].TotalUp.Should().Be(100);
        result[0].TotalDown.Should().Be(200);
        result[1].TotalUp.Should().Be(150);
        result[1].TotalDown.Should().Be(250);
        result[2].TotalUp.Should().Be(50);
        result[2].TotalDown.Should().Be(75);
    }

    [Fact]
    public async Task Prune_RemovesRowsOlderThanRetention()
    {
        var now = Ts(2024, 6, 15, 10, 15, 0);
        var old = now.Add(-TieredFlowStore.LiveRetention).AddSeconds(-1);
        var recent = now.AddSeconds(-30);

        await _store.WriteAsync(new[]
        {
            new ThroughputBucket(old, 100, 200),
            new ThroughputBucket(recent, 300, 400),
        });

        await _store.PruneAsync(now);

        var result = await _store.QueryAsync(old.AddSeconds(-1), now);

        result.Should().ContainSingle();
        result[0].Timestamp.Should().Be(recent);
        result[0].TotalUp.Should().Be(300);
    }

    [Fact]
    public async Task Prune_PreservesRowsWithinRetention()
    {
        var now = Ts(2024, 6, 15, 10, 10, 0);
        var withinRetention = now.Add(-TieredFlowStore.LiveRetention).AddSeconds(30);

        await _store.WriteAsync(new[]
        {
            new ThroughputBucket(withinRetention, 500, 600),
        });

        await _store.PruneAsync(now);

        var result = await _store.QueryAsync(withinRetention.AddSeconds(-1), now);

        result.Should().ContainSingle();
        result[0].TotalUp.Should().Be(500);
    }

    [Fact]
    public async Task Prune_AtExactBoundary_KeepsRow()
    {
        var now = Ts(2024, 6, 15, 10, 10, 0);
        var exactBoundary = now.Add(-TieredFlowStore.LiveRetention);

        await _store.WriteAsync(new[]
        {
            new ThroughputBucket(exactBoundary, 100, 200),
            new ThroughputBucket(exactBoundary.AddSeconds(-1), 50, 50),
        });

        await _store.PruneAsync(now);

        var result = await _store.QueryAsync(exactBoundary.AddSeconds(-2), now);

        result.Should().ContainSingle();
        result[0].Timestamp.Should().Be(exactBoundary);
        result[0].TotalUp.Should().Be(100);
    }

    [Fact]
    public async Task Query_FiveMinuteWindow_ReturnsLiveTierData()
    {
        var now = Ts(2024, 6, 15, 10, 5, 0);
        var fiveMinAgo = now.AddMinutes(-5);

        var buckets = Enumerable.Range(0, 300)
            .Select(i => new ThroughputBucket(fiveMinAgo.AddSeconds(i), i * 10, i * 20))
            .ToList();

        await _store.WriteAsync(buckets);

        var result = await _store.QueryAsync(fiveMinAgo, now);

        result.Should().HaveCount(300);
        result[0].Timestamp.Should().Be(fiveMinAgo);
        result[0].TotalUp.Should().Be(0);
        result[299].Timestamp.Should().Be(fiveMinAgo.AddSeconds(299));
        result[299].TotalUp.Should().Be(2990);
    }

    [Fact]
    public async Task Query_ReturnsResultsOrderedByTimestamp()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);

        await _store.WriteAsync(new[]
        {
            new ThroughputBucket(t0.AddSeconds(2), 30, 30),
            new ThroughputBucket(t0, 10, 10),
            new ThroughputBucket(t0.AddSeconds(1), 20, 20),
        });

        var result = await _store.QueryAsync(t0.AddSeconds(-1), t0.AddSeconds(3));

        result.Should().HaveCount(3);
        result[0].TotalUp.Should().Be(10);
        result[1].TotalUp.Should().Be(20);
        result[2].TotalUp.Should().Be(30);
    }

    [Fact]
    public async Task Query_EmptyStore_ReturnsEmptyList()
    {
        var result = await _store.QueryAsync(
            Ts(2024, 1, 1, 0, 0, 0), Ts(2024, 1, 2, 0, 0, 0));

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Write_EmptyList_DoesNotThrow()
    {
        var act = () => _store.WriteAsync(Array.Empty<ThroughputBucket>());
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Write_DuplicateTimestamp_OverwritesExisting()
    {
        var t0 = Ts(2024, 6, 15, 10, 0, 0);

        await _store.WriteAsync(new[] { new ThroughputBucket(t0, 100, 200) });
        await _store.WriteAsync(new[] { new ThroughputBucket(t0, 300, 400) });

        var result = await _store.QueryAsync(t0.AddSeconds(-1), t0.AddSeconds(1));

        result.Should().ContainSingle();
        result[0].TotalUp.Should().Be(300);
        result[0].TotalDown.Should().Be(400);
    }
}
