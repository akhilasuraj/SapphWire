using FluentAssertions;
using NSubstitute;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class HostnameResolverTests
{
    private readonly IDnsSource _dns = Substitute.For<IDnsSource>();
    private DateTimeOffset _now = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private readonly HostnameResolver _resolver;

    public HostnameResolverTests()
    {
        _resolver = new HostnameResolver(_dns, clock: () => _now);
    }

    [Fact]
    public async Task ResolveAsync_CacheMiss_TriggersLookup()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("host.example.com");

        var result = await _resolver.ResolveAsync("1.2.3.4");

        result.Should().Be("host.example.com");
        await _dns.Received(1).LookupPtrAsync("1.2.3.4");
    }

    [Fact]
    public async Task ResolveAsync_CacheHit_ReturnsCachedWithoutLookup()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("host.example.com");

        await _resolver.ResolveAsync("1.2.3.4");
        var result = await _resolver.ResolveAsync("1.2.3.4");

        result.Should().Be("host.example.com");
        await _dns.Received(1).LookupPtrAsync("1.2.3.4");
    }

    [Fact]
    public async Task ResolveAsync_TtlExpiry_TriggersNewLookup()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("old.example.com", "new.example.com");

        await _resolver.ResolveAsync("1.2.3.4");

        _now = _now.AddHours(25);

        var result = await _resolver.ResolveAsync("1.2.3.4");

        result.Should().Be("new.example.com");
        await _dns.Received(2).LookupPtrAsync("1.2.3.4");
    }

    [Fact]
    public async Task ResolveAsync_FailedLookup_CachesBriefly()
    {
        _dns.LookupPtrAsync("5.6.7.8").Returns((string?)null);

        var result = await _resolver.ResolveAsync("5.6.7.8");
        result.Should().BeNull();

        await _resolver.ResolveAsync("5.6.7.8");

        await _dns.Received(1).LookupPtrAsync("5.6.7.8");
    }

    [Fact]
    public async Task ResolveAsync_FailedLookup_RetriesAfterShortTtl()
    {
        _dns.LookupPtrAsync("5.6.7.8").Returns((string?)null, "resolved.example.com");

        await _resolver.ResolveAsync("5.6.7.8");

        _now = _now.AddMinutes(6);

        var result = await _resolver.ResolveAsync("5.6.7.8");

        result.Should().Be("resolved.example.com");
        await _dns.Received(2).LookupPtrAsync("5.6.7.8");
    }

    [Fact]
    public async Task ResolveAsync_ConcurrentCalls_CoalesceIntoSingleLookup()
    {
        var tcs = new TaskCompletionSource<string?>();
        _dns.LookupPtrAsync("9.9.9.9").Returns(tcs.Task);

        var task1 = _resolver.ResolveAsync("9.9.9.9");
        var task2 = _resolver.ResolveAsync("9.9.9.9");
        var task3 = _resolver.ResolveAsync("9.9.9.9");

        tcs.SetResult("coalesced.example.com");

        var results = await Task.WhenAll(task1, task2, task3);

        results.Should().AllBe("coalesced.example.com");
        await _dns.Received(1).LookupPtrAsync("9.9.9.9");
    }

    [Fact]
    public async Task ResolveAsync_DifferentIps_ResolvedIndependently()
    {
        _dns.LookupPtrAsync("1.1.1.1").Returns("one.example.com");
        _dns.LookupPtrAsync("2.2.2.2").Returns("two.example.com");

        var r1 = await _resolver.ResolveAsync("1.1.1.1");
        var r2 = await _resolver.ResolveAsync("2.2.2.2");

        r1.Should().Be("one.example.com");
        r2.Should().Be("two.example.com");
    }

    [Fact]
    public void TryResolve_ReturnsNull_WhenNotCached()
    {
        var result = _resolver.TryResolve("1.2.3.4");
        result.Should().BeNull();
    }

    [Fact]
    public async Task TryResolve_ReturnsCachedValue_AfterResolve()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("host.example.com");
        await _resolver.ResolveAsync("1.2.3.4");

        var result = _resolver.TryResolve("1.2.3.4");
        result.Should().Be("host.example.com");
    }

    [Fact]
    public async Task TryResolve_ReturnsNull_AfterTtlExpiry()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("host.example.com");
        await _resolver.ResolveAsync("1.2.3.4");

        _now = _now.AddHours(25);

        _resolver.TryResolve("1.2.3.4").Should().BeNull();
    }

    [Fact]
    public async Task ResolveAsync_SuccessTtl_Is24Hours()
    {
        _dns.LookupPtrAsync("1.2.3.4").Returns("host.example.com");
        await _resolver.ResolveAsync("1.2.3.4");

        _now = _now.AddHours(23).AddMinutes(59);
        _resolver.TryResolve("1.2.3.4").Should().Be("host.example.com");

        _now = _now.AddMinutes(2);
        _resolver.TryResolve("1.2.3.4").Should().BeNull();
    }

    [Fact]
    public async Task ResolveAsync_FailureTtl_Is5Minutes()
    {
        _dns.LookupPtrAsync("5.6.7.8").Returns((string?)null);
        await _resolver.ResolveAsync("5.6.7.8");

        _now = _now.AddMinutes(4).AddSeconds(59);
        await _resolver.ResolveAsync("5.6.7.8");
        await _dns.Received(1).LookupPtrAsync("5.6.7.8");

        _now = _now.AddSeconds(2);
        await _resolver.ResolveAsync("5.6.7.8");
        await _dns.Received(2).LookupPtrAsync("5.6.7.8");
    }
}
