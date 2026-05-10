import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";

export interface RankedApp {
  appId: string;
  cumulativeBytes: number;
  currentUp: number;
  currentDown: number;
  lastSeen: string;
  isInstalledOnly: boolean;
}

const POLL_INTERVAL = 5000;

export function useRankedApps(
  connection: HubConnection | null,
  includeInstalled: boolean,
): RankedApp[] {
  const [ranked, setRanked] = useState<RankedApp[]>([]);

  const poll = useCallback(() => {
    if (!connection) return;
    connection
      .invoke<RankedApp[]>("GetRankedApps", includeInstalled)
      .then(setRanked)
      .catch(() => {});
  }, [connection, includeInstalled]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  return ranked;
}
