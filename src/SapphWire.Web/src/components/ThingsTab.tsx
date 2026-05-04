import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useThings } from "../useThings";
import type { Device } from "../types";

interface Props {
  connection: HubConnection | null;
}

type Filter = "active" | "all";

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function sortDevices(devices: Device[]): Device[] {
  return [...devices].sort((a, b) => {
    if (a.isThisPc && !b.isThisPc) return -1;
    if (!a.isThisPc && b.isThisPc) return 1;
    if (a.isGateway && !b.isGateway) return -1;
    if (!a.isGateway && b.isGateway) return 1;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.hostname.localeCompare(b.hostname);
  });
}

function deviceIcon(device: Device): string {
  if (device.isThisPc) return "💻";
  if (device.isGateway) return "🌐";
  return "📱";
}

export default function ThingsTab({ connection }: Props) {
  const state = useThings(connection);
  const {
    devices,
    networkInfo,
    scanning,
    scanProgress,
    lastScanTime,
    requestScan,
    setFriendlyName,
    togglePin,
    forgetDevice,
  } = state;

  const [filter, setFilter] = useState<Filter>("active");
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    device: Device;
  } | null>(null);
  const activeCount = devices.filter((d) => d.online).length;
  const filtered = filter === "active" ? devices.filter((d) => d.online) : devices;
  const sorted = sortDevices(filtered);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, device: Device) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, device });
  };

  const handleFriendlyName = () => {
    if (!contextMenu) return;
    const name = prompt("Enter friendly name:", contextMenu.device.friendlyName ?? "");
    if (name !== null) {
      setFriendlyName(contextMenu.device.mac, name);
    }
    setContextMenu(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      {networkInfo ? (
        <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium">{networkInfo.ssid}</span>
            <span className="text-sm text-gray-400">{networkInfo.connectionState}</span>
          </div>
          <div className="relative">
            <button
              data-testid="network-info-toggle"
              onClick={() => setShowNetworkInfo(!showNetworkInfo)}
              className="text-gray-400 hover:text-gray-100 w-6 h-6 flex items-center justify-center rounded-full border border-gray-700 text-xs"
            >
              i
            </button>
            {showNetworkInfo && (
              <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm min-w-[200px] z-10 shadow-lg">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="text-gray-400">Gateway</span>
                  <span>{networkInfo.gatewayIp}</span>
                  <span className="text-gray-400">Your IP</span>
                  <span>{networkInfo.localIp}</span>
                  <span className="text-gray-400">Subnet</span>
                  <span>{networkInfo.subnetMask}</span>
                  <span className="text-gray-400">DNS</span>
                  <span>{networkInfo.dnsServers.join(", ")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-900 rounded-lg px-4 py-3 border border-gray-800 text-gray-500">
          No network detected
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            data-testid="filter-active"
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === "active"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-100"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            data-testid="filter-all"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-100"
            }`}
          >
            All ({devices.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          {lastScanTime && (
            <span data-testid="last-scan-time" className="text-xs text-gray-500">
              Scanned {formatLastSeen(lastScanTime)}
            </span>
          )}
          <button
            onClick={requestScan}
            disabled={scanning}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              scanning
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {scanning ? `Scanning ${scanProgress}%` : "Scan"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="pb-2 font-medium">Device</th>
              <th className="pb-2 font-medium">Details</th>
              <th className="pb-2 font-medium text-right">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((device) => (
              <tr
                key={device.mac}
                data-testid="device-row"
                onContextMenu={(e) => handleContextMenu(e, device)}
                className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-default"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{deviceIcon(device)}</span>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {device.friendlyName ?? device.hostname}
                        {device.pinned && (
                          <span className="text-xs text-yellow-500">&#x1F4CC;</span>
                        )}
                      </div>
                      {device.friendlyName && (
                        <div className="text-xs text-gray-500">{device.hostname}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="text-sm space-y-0.5">
                    <div>{device.ip}</div>
                    <div className="text-gray-500 text-xs">{device.mac}</div>
                    <div className="text-gray-500 text-xs">{device.vendor}</div>
                    {device.deviceType !== "Unknown" && (
                      <div className="text-gray-500 text-xs">{device.deviceType}</div>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    {device.online ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-600" />
                    )}
                    <span className={device.online ? "text-gray-300" : "text-gray-500"}>
                      {formatLastSeen(device.lastSeen)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-500">
            {filter === "active" ? "No active devices" : "No devices discovered"}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleFriendlyName}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            Assign friendly name
          </button>
          <button
            onClick={() => {
              togglePin(contextMenu.device.mac);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            {contextMenu.device.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => {
              forgetDevice(contextMenu.device.mac);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
          >
            Forget
          </button>
        </div>
      )}
    </div>
  );
}
