namespace SapphWire.Core;

public static class HostInfo
{
    public const int Port = 5148;
    public const string BaseUrl = $"http://localhost:{Port}";
    public const string DashboardUrl = BaseUrl;
    public const string HubPath = "/hubs/dashboard";
}
