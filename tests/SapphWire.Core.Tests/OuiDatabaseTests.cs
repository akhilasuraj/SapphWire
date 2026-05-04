using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class OuiDatabaseTests
{
    private OuiDatabase CreateLoaded(string csv)
    {
        var db = new OuiDatabase();
        using var reader = new StringReader(csv);
        db.LoadFromCsv(reader);
        return db;
    }

    [Fact]
    public void LoadFromCsv_ParsesEntries()
    {
        var csv = "001A2B,\"Acme Corp\"\n003C4D,\"Beta Inc\"";
        var db = CreateLoaded(csv);
        db.Count.Should().Be(2);
    }

    [Fact]
    public void LoadFromCsv_SkipsCommentsAndBlankLines()
    {
        var csv = "# header\n\n001A2B,\"Acme Corp\"\n  \n003C4D,\"Beta Inc\"";
        var db = CreateLoaded(csv);
        db.Count.Should().Be(2);
    }

    [Fact]
    public void LoadFromCsv_SkipsLinesWithoutComma()
    {
        var csv = "no-comma-here\n001A2B,\"Acme Corp\"";
        var db = CreateLoaded(csv);
        db.Count.Should().Be(1);
    }

    [Fact]
    public void Lookup_FindsVendorByColonSeparatedMac()
    {
        var db = CreateLoaded("001A2B,\"Acme Corp\"");
        db.Lookup("00:1A:2B:CC:DD:EE").Should().Be("Acme Corp");
    }

    [Fact]
    public void Lookup_FindsVendorByDashSeparatedMac()
    {
        var db = CreateLoaded("001A2B,\"Acme Corp\"");
        db.Lookup("00-1A-2B-CC-DD-EE").Should().Be("Acme Corp");
    }

    [Fact]
    public void Lookup_IsCaseInsensitive()
    {
        var db = CreateLoaded("001a2b,\"Acme Corp\"");
        db.Lookup("00:1A:2B:FF:FF:FF").Should().Be("Acme Corp");
    }

    [Fact]
    public void Lookup_ReturnsNullForUnknownOui()
    {
        var db = CreateLoaded("001A2B,\"Acme Corp\"");
        db.Lookup("FF:FF:FF:00:00:00").Should().BeNull();
    }

    [Fact]
    public void Lookup_ReturnsNullForNullOrEmptyMac()
    {
        var db = CreateLoaded("001A2B,\"Acme Corp\"");
        db.Lookup("").Should().BeNull();
        db.Lookup(null!).Should().BeNull();
    }

    [Fact]
    public void Lookup_HandlesShortPrefix()
    {
        var db = CreateLoaded("AABBCC,\"Short Corp\"");
        db.Lookup("AA:BB:CC").Should().Be("Short Corp");
    }

    [Fact]
    public void LoadFromCsv_FirstEntryWinsOnDuplicate()
    {
        var csv = "001A2B,\"First\"\n001A2B,\"Second\"";
        var db = CreateLoaded(csv);
        db.Lookup("00:1A:2B:00:00:00").Should().Be("First");
    }
}
