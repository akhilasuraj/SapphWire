using FluentAssertions;

namespace SapphWire.Core.Tests;

public class FirewallOwnershipTagTests
{
    [Theory]
    [InlineData("SapphWire: Block Chrome [chrome] (Out)", "Chrome", "chrome", "Out")]
    [InlineData("SapphWire: Block Chrome [chrome] (In)", "Chrome", "chrome", "In")]
    [InlineData("SapphWire: Block Free Download Manager [fdm] (Out)", "Free Download Manager", "fdm", "Out")]
    public void ParseRuleName_extracts_app_exe_direction(string ruleName, string expectedApp, string expectedExe, string expectedDir)
    {
        var result = WindowsFirewall.ParseRuleName(ruleName);

        result.Should().NotBeNull();
        result!.Value.AppName.Should().Be(expectedApp);
        result!.Value.ExeBase.Should().Be(expectedExe);
        result!.Value.Direction.Should().Be(expectedDir);
    }

    [Theory]
    [InlineData("Some Random Rule")]
    [InlineData("")]
    [InlineData("SapphWire: Block incomplete")]
    public void ParseRuleName_returns_null_for_non_owned_rules(string ruleName)
    {
        WindowsFirewall.ParseRuleName(ruleName).Should().BeNull();
    }

    [Fact]
    public void ParseRuleName_roundtrips_rule_name_format()
    {
        var appName = "TestApp";
        var exeBase = "testapp";
        var direction = "Out";
        var ruleName = $"SapphWire: Block {appName} [{exeBase}] ({direction})";

        var result = WindowsFirewall.ParseRuleName(ruleName);

        result.Should().NotBeNull();
        result!.Value.AppName.Should().Be(appName);
        result!.Value.ExeBase.Should().Be(exeBase);
        result!.Value.Direction.Should().Be(direction);
    }
}

public class StubFirewall : IFirewall
{
    private readonly Dictionary<string, List<string>> _blocked = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, bool> _ruleEnabled = new(StringComparer.OrdinalIgnoreCase);
    private bool _suspended;

    public bool IsSuspended => _suspended;

    public FirewallStateDto GetState()
    {
        var entries = _blocked.Select(kv =>
            new BlockedAppEntry(kv.Key, kv.Key, kv.Value.AsReadOnly())
        ).ToList();
        return new FirewallStateDto(entries, _suspended);
    }

    public void BlockApp(string appName, IReadOnlyList<string> exePaths)
    {
        if (!_blocked.ContainsKey(appName))
            _blocked[appName] = new List<string>();
        foreach (var exe in exePaths)
        {
            var key = $"{appName}|{exe}";
            _ruleEnabled[key] = !_suspended;
            if (!_blocked[appName].Contains(exe, StringComparer.OrdinalIgnoreCase))
                _blocked[appName].Add(exe);
        }
    }

    public void UnblockApp(string appName)
    {
        if (_blocked.TryGetValue(appName, out var exes))
        {
            foreach (var exe in exes)
                _ruleEnabled.Remove($"{appName}|{exe}");
            _blocked.Remove(appName);
        }
    }

    public void BlockExe(string appName, string exePath)
    {
        BlockApp(appName, new[] { exePath });
    }

    public void UnblockExe(string appName, string exePath)
    {
        var key = $"{appName}|{exePath}";
        _ruleEnabled.Remove(key);
        if (_blocked.TryGetValue(appName, out var exes))
        {
            exes.RemoveAll(e => string.Equals(e, exePath, StringComparison.OrdinalIgnoreCase));
            if (exes.Count == 0)
                _blocked.Remove(appName);
        }
    }

    public void Suspend()
    {
        if (_suspended) return;
        foreach (var key in _ruleEnabled.Keys.ToList())
            _ruleEnabled[key] = false;
        _suspended = true;
    }

    public void Resume()
    {
        if (!_suspended) return;
        foreach (var key in _ruleEnabled.Keys.ToList())
            _ruleEnabled[key] = true;
        _suspended = false;
    }

    public void RemoveAllRules()
    {
        _blocked.Clear();
        _ruleEnabled.Clear();
    }

