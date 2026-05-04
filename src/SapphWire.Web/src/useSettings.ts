import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";
import type { AppSettings, SettingsInfo } from "./types";

const DEFAULT_SETTINGS: AppSettings = {
  autostartEnabled: true,
  toastEnabled: true,
};

export interface SettingsHookResult {
  settings: AppSettings;
  info: SettingsInfo | null;
  isPaused: boolean;
  setAutostart: (enabled: boolean) => Promise<void>;
  setToastEnabled: (enabled: boolean) => Promise<void>;
  clearData: () => Promise<void>;
  pauseMonitoring: () => Promise<void>;
  resumeMonitoring: () => Promise<void>;
}

export function useSettings(
  connection: HubConnection | null,
): SettingsHookResult {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const onSnapshot = useCallback((data: SettingsInfo) => {
    setSettings(data.settings);
    setInfo(data);
  }, []);

  const onChanged = useCallback((data: AppSettings) => {
    setSettings(data);
  }, []);

  const onMonitoringState = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("SettingsSnapshot", onSnapshot);
    connection.on("SettingsChanged", onChanged);
    connection.on("MonitoringStateChanged", onMonitoringState);
    connection.invoke("SubscribeSettings").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeSettings").catch(() => {});
      connection.off("SettingsSnapshot", onSnapshot);
      connection.off("SettingsChanged", onChanged);
      connection.off("MonitoringStateChanged", onMonitoringState);
      setSettings(DEFAULT_SETTINGS);
      setInfo(null);
      setIsPaused(false);
    };
  }, [connection, onSnapshot, onChanged, onMonitoringState]);

  const setAutostart = useCallback(
    async (enabled: boolean) => {
      if (!connection) return;
      await connection.invoke("SetAutostart", enabled);
    },
    [connection],
  );

  const setToastEnabled = useCallback(
    async (enabled: boolean) => {
      if (!connection) return;
      await connection.invoke("SetToastEnabled", enabled);
    },
    [connection],
  );

  const clearData = useCallback(async () => {
    if (!connection) return;
    await connection.invoke("ClearData");
  }, [connection]);

  const pauseMonitoring = useCallback(async () => {
    if (!connection) return;
    await connection.invoke("PauseMonitoring");
  }, [connection]);

  const resumeMonitoring = useCallback(async () => {
    if (!connection) return;
    await connection.invoke("ResumeMonitoring");
  }, [connection]);

  return {
    settings,
    info,
    isPaused,
    setAutostart,
    setToastEnabled,
    clearData,
    pauseMonitoring,
    resumeMonitoring,
  };
}
