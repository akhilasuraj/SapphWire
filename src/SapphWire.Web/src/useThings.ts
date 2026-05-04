import { useState, useEffect, useCallback } from "react";
import type { HubConnection } from "@microsoft/signalr";
import type { Device, NetworkInfo, ThingsSnapshot, ScanProgress } from "./types";

export interface ThingsState {
  devices: Device[];
  networkInfo: NetworkInfo | null;
  scanning: boolean;
  scanProgress: number;
  lastScanTime: string | null;
  requestScan: () => void;
  setFriendlyName: (mac: string, name: string) => void;
  togglePin: (mac: string) => void;
  forgetDevice: (mac: string) => void;
}

export function useThings(connection: HubConnection | null): ThingsState {
  const [devices, setDevices] = useState<Device[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) return;

    const onSnapshot = (snapshot: ThingsSnapshot) => {
      setDevices(snapshot.devices);
      setNetworkInfo(snapshot.networkInfo);
      setScanning(snapshot.scanning);
      setLastScanTime(snapshot.lastScanTime);
    };

    const onDeviceUpdate = (device: Device) => {
      setDevices((prev) => {
        const idx = prev.findIndex((d) => d.mac === device.mac);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = device;
          return next;
        }
        return [...prev, device];
      });
    };

    const onDeviceRemove = (mac: string) => {
      setDevices((prev) => prev.filter((d) => d.mac !== mac));
    };

    const onNetworkInfoUpdate = (info: NetworkInfo) => {
      setNetworkInfo(info);
    };

    const onScanProgress = (progress: ScanProgress) => {
      setScanning(progress.scanning);
      setScanProgress(progress.progress);
      setLastScanTime(progress.lastScanTime);
    };

    connection.on("ThingsSnapshot", onSnapshot);
    connection.on("DeviceUpdate", onDeviceUpdate);
    connection.on("DeviceRemove", onDeviceRemove);
    connection.on("NetworkInfoUpdate", onNetworkInfoUpdate);
    connection.on("ScanProgress", onScanProgress);
    connection.invoke("SubscribeThings").catch(() => {});

    return () => {
      connection.invoke("UnsubscribeThings").catch(() => {});
      connection.off("ThingsSnapshot", onSnapshot);
      connection.off("DeviceUpdate", onDeviceUpdate);
      connection.off("DeviceRemove", onDeviceRemove);
      connection.off("NetworkInfoUpdate", onNetworkInfoUpdate);
      connection.off("ScanProgress", onScanProgress);
      setDevices([]);
      setNetworkInfo(null);
      setScanning(false);
      setScanProgress(0);
      setLastScanTime(null);
    };
  }, [connection]);

  const requestScan = useCallback(() => {
    connection?.invoke("StartScan").catch(() => {});
  }, [connection]);

  const setFriendlyName = useCallback(
    (mac: string, name: string) => {
      connection?.invoke("SetFriendlyName", mac, name).catch(() => {});
    },
    [connection],
  );

  const togglePin = useCallback(
    (mac: string) => {
      connection?.invoke("TogglePin", mac).catch(() => {});
    },
    [connection],
  );

  const forgetDevice = useCallback(
    (mac: string) => {
      connection?.invoke("ForgetDevice", mac).catch(() => {});
    },
    [connection],
  );

  return {
    devices,
    networkInfo,
    scanning,
    scanProgress,
    lastScanTime,
    requestScan,
    setFriendlyName,
    togglePin,
    forgetDevice,
  };
}
