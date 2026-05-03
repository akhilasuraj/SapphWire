using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class OuiDatabaseTests
{
    private static OuiDatabase CreateTestDb() =>
        new(new Dictionary<string, string>
        {
            ["005056"] = "VMware, Inc.",
            ["00505E"] = "Cisco",
            ["AABBCC"] = "Test Corp",
        });

    [Fact]
    public void LookupVendor_MatchesColonSeparatedMac()
    {
        var db = CreateTestDb();
        db.LookupVendor("00:50:56:12:34:56").Should().Be("VMware, Inc.");
    }

    [Fact]
    public void LookupVendor_MatchesDashSeparatedMac()
    {
        var db = CreateTestDb();
        db.LookupVendor("00-50-56-AA-BB-CC").Should().Be("VMware, Inc.");
    }

    [Fact]
    public void LookupVendor_MatchesPlainMac()
    {
        var db = CreateTestDb();
        db.LookupVendor("005056AABBCC").Should().Be("VMware, Inc.");
    }

    [Fact]
    public void LookupVendor_CaseInsensitive()
    {
        var db = CreateTestDb();
        db.LookupVendor("aa:bb:cc:11:22:33").Should().Be("Test Corp");
    }

    [Fact]
    public void LookupVendor_ReturnsNull_ForUnknownOui()
    {
        var db = CreateTestDb();
        db.LookupVendor("FF:FF:FF:00:00:00").Should().BeNull();
    }

    [Fact]
    public void LookupVendor_ReturnsNull_ForEmptyString()
    {
        var db = CreateTestDb();
        db.LookupVendor("").Should().BeNull();
    }

    [Fact]
    public void LookupVendor_ReturnsNull_ForNullString()
    {
        var db = CreateTestDb();
        db.LookupVendor(null!).Should().BeNull();
    }

    [Fact]
    public void LookupVendor_ReturnsNull_ForShortMac()
    {
        var db = CreateTestDb();
        db.LookupVendor("00:50").Should().BeNull();
    }

    [Fact]
    public void LookupVendor_DotSeparatedMac()
    {
        var db = CreateTestDb();
        db.LookupVendor("0050.56AB.CDEF").Should().Be("VMware, Inc.");
    }

    [Fact]
    public void LoadFromCsv_ParsesEntries()
    {
        var csv = """
            00-50-56,VMware Inc.
            AA-BB-CC,Test Corp
            """;
        var db = OuiDatabase.LoadFromCsv(csv);

        db.LookupVendor("00:50:56:00:00:00").Should().Be("VMware Inc.");
        db.LookupVendor("AA:BB:CC:11:22:33").Should().Be("Test Corp");
    }

    [Fact]
    public void LoadFromCsv_SkipsEmptyLines()
    {
        var csv = "\n00-50-56,VMware\n\n";
        var db = OuiDatabase.LoadFromCsv(csv);
        db.LookupVendor("00:50:56:00:00:00").Should().Be("VMware");
    }

    [Fact]
    public void DistinguishesSimilarPrefixes()
    {
        var db = CreateTestDb();
        db.LookupVendor("00:50:56:00:00:00").Should().Be("VMware, Inc.");
        db.LookupVendor("00:50:5E:00:00:00").Should().Be("Cisco");
    }
}
