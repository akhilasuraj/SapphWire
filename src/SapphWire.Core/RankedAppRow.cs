namespace SapphWire.Core;

public record RankedAppRow(
    string AppId,
    long CumulativeBytes,
    long CurrentUp,
    long CurrentDown,
    DateTimeOffset LastSeen,
    bool IsInstalledOnly
);
