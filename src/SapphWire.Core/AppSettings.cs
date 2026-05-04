namespace SapphWire.Core;

public record AppSettings
{
    public bool AutostartEnabled { get; init; } = true;
    public bool ToastEnabled { get; init; } = true;
}
