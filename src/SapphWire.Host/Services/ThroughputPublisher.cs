using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using SapphWire.Core;
using SapphWire.Host.Hubs;

namespace SapphWire.Host.Services;

public class ThroughputPublisher : BackgroundService
{
    private readonly FlowAggregator _aggregator;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly IPersistence _persistence;
    private readonly IProcessResolver _processResolver;
    private readonly IDnsResolver _dnsResolver;
    private readonly IGeoIp _geoIp;

    private readonly ConcurrentDictionary<string, LinkedList<long>> _sparkBuffers = new();
    private const int SparkMaxPoints = 60;

    public ThroughputPublisher(
        FlowAggregator aggregator,
        IHubContext<DashboardHub> hub,
        IPersistence persistence,
        IProcessResolver processResolver,
        IDnsResolver dnsResolver,
        IGeoIp geoIp)
    {
        _aggregator = aggregator;
        _hub = hub;
        _persistence = persistence;
        _processResolver = processResolver;
        _dnsResolver = dnsResolver;
        _geoIp = geoIp;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var bucket = _aggregator.Tick(DateTimeOffset.UtcNow);
            var perPid = _aggregator.DrainPerPid();
            var perFlow = _aggregator.DrainPerFlow();

            try
            {
                await _persistence.WriteBucketsAsync(new[] { bucket });

                if (perPid.Count > 0)
                {
                    var grouped = perPid.Select(kv =>
                    {
                        var info = _processResolver.Resolve(kv.Key);
                        return new GroupedThroughputBucket(
                            bucket.Timestamp, info.ExeName, info.Publisher,
                            kv.Value.Up, kv.Value.Down);
                    }).ToList();

                    await _persistence.WriteGroupedBucketsAsync(grouped);
                }
            }
            catch
            {
                // Best-effort: live broadcast continues even if persistence fails
            }

            await _hub.Clients.Group("liveThroughput")
                .SendAsync("ThroughputDelta", bucket, stoppingToken);

            if (perFlow.Count > 0)
            {
                try
                {
                    var activeApps = BuildActiveApps(perFlow);
                    await _hub.Clients.Group("activeApps")
                        .SendAsync("ActiveAppsDelta", activeApps, stoppingToken);

                    var connectionsByApp = BuildConnectionsByApp(perFlow);
                    foreach (var (appId, connections) in connectionsByApp)
                    {
                        await _hub.Clients.Group($"connections/{appId}")
                            .SendAsync("ConnectionsDelta", connections, stoppingToken);
                    }
                }
                catch
                {
                    // Best-effort
                }
            }
        }
    }

    private List<ActiveAppRow> BuildActiveApps(
        Dictionary<FlowKey, (long Up, long Down)> perFlow)
    {
        var appFlows = new Dictionary<string, List<(FlowKey Key, long Up, long Down)>>();

        foreach (var (flowKey, bytes) in perFlow)
        {
            var info = _processResolver.Resolve(flowKey.Pid);
            var appKey = AppGrouper.GetAppKey(info);

            if (!appFlows.TryGetValue(appKey, out var list))
            {
                list = new List<(FlowKey, long, long)>();
                appFlows[appKey] = list;
            }
            list.Add((flowKey, bytes.Up, bytes.Down));
        }

        var result = new List<ActiveAppRow>();
        foreach (var (appKey, flows) in appFlows)
        {
            long totalUp = 0, totalDown = 0;
            var endpoints = new Dictionary<string, long>();

            foreach (var (key, up, down) in flows)
            {
                totalUp += up;
                totalDown += down;
                var ep = $"{key.RemoteIp}:{key.RemotePort}";
                endpoints.TryGetValue(ep, out var epTotal);
                endpoints[ep] = epTotal + up + down;
            }

            var topEndpointEntry = endpoints.MaxBy(kv => kv.Value);
            var topEndpointRaw = topEndpointEntry.Key;
            var topIp = topEndpointRaw.Split(':')[0];
            var topHostname = _dnsResolver.Resolve(topIp);
            var topPort = topEndpointRaw.Split(':').Last();
            var topEndpoint = $"{topHostname}:{topPort}";
            var countryCode = _geoIp.Lookup(topIp);

            var sparkPoint = totalUp + totalDown;
            var sparkBuffer = _sparkBuffers.GetOrAdd(appKey, _ => new LinkedList<long>());
            lock (sparkBuffer)
            {
                sparkBuffer.AddLast(sparkPoint);
                while (sparkBuffer.Count > SparkMaxPoints)
                    sparkBuffer.RemoveFirst();
            }

            result.Add(new ActiveAppRow(
                AppId: appKey,
                DisplayName: appKey,
                IconUrl: $"/api/icons/{Uri.EscapeDataString(appKey)}",
                Up: totalUp,
                Down: totalDown,
                SparkPoint: sparkPoint,
                TopEndpoint: topEndpoint,
                EndpointCount: endpoints.Count,
                CountryCode: countryCode
            ));
        }

        return result.OrderByDescending(a => a.Up + a.Down).ToList();
    }

    private Dictionary<string, List<ConnectionDetail>> BuildConnectionsByApp(
        Dictionary<FlowKey, (long Up, long Down)> perFlow)
    {
        var result = new Dictionary<string, List<ConnectionDetail>>();

        foreach (var (flowKey, bytes) in perFlow)
        {
            var info = _processResolver.Resolve(flowKey.Pid);
            var appKey = AppGrouper.GetAppKey(info);
            var hostname = _dnsResolver.Resolve(flowKey.RemoteIp);
            var countryCode = _geoIp.Lookup(flowKey.RemoteIp);

            if (!result.TryGetValue(appKey, out var list))
            {
                list = new List<ConnectionDetail>();
                result[appKey] = list;
            }

            list.Add(new ConnectionDetail(
                ExeName: info.ExeName,
                Pid: flowKey.Pid,
                RemoteHost: hostname,
                RemotePort: flowKey.RemotePort,
                Up: bytes.Up,
                Down: bytes.Down,
                CountryCode: countryCode
            ));
        }

        foreach (var list in result.Values)
            list.Sort((a, b) => (b.Up + b.Down).CompareTo(a.Up + a.Down));

        return result;
    }
}
