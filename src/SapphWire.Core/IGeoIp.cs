namespace SapphWire.Core;

public interface IGeoIp
{
    string? Lookup(string ip);
}

public class NullGeoIp : IGeoIp
{
    public string? Lookup(string ip) => null;
}
