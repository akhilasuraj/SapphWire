namespace SapphWire.Core;

public record ActiveAppRow(
    string AppId,
    string DisplayName,
    string IconUrl,
    long Up,
    long Down,
    long SparkPoint,
    string TopEndpoint,
    int EndpointCount,
    string? CountryCode
);
