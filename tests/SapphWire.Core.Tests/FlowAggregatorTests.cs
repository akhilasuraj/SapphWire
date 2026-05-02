using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class FlowAggregatorTests
{
    private static NetworkEvent MakeEvent(
        TrafficDirection direction,
        long bytes,
        DateTimeOffset? ts = null) =>
        new(
            ts ?? DateTimeOffset.UtcNow,
            ProcessId: 1,
            direction,
            bytes,
            RemoteIp: "10.0.0.1",
            RemotePort: 443,
            Protocol: "TCP"
        );

    [Fact]
    public void Tick_WithNoEvents_ProducesZeroBucket()
    {
        var agg = new FlowAggregator();
        var now = DateTimeOffset.UtcNow;

        var bucket = agg.Tick(now);

        bucket.TotalUp.Should().Be(0);
        bucket.TotalDown.Should().Be(0);
        bucket.Timestamp.Should().Be(now);
    }

    [Fact]
    public void Tick_AccumulatesUpAndDownSeparately()
    {
        var agg = new FlowAggregator();

        agg.Ingest(MakeEvent(TrafficDirection.Up, 100));
        agg.Ingest(MakeEvent(TrafficDirection.Up, 50));
        agg.Ingest(MakeEvent(TrafficDirection.Down, 200));

        var bucket = agg.Tick(DateTimeOffset.UtcNow);

        bucket.TotalUp.Should().Be(150);
        bucket.TotalDown.Should().Be(200);
    }

    [Fact]
    public void Tick_ResetsPendingCounters()
    {
        var agg = new FlowAggregator();

        agg.Ingest(MakeEvent(TrafficDirection.Up, 100));
        agg.Tick(DateTimeOffset.UtcNow);

        var second = agg.Tick(DateTimeOffset.UtcNow);

        second.TotalUp.Should().Be(0);
        second.TotalDown.Should().Be(0);
    }

    [Fact]
    public void GetSnapshot_ReturnsAllBuckets()
    {
        var agg = new FlowAggregator();
        var t1 = DateTimeOffset.UtcNow;
        var t2 = t1.AddSeconds(1);
        var t3 = t2.AddSeconds(1);

        agg.Ingest(MakeEvent(TrafficDirection.Up, 10));
        agg.Tick(t1);

        agg.Ingest(MakeEvent(TrafficDirection.Down, 20));
        agg.Tick(t2);

        agg.Tick(t3);

        var snapshot = agg.GetSnapshot();

        snapshot.Should().HaveCount(3);
        snapshot[0].Timestamp.Should().Be(t1);
        snapshot[0].TotalUp.Should().Be(10);
        snapshot[1].Timestamp.Should().Be(t2);
        snapshot[1].TotalDown.Should().Be(20);
        snapshot[2].TotalUp.Should().Be(0);
        snapshot[2].TotalDown.Should().Be(0);
    }

    [Fact]
    public void GetSnapshot_TrimsToMaxBuckets()
    {
        var agg = new FlowAggregator(maxBuckets: 3);
        var baseTime = DateTimeOffset.UtcNow;

        for (int i = 0; i < 5; i++)
        {
            agg.Ingest(MakeEvent(TrafficDirection.Up, (i + 1) * 10));
            agg.Tick(baseTime.AddSeconds(i));
        }

        var snapshot = agg.GetSnapshot();

        snapshot.Should().HaveCount(3);
        snapshot[0].TotalUp.Should().Be(30);
        snapshot[1].TotalUp.Should().Be(40);
        snapshot[2].TotalUp.Should().Be(50);
    }

    [Fact]
    public void ConsecutiveEmptyTicks_ProduceZeroBuckets()
    {
        var agg = new FlowAggregator();
        var baseTime = DateTimeOffset.UtcNow;

        var b1 = agg.Tick(baseTime);
        var b2 = agg.Tick(baseTime.AddSeconds(1));
        var b3 = agg.Tick(baseTime.AddSeconds(2));

        b1.TotalUp.Should().Be(0);
        b1.TotalDown.Should().Be(0);
        b2.TotalUp.Should().Be(0);
        b2.TotalDown.Should().Be(0);
        b3.TotalUp.Should().Be(0);
        b3.TotalDown.Should().Be(0);

        agg.GetSnapshot().Should().HaveCount(3);
    }

    [Fact]
    public void Ingest_MultipleDirections_WithinSameTick()
    {
        var agg = new FlowAggregator();

        agg.Ingest(MakeEvent(TrafficDirection.Up, 1000));
        agg.Ingest(MakeEvent(TrafficDirection.Down, 2000));
        agg.Ingest(MakeEvent(TrafficDirection.Up, 500));
        agg.Ingest(MakeEvent(TrafficDirection.Down, 300));

        var bucket = agg.Tick(DateTimeOffset.UtcNow);

        bucket.TotalUp.Should().Be(1500);
        bucket.TotalDown.Should().Be(2300);
    }

    [Fact]
    public void GetSnapshot_ReturnsEmptyListBeforeFirstTick()
    {
        var agg = new FlowAggregator();

        agg.GetSnapshot().Should().BeEmpty();
    }

    [Fact]
    public void GetSnapshot_ReturnsDefensiveCopy()
    {
        var agg = new FlowAggregator();
        agg.Tick(DateTimeOffset.UtcNow);

        var snap1 = agg.GetSnapshot();

        agg.Ingest(MakeEvent(TrafficDirection.Up, 999));
        agg.Tick(DateTimeOffset.UtcNow);

        var snap2 = agg.GetSnapshot();

        snap1.Should().HaveCount(1);
        snap2.Should().HaveCount(2);
    }
}
