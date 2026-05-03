namespace SapphWire.Core;

public record ConnectionDetail(
    string ExeName,
    int Pid,
    string RemoteHost,
    int RemotePort,
    long Up,
    long Down,
    string? CountryCode
);
