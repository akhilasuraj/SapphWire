namespace SapphWire.Core;

public interface IHostnameResolver
{
    Task<string?> ResolveAsync(string ip);
    string? TryResolve(string ip);
}

public interface IDnsSource
{
    Task<string?> LookupPtrAsync(string ip);
}

public class SystemDnsSource : IDnsSource
{
    public async Task<string?> LookupPtrAsync(string ip)
    {
        try
        {
            var entry = await System.Net.Dns.GetHostEntryAsync(ip);
            return entry.HostName != ip ? entry.HostName : null;
        }
        catch
        {
            return null;
        }
    }
}
