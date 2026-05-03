using FluentAssertions;
using SapphWire.Core;

namespace SapphWire.Core.Tests;

public class AppGrouperTests
{
    [Fact]
    public void GetAppKey_UsesProductName_WhenAvailable()
    {
        var result = AppGrouper.GetAppKey("Discord", @"C:\Program Files\Discord\Discord.exe", "Discord");
        result.Should().Be("Discord");
    }

    [Fact]
    public void GetAppKey_TrimsProductName()
    {
        var result = AppGrouper.GetAppKey("  Spotify  ", @"C:\Program Files\Spotify\spotify.exe", "spotify");
        result.Should().Be("Spotify");
    }

    [Fact]
    public void GetAppKey_SkipsGenericWindowsProductName()
    {
        var result = AppGrouper.GetAppKey(
            "Microsoft® Windows® Operating System",
            @"C:\Windows\System32\svchost.exe",
            "svchost");
        result.Should().Be("svchost");
    }

    [Fact]
    public void GetAppKey_SkipsMicrosoftWindows()
    {
        var result = AppGrouper.GetAppKey(
            "Microsoft Windows",
            @"C:\Windows\System32\taskhostw.exe",
            "taskhostw");
        result.Should().Be("taskhostw");
    }

    [Fact]
    public void GetAppKey_SkipsWindows()
    {
        var result = AppGrouper.GetAppKey("Windows", null, "explorer");
        result.Should().Be("explorer");
    }

    [Fact]
    public void GetAppKey_SkipsDotNet()
    {
        var result = AppGrouper.GetAppKey(
            "Microsoft .NET",
            @"C:\Program Files\dotnet\dotnet.exe",
            "dotnet");
        result.Should().Be("dotnet");
    }

    [Fact]
    public void GetAppKey_FallsBackToInstallDir_WhenProductNameEmpty()
    {
        var result = AppGrouper.GetAppKey(
            "",
            @"C:\Program Files\Helium\helium.exe",
            "helium");
        result.Should().Be("Helium");
    }

    [Fact]
    public void GetAppKey_FallsBackToInstallDir_WhenProductNameNull()
    {
        var result = AppGrouper.GetAppKey(
            null,
            @"C:\Program Files\CustomApp\bin\app.exe",
            "app");
        result.Should().Be("CustomApp");
    }

    [Fact]
    public void GetAppKey_FallsBackToInstallDir_ProgramFilesX86()
    {
        var result = AppGrouper.GetAppKey(
            null,
            @"C:\Program Files (x86)\Steam\steam.exe",
            "steam");
        result.Should().Be("Steam");
    }

    [Fact]
    public void GetAppKey_FallsBackToExeBasename_WhenNoInstallDir()
    {
        var result = AppGrouper.GetAppKey(null, @"C:\Users\me\Downloads\tool.exe", "tool");
        result.Should().Be("tool");
    }

    [Fact]
    public void GetAppKey_FallsBackToExeBasename_WhenNoExePath()
    {
        var result = AppGrouper.GetAppKey(null, null, "myapp");
        result.Should().Be("myapp");
    }

    [Fact]
    public void GetAppKey_FallsBackToExeBasename_WhenWhitespaceProductNameAndNoInstallDir()
    {
        var result = AppGrouper.GetAppKey("  ", @"D:\Games\game.exe", "game");
        result.Should().Be("game");
    }

    [Fact]
    public void GetAppKey_ProductNameOverride_HeliumStyle()
    {
        var result = AppGrouper.GetAppKey(
            "Helium",
            @"C:\Program Files\SomeOtherDir\helium.exe",
            "helium");
        result.Should().Be("Helium");
    }

    [Fact]
    public void GetAppKey_ProductNameTakesPrecedenceOverInstallDir()
    {
        var result = AppGrouper.GetAppKey(
            "Google Chrome",
            @"C:\Program Files\Google\Chrome\Application\chrome.exe",
            "chrome");
        result.Should().Be("Google Chrome");
    }

    [Fact]
    public void GetAppKey_CaseInsensitiveGenericFilter()
    {
        var result = AppGrouper.GetAppKey("microsoft windows", null, "svchost");
        result.Should().Be("svchost");
    }

    [Fact]
    public void GetAppKey_AcceptsProcessInfoOverload()
    {
        var info = new ProcessInfo("chrome", @"C:\Program Files\Google\Chrome\chrome.exe",
            "Google Chrome", "Google Chrome browser", "Google LLC");
        var result = AppGrouper.GetAppKey(info);
        result.Should().Be("Google Chrome");
    }
}
