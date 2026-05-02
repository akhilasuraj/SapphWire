namespace SapphWire.Core;

public static class HostInfo
{
    public const int Port = 5148;
    public static readonly string BaseUrl = $"http://localhost:{Port}";
    public static readonly string DashboardUrl = BaseUrl;
    public const string HubPath = "/hubs/dashboard";
}
