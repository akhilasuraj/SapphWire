import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface BlockedAppInfo {
  appId: string;
  displayName: string;
  blockedExePaths: string[];
}

export interface FirewallState {
  blockedApps: BlockedAppInfo[];
  isSuspended: boolean;
}

export interface FirewallHookResult {
  state: { blockedApps: BlockedAppInfo[]; isSuspended: boolean; error: string | null };
  blockApp: (appId: string) => Promise<void>;
  unblockApp: (appId: string) => Promise<void>;
  blockExe: (appId: string, exePath: string) => Promise<void>;
  unblockExe: (appId: string, exePath: string) => Promise<void>;
  isBlocked: (appId: string) => boolean;
  isExeBlocked: (appId: string, exePath: string) => boolean;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
}

async function postFirewall(
  endpoint: string,
  body: { appId: string; exePath?: string },
): Promise<{ ok: boolean; errorText?: string }> {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, errorText: text };
  }
  return { ok: true };
}

export function useFirewall(
  connection: HubConnection | null,
): FirewallHookResult {
  const [blockedApps, setBlockedApps] = useState<BlockedAppInfo[]>([]);
  const [isSuspended, setIsSuspended] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStateUpdate = useCallback((state: FirewallState) => {
    setBlockedApps(state.blockedApps);
    setIsSuspended(state.isSuspended ?? false);
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("FirewallStateSnapshot", onStateUpdate);
    connection.on("FirewallStateChanged", onStateUpdate);
    connection.invoke("SubscribeFirewall").catch(() => {});

    fetch("/api/firewall/state")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FirewallState | null) => {
        if (data) onStateUpdate(data);
      })
      .catch(() => {});

    return () => {
      connection.invoke("UnsubscribeFirewall").catch(() => {});
      connection.off("FirewallStateSnapshot", onStateUpdate);
      connection.off("FirewallStateChanged", onStateUpdate);
      setBlockedApps([]);
      setIsSuspended(false);
      setError(null);
    };
  }, [connection, onStateUpdate]);

  const callFirewall = useCallback(
    async (endpoint: string, body: { appId: string; exePath?: string }) => {
      const result = await postFirewall(endpoint, body);
      if (!result.ok) {
        setError(`Firewall operation failed: ${result.errorText}`);
      } else {
        setError(null);
      }
    },
    [],
  );

  const blockApp = useCallback(
    (appId: string) => callFirewall("/api/firewall/block", { appId }),
    [callFirewall],
  );

  const unblockApp = useCallback(
    (appId: string) => callFirewall("/api/firewall/unblock", { appId }),
    [callFirewall],
  );

  const blockExe = useCallback(
    (appId: string, exePath: string) =>
      callFirewall("/api/firewall/block", { appId, exePath }),
    [callFirewall],
  );

  const unblockExe = useCallback(
    (appId: string, exePath: string) =>
      callFirewall("/api/firewall/unblock", { appId, exePath }),
    [callFirewall],
  );

  const isBlocked = useCallback(
    (appId: string) => blockedApps.some((a) => a.appId === appId),
    [blockedApps],
  );

  const isExeBlocked = useCallback(
    (appId: string, exePath: string) => {
      const app = blockedApps.find((a) => a.appId === appId);
      if (!app) return false;
      return app.blockedExePaths.includes(exePath);
    },
    [blockedApps],
  );

  const suspend = useCallback(
    () => callFirewall("/api/firewall/suspend", { appId: "" }),
    [callFirewall],
  );

  const resume = useCallback(
    () => callFirewall("/api/firewall/resume", { appId: "" }),
    [callFirewall],
  );

  return {
    state: { blockedApps, isSuspended, error },
    blockApp,
    unblockApp,
    blockExe,
    unblockExe,
    isBlocked,
    isExeBlocked,
    suspend,
    resume,
  };
}
