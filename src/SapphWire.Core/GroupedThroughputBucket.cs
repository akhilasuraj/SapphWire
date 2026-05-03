namespace SapphWire.Core;

public record GroupedThroughputBucket(
    DateTimeOffset Timestamp,
    string AppName,
    string Publisher,
    long BytesUp,
    long BytesDown
);

public record GraphSeriesPoint(
    string Timestamp,
    Dictionary<string, long> Values
);
