namespace SapphWire.Core;

public enum TrafficDirection { Up, Down }

public record NetworkEvent(
    DateTimeOffset Timestamp,
    int ProcessId,
    TrafficDirection Direction,
    long Bytes,
    string RemoteIp,
    int RemotePort,
    string Protocol
);
