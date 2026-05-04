namespace SapphWire.Core;

public record AlertRecord(
    long Id,
    DateTimeOffset Timestamp,
    string AppName,
    string? ExePath,
    string? RemoteIp,
    int? RemotePort,
    bool IsRead
);
