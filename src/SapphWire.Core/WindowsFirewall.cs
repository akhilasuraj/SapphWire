using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;

namespace SapphWire.Core;

public class WindowsFirewall : IFirewall
{
    private const string RulePrefix = "SapphWire: Block ";
    private readonly ILogger<WindowsFirewall> _logger;
    private readonly object _lock = new();

    public WindowsFirewall(ILogger<WindowsFirewall> logger)
    {
        _logger = logger;
    }

    public FirewallStateDto GetState()
    {
        lock (_lock)
        {
            try
            {
                var policy = CreatePolicy();
                var blocked = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

                foreach (dynamic rule in policy.Rules)
                {
                    string name = rule.Name;
                    if (!name.StartsWith(RulePrefix, StringComparison.Ordinal))
                        continue;

                    var parsed = ParseRuleName(name);
                    if (parsed == null) continue;

                    string appName = parsed.Value.AppName;
                    string exePath = rule.ApplicationName ?? "";

                    if (!blocked.TryGetValue(appName, out var exes))
                    {
                        exes = new List<string>();
                        blocked[appName] = exes;
                    }
                    if (!string.IsNullOrEmpty(exePath) && !exes.Contains(exePath, StringComparer.OrdinalIgnoreCase))
                        exes.Add(exePath);
                }

                var entries = blocked.Select(kv =>
                    new BlockedAppEntry(kv.Key, kv.Key, kv.Value.AsReadOnly())
                ).ToList();

                return new FirewallStateDto(entries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read firewall state");
                throw;
            }
        }
    }

    public void BlockApp(string appName, IReadOnlyList<string> exePaths)
    {
        lock (_lock)
        {
            var policy = CreatePolicy();
            foreach (var exePath in exePaths)
            {
                CreateRulePair(policy, appName, exePath);
            }
        }
    }

    public void UnblockApp(string appName)
    {
        lock (_lock)
        {
            var policy = CreatePolicy();
            var toRemove = new List<string>();

            foreach (dynamic rule in policy.Rules)
            {
                string name = rule.Name;
                if (!name.StartsWith(RulePrefix, StringComparison.Ordinal))
                    continue;
                var parsed = ParseRuleName(name);
                if (parsed != null && string.Equals(parsed.Value.AppName, appName, StringComparison.OrdinalIgnoreCase))
                    toRemove.Add(name);
            }

            foreach (var name in toRemove)
                policy.Rules.Remove(name);
        }
    }

    public void BlockExe(string appName, string exePath)
    {
        lock (_lock)
        {
            var policy = CreatePolicy();
            CreateRulePair(policy, appName, exePath);
        }
    }

    public void UnblockExe(string appName, string exePath)
    {
        lock (_lock)
        {
            var policy = CreatePolicy();
            var exeBase = Path.GetFileNameWithoutExtension(exePath);
            var toRemove = new List<string>();

            foreach (dynamic rule in policy.Rules)
            {
                string name = rule.Name;
                if (!name.StartsWith(RulePrefix, StringComparison.Ordinal))
                    continue;
                var parsed = ParseRuleName(name);
                if (parsed != null
                    && string.Equals(parsed.Value.AppName, appName, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(parsed.Value.ExeBase, exeBase, StringComparison.OrdinalIgnoreCase))
                {
                    toRemove.Add(name);
                }
            }

            foreach (var name in toRemove)
                policy.Rules.Remove(name);
        }
    }

    private static void CreateRulePair(dynamic policy, string appName, string exePath)
    {
        var exeBase = Path.GetFileNameWithoutExtension(exePath);

        CreateRule(policy, appName, exeBase, exePath, "Out", 2 /* NET_FW_RULE_DIR_OUT */);
        CreateRule(policy, appName, exeBase, exePath, "In", 1 /* NET_FW_RULE_DIR_IN */);
    }

    private static void CreateRule(dynamic policy, string appName, string exeBase,
        string exePath, string dirLabel, int direction)
    {
        var ruleName = $"{RulePrefix}{appName} [{exeBase}] ({dirLabel})";

        try
        {
            policy.Rules.Remove(ruleName);
        }
        catch
        {
            // Rule may not exist yet
        }

        dynamic rule = Activator.CreateInstance(
            Type.GetTypeFromProgID("HNetCfg.FWRule")!)!;

        rule.Name = ruleName;
        rule.Description = $"Blocked by SapphWire";
        rule.ApplicationName = exePath;
        rule.Action = 0; // NET_FW_ACTION_BLOCK
        rule.Direction = direction;
        rule.Profiles = 0x7FFFFFFF; // All profiles (Domain | Private | Public)
        rule.Enabled = true;

        policy.Rules.Add(rule);
    }

    private static dynamic CreatePolicy()
    {
        return Activator.CreateInstance(
            Type.GetTypeFromProgID("HNetCfg.FwPolicy2")!)!;
    }

    internal static (string AppName, string ExeBase, string Direction)? ParseRuleName(string name)
    {
        if (!name.StartsWith(RulePrefix, StringComparison.Ordinal))
            return null;

        var rest = name[RulePrefix.Length..];
        var bracketStart = rest.LastIndexOf('[');
        var bracketEnd = rest.LastIndexOf(']');
        var parenStart = rest.LastIndexOf('(');
        var parenEnd = rest.LastIndexOf(')');

        if (bracketStart < 0 || bracketEnd < 0 || parenStart < 0 || parenEnd < 0)
            return null;

        var appName = rest[..bracketStart].TrimEnd();
        var exeBase = rest[(bracketStart + 1)..bracketEnd];
        var direction = rest[(parenStart + 1)..parenEnd];

        return (appName, exeBase, direction);
    }
}
