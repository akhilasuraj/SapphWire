namespace SapphWire.Core;

public record NetworkInfo(
    string Ssid,
    string ConnectionState,
    string GatewayIp,
    string GatewayMac,
    string[] DnsServers,
    string LocalIp,
    string SubnetMask
);
