namespace SapphWire.Core;

public record ThroughputBucket(
    DateTimeOffset Timestamp,
    long TotalUp,
    long TotalDown
);