    public bool IsRuleEnabled(string appName, string exePath) =>
        _ruleEnabled.TryGetValue($"{appName}|{exePath}", out var enabled) && enabled;
}

public class FirewallSuspendResumeTests
{
    private readonly StubFirewall _fw = new();

    [Fact]
    public void Initially_not_suspended()
    {
        _fw.IsSuspended.Should().BeFalse();
        _fw.GetState().IsSuspended.Should().BeFalse();
    }

    [Fact]
    public void Suspend_sets_IsSuspended_true()
    {
        _fw.Suspend();

        _fw.IsSuspended.Should().BeTrue();
        _fw.GetState().IsSuspended.Should().BeTrue();
    }

    [Fact]
    public void Resume_sets_IsSuspended_false()
    {
        _fw.Suspend();
        _fw.Resume();

        _fw.IsSuspended.Should().BeFalse();
        _fw.GetState().IsSuspended.Should().BeFalse();
    }

    [Fact]
    public void Suspend_is_idempotent()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });

        _fw.Suspend();
        _fw.Suspend();
        _fw.Suspend();

        _fw.IsSuspended.Should().BeTrue();
        _fw.GetState().BlockedApps.Should().HaveCount(1);
    }

    [Fact]
    public void Resume_is_idempotent()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });
        _fw.Suspend();

        _fw.Resume();
        _fw.Resume();
        _fw.Resume();

        _fw.IsSuspended.Should().BeFalse();
        _fw.IsRuleEnabled("Chrome", @"C:\chrome.exe").Should().BeTrue();
    }

    [Fact]
    public void Resume_without_prior_suspend_is_noop()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });

        _fw.Resume();

        _fw.IsSuspended.Should().BeFalse();
        _fw.IsRuleEnabled("Chrome", @"C:\chrome.exe").Should().BeTrue();
    }

    [Fact]
    public void Suspend_disables_all_owned_rules()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });
        _fw.BlockApp("Discord", new[] { @"C:\discord.exe" });

        _fw.Suspend();

        _fw.IsRuleEnabled("Chrome", @"C:\chrome.exe").Should().BeFalse();
        _fw.IsRuleEnabled("Discord", @"C:\discord.exe").Should().BeFalse();
    }

    [Fact]
    public void Resume_re_enables_all_owned_rules()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });
        _fw.BlockApp("Discord", new[] { @"C:\discord.exe" });
        _fw.Suspend();

        _fw.Resume();

        _fw.IsRuleEnabled("Chrome", @"C:\chrome.exe").Should().BeTrue();
        _fw.IsRuleEnabled("Discord", @"C:\discord.exe").Should().BeTrue();
    }

    [Fact]
    public void Stored_intent_preserved_across_suspend_resume_cycle()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe", @"C:\helper.exe" });
        _fw.BlockApp("Discord", new[] { @"C:\discord.exe" });

        var stateBefore = _fw.GetState();

        _fw.Suspend();
        _fw.Resume();

        var stateAfter = _fw.GetState();

        stateAfter.BlockedApps.Should().HaveCount(stateBefore.BlockedApps.Count);
        foreach (var entry in stateBefore.BlockedApps)
        {
            var restored = stateAfter.BlockedApps.First(a => a.AppId == entry.AppId);
            restored.BlockedExePaths.Should().BeEquivalentTo(entry.BlockedExePaths);
        }
    }

    [Fact]
    public void RemoveAllRules_clears_all_owned_rules()
    {
        _fw.BlockApp("Chrome", new[] { @"C:\chrome.exe" });
        _fw.BlockApp("Discord", new[] { @"C:\discord.exe" });

        _fw.RemoveAllRules();

        _fw.GetState().BlockedApps.Should().BeEmpty();
    }

    [Fact]
    public void GetState_includes_IsSuspended_flag()
    {
        var state1 = _fw.GetState();
        state1.IsSuspended.Should().BeFalse();

        _fw.Suspend();
        var state2 = _fw.GetState();
        state2.IsSuspended.Should().BeTrue();

        _fw.Resume();
        var state3 = _fw.GetState();
        state3.IsSuspended.Should().BeFalse();
    }
}
