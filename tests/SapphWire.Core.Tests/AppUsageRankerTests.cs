using FluentAssertions;
using NSubstitute;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class AppUsageRankerTests
{
    private DateTimeOffset _now = DateTimeOffset.Parse("2026-01-15T12:00:00Z");
    private readonly IInstalledAppsProvider _installedApps = Substitute.For<IInstalledAppsProvider>();

    private AppUsageRanker CreateRanker()
    {
        _installedApps.GetInstalledApps().Returns(Array.Empty<InstalledAppInfo>());
        return new AppUsageRanker(_installedApps, () => _now);
    }

    [Fact]
    public void RankedApps_RanksByCumulativeBytesDescending()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("SmallApp", 100, 50);
        ranker.RecordTraffic("BigApp", 5000, 3000);
        ranker.RecordTraffic("MediumApp", 1000, 500);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);

        list.Should().HaveCount(3);
        list[0].AppId.Should().Be("BigApp");
        list[0].CumulativeBytes.Should().Be(8000);
        list[1].AppId.Should().Be("MediumApp");
        list[1].CumulativeBytes.Should().Be(1500);
        list[2].AppId.Should().Be("SmallApp");
        list[2].CumulativeBytes.Should().Be(150);
    }

    [Fact]
    public void RankedApps_AccumulatesAcrossMultipleRecordCalls()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("AppA", 100, 0);
        ranker.RecordTraffic("AppA", 200, 0);
        ranker.RecordTraffic("AppB", 500, 0);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);

        list.Should().HaveCount(2);
        list[0].AppId.Should().Be("AppB");
        list[0].CumulativeBytes.Should().Be(500);
        list[1].AppId.Should().Be("AppA");
        list[1].CumulativeBytes.Should().Be(300);
    }

    [Fact]
    public void RankedApps_DropsAppsAfter7DaysOfNoTraffic()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("ActiveApp", 1000, 0);
        ranker.RecordTraffic("StaleApp", 2000, 0);
        ranker.Tick();

        ranker.RankedApps(includeInstalled: false).Should().HaveCount(2);

        _now = _now.AddDays(7).AddSeconds(1);

        ranker.RecordTraffic("ActiveApp", 1, 0);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list.Should().HaveCount(1);
        list[0].AppId.Should().Be("ActiveApp");
    }

    [Fact]
    public void RankedApps_DoesNotDropAppWithin7Days()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("RecentApp", 1000, 0);
        ranker.Tick();

        _now = _now.AddDays(6).AddHours(23);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list.Should().HaveCount(1);
        list[0].AppId.Should().Be("RecentApp");
    }

    [Fact]
    public void Tick_MaintainsRankStabilityWhenTotalsTie()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("AppAlpha", 500, 0);
        ranker.RecordTraffic("AppBeta", 500, 0);
        ranker.RecordTraffic("AppGamma", 500, 0);
        ranker.Tick();

        var firstOrder = ranker.RankedApps(includeInstalled: false)
            .Select(r => r.AppId).ToList();

        ranker.Tick();

        var secondOrder = ranker.RankedApps(includeInstalled: false)
            .Select(r => r.AppId).ToList();

        secondOrder.Should().Equal(firstOrder);
    }

    [Fact]
    public void Tick_StableRank_DoesNotReshuffleOnMinorFluctuation()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("Leader", 10000, 0);
        ranker.RecordTraffic("Follower", 9999, 0);
        ranker.Tick();

        ranker.RankedApps(includeInstalled: false)[0].AppId.Should().Be("Leader");

        ranker.RecordTraffic("Follower", 2, 0);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list[0].AppId.Should().Be("Follower");
        list[0].CumulativeBytes.Should().Be(10001);
        list[1].AppId.Should().Be("Leader");
        list[1].CumulativeBytes.Should().Be(10000);
    }

    [Fact]
    public void RankedApps_IncludeInstalled_MergesNeverConnectedApps()
    {
        _installedApps.GetInstalledApps().Returns(new[]
        {
            new InstalledAppInfo("InstalledApp1", "Installed App 1", @"C:\Program Files\App1\app1.exe", "Publisher1"),
            new InstalledAppInfo("InstalledApp2", "Installed App 2", @"C:\Program Files\App2\app2.exe", "Publisher2"),
            new InstalledAppInfo("TrafficApp", "Traffic App", @"C:\Program Files\TrafficApp\traffic.exe", "Publisher3"),
        });
        var ranker = new AppUsageRanker(_installedApps, () => _now);

        ranker.RecordTraffic("TrafficApp", 5000, 0);
        ranker.Tick();

        var withInstalled = ranker.RankedApps(includeInstalled: true);
        var withoutInstalled = ranker.RankedApps(includeInstalled: false);

        withoutInstalled.Should().HaveCount(1);
        withoutInstalled[0].AppId.Should().Be("TrafficApp");

        withInstalled.Should().HaveCount(3);
        withInstalled[0].AppId.Should().Be("TrafficApp");
        withInstalled[0].IsInstalledOnly.Should().BeFalse();

        var installedOnly = withInstalled.Where(r => r.IsInstalledOnly).ToList();
        installedOnly.Should().HaveCount(2);
        installedOnly.Should().AllSatisfy(r => r.CumulativeBytes.Should().Be(0));
    }

    [Fact]
    public void RankedApps_IncludeInstalled_DoesNotDuplicateTrafficApps()
    {
        _installedApps.GetInstalledApps().Returns(new[]
        {
            new InstalledAppInfo("MyApp", "My App", @"C:\Program Files\MyApp\my.exe", "Pub"),
        });
        var ranker = new AppUsageRanker(_installedApps, () => _now);

        ranker.RecordTraffic("MyApp", 1000, 500);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: true);
        list.Count(r => r.AppId == "MyApp").Should().Be(1);
        list.First(r => r.AppId == "MyApp").CumulativeBytes.Should().Be(1500);
        list.First(r => r.AppId == "MyApp").IsInstalledOnly.Should().BeFalse();
    }

    [Fact]
    public void RankedApps_ReturnsCurrentUpDownSpeeds()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("AppX", 100, 50);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list[0].CurrentUp.Should().Be(100);
        list[0].CurrentDown.Should().Be(50);
    }

    [Fact]
    public void Tick_ResetsCurrentSpeeds()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("AppX", 100, 50);
        ranker.Tick();
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list[0].CurrentUp.Should().Be(0);
        list[0].CurrentDown.Should().Be(0);
        list[0].CumulativeBytes.Should().Be(150);
    }

    [Fact]
    public void RankedApps_EmptyByDefault()
    {
        var ranker = CreateRanker();
        ranker.Tick();
        ranker.RankedApps(includeInstalled: false).Should().BeEmpty();
    }

    [Fact]
    public void RankedApps_BeforeTick_ReturnsEmptyList()
    {
        var ranker = CreateRanker();
        ranker.RecordTraffic("App", 100, 0);
        ranker.RankedApps(includeInstalled: false).Should().BeEmpty();
    }

    [Fact]
    public void LoadState_RestoresCumulativeBytesAndLastSeen()
    {
        var ranker = CreateRanker();
        var lastSeen = _now.AddHours(-1);

        ranker.LoadState(new Dictionary<string, (long, DateTimeOffset)>
        {
            ["RestoredApp"] = (5000, lastSeen),
        });
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list.Should().HaveCount(1);
        list[0].AppId.Should().Be("RestoredApp");
        list[0].CumulativeBytes.Should().Be(5000);
        list[0].LastSeen.Should().Be(lastSeen);
    }

    [Fact]
    public void GetState_ReturnsCurrentCumulativesAndLastSeen()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("App1", 100, 200);
        ranker.RecordTraffic("App2", 300, 400);

        var state = ranker.GetState();
        state.Should().HaveCount(2);
        state["App1"].CumulativeBytes.Should().Be(300);
        state["App1"].LastSeen.Should().Be(_now);
        state["App2"].CumulativeBytes.Should().Be(700);
    }

    [Fact]
    public void RecordTraffic_IsCaseInsensitive()
    {
        var ranker = CreateRanker();

        ranker.RecordTraffic("MyApp", 100, 0);
        ranker.RecordTraffic("myapp", 200, 0);
        ranker.Tick();

        var list = ranker.RankedApps(includeInstalled: false);
        list.Should().HaveCount(1);
        list[0].CumulativeBytes.Should().Be(300);
    }
}
