import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useThings } from "../useThings";
import type { Device } from "../types";
import { Sticker, colorFromString } from "./ui/Sticker";
import {
  PcIcon,
  GatewayIcon,
  PhoneIcon,
  WifiIcon,
  PlusIcon,
} from "./ui/icons";

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

function deviceGlyph(device: Device) {
  if (device.isThisPc) return PcIcon;
  if (device.isGateway) return GatewayIcon;
  return PhoneIcon;
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "var(--paper)",
  boxShadow: "none",
  border: "none",
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 8,
};

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
  const filtered =
    filter === "active" ? devices.filter((d) => d.online) : devices;
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
    const name = prompt(
      "Enter friendly name:",
      contextMenu.device.friendlyName ?? "",
    );
    if (name !== null) {
      setFriendlyName(contextMenu.device.mac, name);
    }
    setContextMenu(null);
  };

  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Things on Your Network</h1>
        {networkInfo && (
          <span className="sticker-tag" style={{ background: "var(--mint)" }}>
            {networkInfo.ssid} · {networkInfo.connectionState}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div className="pill-row">
          <button
            data-testid="filter-active"
            onClick={() => setFilter("active")}
            className={`pill ${filter === "active" ? "active" : ""}`}
            style={
              filter === "active"
                ? ({ "--p-active": "var(--pink)" } as React.CSSProperties)
                : undefined
            }
          >
            Active{" "}
            <span
              className="mono"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 8,
                marginLeft: 6,
              }}
            >
              {activeCount}
            </span>
          </button>
          <button
            data-testid="filter-all"
            onClick={() => setFilter("all")}
            className={`pill ${filter === "all" ? "active" : ""}`}
            style={
              filter === "all"
                ? ({ "--p-active": "var(--pink)" } as React.CSSProperties)
                : undefined
            }
          >
            All{" "}
            <span
              className="mono"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 8,
                marginLeft: 6,
              }}
            >
              {devices.length}
            </span>
          </button>
        </div>
        <button
          onClick={requestScan}
          disabled={scanning}
          className="pill"
          style={{ background: "var(--butter)" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {PlusIcon}
            {scanning ? `Scanning ${scanProgress}%` : "Scan"}
          </span>
        </button>
      </div>

      {networkInfo ? (
        <div className="card" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Sticker color="sky" size="lg" rotate={-4} glyph={WifiIcon} />
              <div>
                <div
                  style={{
                    fontFamily: "Fredoka",
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {networkInfo.ssid}
                </div>
                <div className="row-sub">
                  <span>{networkInfo.connectionState}</span>
                  <span> · {activeCount} devices online</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                position: "relative",
              }}
            >
              <button
                data-testid="network-info-toggle"
                onClick={() => setShowNetworkInfo(!showNetworkInfo)}
                className="icon-btn"
                style={{ width: 32, height: 32 }}
                aria-label="Network info"
              >
                <span
                  style={{
                    fontFamily: "Fredoka",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  i
                </span>
              </button>
              {showNetworkInfo && (
                <div
                  className="card-tight"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 44,
                    background: "var(--paper)",
                    minWidth: 240,
                    zIndex: 10,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "4px 12px",
                    }}
                  >
                    <span className="row-sub">Gateway</span>
                    <span className="mono">{networkInfo.gatewayIp}</span>
                    <span className="row-sub">Your IP</span>
                    <span className="mono">{networkInfo.localIp}</span>
                    <span className="row-sub">Subnet</span>
                    <span className="mono">{networkInfo.subnetMask}</span>
                    <span className="row-sub">DNS</span>
                    <span className="mono">
                      {networkInfo.dnsServers.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginBottom: 18,
            textAlign: "center",
            color: "var(--ink-mute)",
          }}
        >
          No network detected
        </div>
      )}

      {lastScanTime && (
        <div
          data-testid="last-scan-time"
          className="row-sub"
          style={{ marginBottom: 12, textAlign: "right" }}
        >
          Scanned {formatLastSeen(lastScanTime)}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <span className="row-sub">
            {filter === "active"
              ? "No active devices"
              : "No devices discovered"}
          </span>
        </div>
      ) : (
        <div className="grid-3">
          {sorted.map((device) => (
            <div
              key={device.mac}
              data-testid="device-row"
              onContextMenu={(e) => handleContextMenu(e, device)}
              className="card-tight"
              style={{ position: "relative", cursor: "default" }}
            >
              {device.online && (
                <span
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--mint-deep)",
                    border: "2.5px solid var(--ink)",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Sticker
                  color={colorFromString(device.mac)}
                  size="lg"
                  rotate={-3}
                  glyph={deviceGlyph(device)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Fredoka",
                      fontWeight: 600,
                      fontSize: 17,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {device.friendlyName ?? device.hostname}
                    {device.pinned && (
                      <span style={{ fontSize: 12 }}>📌</span>
                    )}
                  </div>
                  <div className="row-sub">
                    {device.isThisPc
                      ? "This PC"
                      : device.isGateway
                        ? "Gateway"
                        : device.deviceType !== "Unknown"
                          ? device.deviceType
                          : "Device"}{" "}
                    · {device.online ? "online" : "offline"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="chip mono" style={{ background: "var(--cream)" }}>
                  {device.ip}
                </span>
                <span className="chip mono" style={{ background: "var(--cream)" }}>
                  {device.mac}
                </span>
                {device.vendor && (
                  <span className="chip" style={{ background: "var(--cream)" }}>
                    {device.vendor}
                  </span>
                )}
              </div>
              <div className="doodle-line" style={{ margin: "10px 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="row-sub">
                  Last seen <b>{formatLastSeen(device.lastSeen)}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="card-tight"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "var(--paper)",
            minWidth: 200,
            padding: 6,
            zIndex: 50,
          }}
        >
          <button onClick={handleFriendlyName} style={menuItemStyle}>
            Assign friendly name
          </button>
          <button
            onClick={() => {
              togglePin(contextMenu.device.mac);
              setContextMenu(null);
            }}
            style={menuItemStyle}
          >
            {contextMenu.device.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => {
              forgetDevice(contextMenu.device.mac);
              setContextMenu(null);
            }}
            style={{ ...menuItemStyle, color: "var(--coral-deep)" }}
          >
            Forget
          </button>
        </div>
      )}
    </div>
  );
}
