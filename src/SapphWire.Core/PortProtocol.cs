namespace SapphWire.Core;

public static class PortProtocol
{
    private static readonly Dictionary<int, string> Map = new()
    {
        [21] = "FTP",
        [22] = "SSH",
        [25] = "SMTP",
        [53] = "DNS",
        [67] = "DHCP",
        [68] = "DHCP",
        [80] = "HTTP",
        [110] = "POP3",
        [123] = "NTP",
        [143] = "IMAP",
        [443] = "HTTPS",
        [445] = "SMB",
        [465] = "SMTPS",
        [587] = "SMTP",
        [853] = "DoT",
        [993] = "IMAPS",
        [995] = "POP3S",
        [1900] = "SSDP",
        [3389] = "RDP",
        [3478] = "STUN",
        [5228] = "GCM",
        [5353] = "mDNS",
        [8080] = "HTTP Alt",
        [8443] = "HTTPS Alt",
    };

    public static string Resolve(int port) =>
        Map.TryGetValue(port, out var name) ? name : "Other";
}
