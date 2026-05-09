import { useState, useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useAlerts, type AlertRecord } from "../useAlerts";
import { useFirewall } from "../useFirewall";
import { Sticker } from "./ui/Sticker";
import { AlertGlyph, WarningTriangle, ChevronDown } from "./ui/icons";

interface Props {
  connection: HubConnection | null;
  onNavigateToAlert?: (alertId: number) => void;
  onNavigateToFirewall?: (appName: string) => void;
}

type AlertPill = "Important" | "All";
const ALERT_PILLS: AlertPill[] = ["Important", "All"];

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const alertDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (alertDate.getTime() === today.getTime()) return "Today";
  if (alertDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AlertRow({
  alert,
  isExpanded,
  onToggle,
  onBlock,
  onDelete,
  onShowInFirewall,
  onOpenFileLocation,
}: {
  alert: AlertRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onShowInFirewall: () => void;
  onOpenFileLocation: () => void;
}) {
  return (
    <>
      <div
        data-testid={`alert-row-${alert.id}`}
        onClick={onToggle}
        className="row"
        style={{
          cursor: "pointer",
          background: !alert.isRead ? "var(--cream-2)" : "var(--paper)",
        }}
      >
        <div style={{ position: "relative" }}>
          <Sticker color="butter" size="md" glyph={AlertGlyph} />
          {!alert.isRead && (
            <span
              className="sticker-tag"
              style={{
                position: "absolute",
                top: -8,
                left: -10,
                background: "var(--mint-deep)",
                fontSize: 8,
                padding: "2px 6px",
                transform: "rotate(-10deg)",
              }}
            >
              NEW
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-name">{alert.appName}</div>
          <div
            className="row-sub mono"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            {alert.remoteIp && alert.remotePort
              ? `→ ${alert.remoteIp}:${alert.remotePort}`
              : "First network activity"}
          </div>
        </div>
        <span className="mono row-sub" style={{ fontSize: 11 }}>
          {formatTime(alert.timestamp)}
        </span>
        {ChevronDown(isExpanded)}
      </div>

      {isExpanded && (
        <div
          className="card-tight"
          style={{
            marginTop: -4,
            background: "var(--cream)",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto 1fr",
              gap: "6px 14px",
              fontSize: 12,
            }}
          >
            <span className="row-sub">Destination IP</span>
            <span className="mono">{alert.remoteIp ?? "—"}</span>
            <span className="row-sub">Port</span>
            <span className="mono">
              {alert.remotePort != null ? alert.remotePort : "—"}
            </span>
            {alert.exePath && (
              <>
                <span className="row-sub">Exe</span>
                <span
                  className="mono"
                  style={{ gridColumn: "2 / span 3", wordBreak: "break-all" }}
                >
                  {alert.exePath}
                </span>
              </>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBlock();
              }}
              className="pill"
              style={{ background: "var(--coral)" }}
            >
              Block this app
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowInFirewall();
              }}
              className="pill"
              style={{ background: "var(--sky)" }}
            >
              Show in Firewall tab
            </button>
            {alert.exePath && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFileLocation();
                }}
                className="pill"
                style={{ background: "var(--mint)" }}
              >
                Open file location
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              data-testid={`delete-alert-${alert.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="pill"
              style={{ background: "var(--paper)" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AlertsTab({ connection, onNavigateToFirewall }: Props) {
  const { alerts, markRead, markAllRead, deleteAlert, deleteAllAlerts } = useAlerts(connection);
  const { blockApp } = useFirewall(connection);
  const [activePill, setActivePill] = useState<AlertPill>("Important");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleClearAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      clearTimerRef.current = setTimeout(() => setConfirmingClear(false), 3000);
    } else {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setConfirmingClear(false);
      deleteAllAlerts();
    }
  };

  const handleOpenFileLocation = (exePath: string) => {
    if (connection) {
      connection.invoke("OpenFileLocation", exePath).catch(() => {});
    }
  };

  const handleToggle = (alert: AlertRecord) => {
    if (expandedId === alert.id) {
      setExpandedId(null);
    } else {
      setExpandedId(alert.id);
      if (!alert.isRead) {
        markRead(alert.id);
      }
    }
  };

  const grouped = alerts.reduce<Record<string, AlertRecord[]>>(
    (acc, alert) => {
      const group = getDateGroup(alert.timestamp);
      if (!acc[group]) acc[group] = [];
      acc[group].push(alert);
      return acc;
    },
    {},
  );

  const totalToday = grouped["Today"]?.length ?? 0;
  const totalYesterday = grouped["Yesterday"]?.length ?? 0;

  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Alerts</h1>
        {alerts.length > 0 && (
          <span className="sticker-tag" style={{ background: "var(--pink)" }}>
            {alerts.length} total
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div className="pill-row">
          {ALERT_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setActivePill(pill)}
              className={`pill ${pill === activePill ? "active" : ""}`}
              style={
                pill === activePill
                  ? ({ "--p-active": "var(--sky)" } as React.CSSProperties)
                  : undefined
              }
            >
              {pill}
            </button>
          ))}
        </div>
        <button
          onClick={() => markAllRead()}
          className="pill"
          style={{ background: "var(--peach)" }}
        >
          Mark all read
        </button>
        {alerts.length > 0 && (
          <button
            onClick={handleClearAll}
            className="pill"
            style={{
              background: confirmingClear ? "var(--coral)" : "var(--paper)",
              color: confirmingClear ? "white" : undefined,
            }}
          >
            {confirmingClear ? "Confirm" : "Clear all"}
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <p className="row-sub">No alerts yet</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 18, padding: "14px 18px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Sticker
                  color="butter"
                  size="lg"
                  rotate={-3}
                  glyph={WarningTriangle}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "Fredoka",
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    Stay watchful
                  </div>
                  <div className="row-sub">
                    {alerts.length} first-time connections · 0 marked malicious
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="chip" style={{ background: "var(--mint)" }}>
                  {totalToday} Today
                </span>
                <span
                  className="chip"
                  style={{ background: "var(--lavender)" }}
                >
                  {totalYesterday} Yesterday
                </span>
              </div>
            </div>
          </div>

          {Object.entries(grouped).map(([dateGroup, groupAlerts], gi) => (
            <div key={dateGroup} style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span
                  className="sticker-tag"
                  style={{
                    background:
                      gi === 0 ? "var(--mint)" : "var(--lavender)",
                    transform: "rotate(-2deg)",
                    fontSize: 12,
                  }}
                >
                  {dateGroup}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 0,
                    borderTop: "2.5px dashed var(--ink-mute)",
                  }}
                />
                <span className="row-sub mono">
                  {groupAlerts.length} events
                </span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {groupAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isExpanded={expandedId === alert.id}
                    onToggle={() => handleToggle(alert)}
                    onBlock={() => blockApp(alert.appName)}
                    onDelete={() => deleteAlert(alert.id)}
                    onShowInFirewall={() => onNavigateToFirewall?.(alert.appName)}
                    onOpenFileLocation={() => alert.exePath && handleOpenFileLocation(alert.exePath)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
