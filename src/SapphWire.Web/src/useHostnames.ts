import { useState, useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";

export function useHostnames(
  connection: HubConnection | null,
  ips: string[],
): Record<string, string> {
  const [hostnames, setHostnames] = useState<Record<string, string>>({});
  const prevKey = useRef("");

  useEffect(() => {
    const key = ips.slice().sort().join(",");
    if (!connection || ips.length === 0 || key === prevKey.current) return;
    prevKey.current = key;

    connection
      .invoke("ResolveHostnames", ips)
      .then((result: Record<string, string>) => {
        setHostnames((prev) => ({ ...prev, ...result }));
      })
      .catch(() => {});
  }, [connection, ips]);

  return hostnames;
}
