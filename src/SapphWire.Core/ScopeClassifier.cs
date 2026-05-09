using System.Net;

namespace SapphWire.Core;

public enum NetworkScope { Lan, Wan }

public record HostSubnet(string Ip, string Mask);

public static class ScopeClassifier
{
    public static NetworkScope Classify(string ip, IReadOnlyList<HostSubnet> hostSubnets)
    {
        if (!IPAddress.TryParse(ip, out var addr))
            return NetworkScope.Wan;

        if (addr.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
            return NetworkScope.Wan;

        var bytes = addr.GetAddressBytes();

        // Loopback: 127.0.0.0/8
        if (bytes[0] == 127)
            return NetworkScope.Lan;

        // RFC1918: 10.0.0.0/8
        if (bytes[0] == 10)
            return NetworkScope.Lan;

        // RFC1918: 172.16.0.0/12
        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
            return NetworkScope.Lan;

        // RFC1918: 192.168.0.0/16
        if (bytes[0] == 192 && bytes[1] == 168)
            return NetworkScope.Lan;

        // Link-local: 169.254.0.0/16
        if (bytes[0] == 169 && bytes[1] == 254)
            return NetworkScope.Lan;

        // Same-subnet-as-any-host-interface
        foreach (var subnet in hostSubnets)
        {
            if (!IPAddress.TryParse(subnet.Ip, out var hostAddr))
                continue;
            if (!IPAddress.TryParse(subnet.Mask, out var maskAddr))
                continue;
            if (hostAddr.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
                continue;

            var hostBytes = hostAddr.GetAddressBytes();
            var maskBytes = maskAddr.GetAddressBytes();

            bool match = true;
            for (int i = 0; i < 4; i++)
            {
                if ((bytes[i] & maskBytes[i]) != (hostBytes[i] & maskBytes[i]))
                {
                    match = false;
                    break;
                }
            }
            if (match) return NetworkScope.Lan;
        }

        return NetworkScope.Wan;
    }
}
