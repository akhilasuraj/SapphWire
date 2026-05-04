namespace SapphWire.Core;

public record UsageRow(string Name, long BytesUp, long BytesDown);

public record SparklinePoint(string Timestamp, long Value);

public record UsageFilters(
    IReadOnlyList<string> Left,
    IReadOnlyList<string> Middle,
    IReadOnlyList<string> Right
);

public record UsageResult(
    IReadOnlyList<UsageRow> Left,
    IReadOnlyList<UsageRow> Middle,
    IReadOnlyList<UsageRow> Right,
    long TotalUp,
    long TotalDown,
    IReadOnlyList<SparklinePoint> Sparkline
);

public record DetailFlowBucket(
    DateTimeOffset Timestamp,
    string AppName,
    string Publisher,
    string RemoteHost,
    int RemotePort,
    long BytesUp,
    long BytesDown
);
