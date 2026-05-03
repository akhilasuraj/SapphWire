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
                    var (activeApps, connectionsByApp) = BuildAppData(perFlow);
                    await _hub.Clients.Group("activeApps")
                        .SendAsync("ActiveAppsDelta", activeApps, stoppingToken);

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

    private (List<ActiveAppRow>, Dictionary<string, List<ConnectionDetail>>) BuildAppData(
        Dictionary<FlowKey, (long Up, long Down)> perFlow)
    {
        var appGroups = new Dictionary<string, List<(FlowKey Key, ProcessInfo Info, long Up, long Down)>>();

        foreach (var (flowKey, bytes) in perFlow)
        {
            var info = _processResolver.Resolve(flowKey.Pid);
            var appKey = AppGrouper.GetAppKey(info);

            if (!appGroups.TryGetValue(appKey, out var list))
            {
                list = new();
                appGroups[appKey] = list;
            }
            list.Add((flowKey, info, bytes.Up, bytes.Down));
        }

        var activeApps = new List<ActiveAppRow>();
        var connectionsByApp = new Dictionary<string, List<ConnectionDetail>>();

        foreach (var (appKey, flows) in appGroups)
        {
            long totalUp = 0, totalDown = 0;
            var endpoints = new Dictionary<(string Ip, int Port), long>();
            var connections = new List<ConnectionDetail>();

            foreach (var (key, info, up, down) in flows)
            {
                totalUp += up;
                totalDown += down;

                var epKey = (key.RemoteIp, key.RemotePort);
                endpoints.TryGetValue(epKey, out var epTotal);
                endpoints[epKey] = epTotal + up + down;

                connections.Add(new ConnectionDetail(
                    ExeName: info.ExeName,
                    Pid: key.Pid,
                    RemoteHost: _dnsResolver.Resolve(key.RemoteIp),
                    RemotePort: key.RemotePort,
                    Up: up,
                    Down: down,
                    CountryCode: _geoIp.Lookup(key.RemoteIp)
                ));
            }

            var topEp = endpoints.MaxBy(kv => kv.Value).Key;
            var topHostname = _dnsResolver.Resolve(topEp.Ip);
            var countryCode = _geoIp.Lookup(topEp.Ip);

            var sparkPoint = totalUp + totalDown;
            var sparkBuffer = _sparkBuffers.GetOrAdd(appKey, _ => new LinkedList<long>());
            lock (sparkBuffer)
            {
                sparkBuffer.AddLast(sparkPoint);
                while (sparkBuffer.Count > SparkMaxPoints)
                    sparkBuffer.RemoveFirst();
            }

            activeApps.Add(new ActiveAppRow(
                AppId: appKey,
                DisplayName: appKey,
                IconUrl: $"/api/icons/{Uri.EscapeDataString(appKey)}",
                Up: totalUp,
                Down: totalDown,
                SparkPoint: sparkPoint,
                TopEndpoint: $"{topHostname}:{topEp.Port}",
                EndpointCount: endpoints.Count,
                CountryCode: countryCode
            ));

            connections.Sort((a, b) => (b.Up + b.Down).CompareTo(a.Up + a.Down));
            connectionsByApp[appKey] = connections;
        }

        activeApps.Sort((a, b) => (b.Up + b.Down).CompareTo(a.Up + a.Down));
        return (activeApps, connectionsByApp);
    }
}
