using FluentAssertions;
using NSubstitute;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class ProcessResolverTests
{
    private readonly IProcessSource _source = Substitute.For<IProcessSource>();
    private readonly ProcessResolver _resolver;

    public ProcessResolverTests()
    {
        _resolver = new ProcessResolver(_source);
    }

    [Fact]
    public void Resolve_DelegatesToSource()
    {
        var expected = new ProcessInfo("chrome", @"C:\chrome.exe", "Google Chrome", "Chrome", "Google");
        _source.GetInfo(42).Returns(expected);

        var result = _resolver.Resolve(42);

        result.Should().Be(expected);
    }

    [Fact]
    public void Resolve_CachesResult()
    {
        var info = new ProcessInfo("app", @"C:\app.exe", "App", "App", "Vendor");
        _source.GetInfo(10).Returns(info);

        _resolver.Resolve(10);
        _resolver.Resolve(10);
        _resolver.Resolve(10);

        _source.Received(1).GetInfo(10);
    }

    [Fact]
    public void Resolve_ReturnsUnknown_WhenSourceReturnsNull()
    {
        _source.GetInfo(99).Returns((ProcessInfo?)null);

        var result = _resolver.Resolve(99);

        result.ExeName.Should().Be("Unknown");
        result.Publisher.Should().BeEmpty();
    }

    [Fact]
    public void Invalidate_ClearsCache_ForcesReResolve()
    {
        var first = new ProcessInfo("v1", @"C:\v1.exe", "V1", "", "");
        var second = new ProcessInfo("v2", @"C:\v2.exe", "V2", "", "");
        _source.GetInfo(5).Returns(first, second);

        var r1 = _resolver.Resolve(5);
        r1.ExeName.Should().Be("v1");

        _resolver.Invalidate(5);

        var r2 = _resolver.Resolve(5);
        r2.ExeName.Should().Be("v2");

        _source.Received(2).GetInfo(5);
    }

    [Fact]
    public void Invalidate_NonExistentPid_DoesNotThrow()
    {
        var act = () => _resolver.Invalidate(999);
        act.Should().NotThrow();
    }

    [Fact]
    public void Resolve_DifferentPids_CachedSeparately()
    {
        var info1 = new ProcessInfo("app1", @"C:\app1.exe", "", "", "");
        var info2 = new ProcessInfo("app2", @"C:\app2.exe", "", "", "");
        _source.GetInfo(1).Returns(info1);
        _source.GetInfo(2).Returns(info2);

        _resolver.Resolve(1).ExeName.Should().Be("app1");
        _resolver.Resolve(2).ExeName.Should().Be("app2");

        _source.Received(1).GetInfo(1);
        _source.Received(1).GetInfo(2);
    }

    [Fact]
    public void Resolve_UnknownHasAllFieldsEmpty()
    {
        _source.GetInfo(0).Returns((ProcessInfo?)null);

        var result = _resolver.Resolve(0);

        result.ExePath.Should().BeEmpty();
        result.ProductName.Should().BeEmpty();
        result.FileDescription.Should().BeEmpty();
        result.Publisher.Should().BeEmpty();
    }
}
