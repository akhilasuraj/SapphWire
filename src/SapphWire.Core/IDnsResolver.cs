namespace SapphWire.Core;

public interface IDnsResolver
{
    string Resolve(string ip);
}

public class PassthroughDnsResolver : IDnsResolver
{
    public string Resolve(string ip) => ip;
}
