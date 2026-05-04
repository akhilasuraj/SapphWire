import { useState, useEffect, useCallback, useMemo } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface AlertRecord {
  id: number;
  timestamp: string;
  appName: string;
  exePath: string | null;
  remoteIp: string | null;
  remotePort: number | null;
  isRead: boolean;
}

export interface AlertsHookResult {
  alerts: AlertRecord[];
  unreadCount: number;
  alertTimestamps: string[];
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteAlert: (id: number) => Promise<void>;
}

export function useAlerts(connection: HubConnection | null): AlertsHookResult {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  const onSnapshot = useCallback((data: AlertRecord[]) => {
    setAlerts(data);
  }, []);

  const onNewAlert = useCallback((alert: AlertRecord) => {
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("AlertsSnapshot", onSnapshot);
    connection.on("NewAlert", onNewAlert);
    connection.invoke("SubscribeAlerts").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeAlerts").catch(() => {});
      connection.off("AlertsSnapshot", onSnapshot);
      connection.off("NewAlert", onNewAlert);
      setAlerts([]);
    };
  }, [connection, onSnapshot, onNewAlert]);

  const markRead = useCallback(
    async (id: number) => {
      if (!connection) return;
      await connection.invoke("MarkAlertRead", id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
      );
    },
    [connection],
  );

  const markAllRead = useCallback(async () => {
    if (!connection) return;
    await connection.invoke("MarkAllAlertsRead");
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, [connection]);

  const deleteAlert = useCallback(
    async (id: number) => {
      if (!connection) return;
      await connection.invoke("DeleteAlert", id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [connection],
  );

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead).length,
    [alerts],
  );

  const alertTimestamps = useMemo(
    () => alerts.map((a) => a.timestamp),
    [alerts],
  );

  return {
    alerts,
    unreadCount,
    alertTimestamps,
    markRead,
    markAllRead,
    deleteAlert,
  };
}
