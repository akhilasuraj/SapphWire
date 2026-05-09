import { useState, useEffect } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";
import { useConnections, type ConnectionDetail } from "../useConnections";
import { useFirewall } from "../useFirewall";
import { LetterSticker, Sticker, colorFromString } from "./ui/Sticker";
import { FlameIcon, ChevronDown, ShieldIcon } from "./ui/icons";
import { FlagChip } from "./ui/FlagChip";

interface Props {
  connection: HubConnection | null;
  highlightAppId?: string | null;
  onHighlightHandled?: () => void;
}

function formatRate(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB/s`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB/s`;
  return `${bytes} B/s`;
}

function Sparkline({ appId, data }: { appId: string; data?: number[] }) {
  let points: string;
  if (data && data.length > 0) {
    const max = Math.max(...data, 1);
    const h = 18;
    const w = 60;
    const step = data.length > 1 ? w / (data.length - 1) : 0;
    points = data
      .map((v, i) => `${i * step},${h - (v / max) * h + 1}`)
      .join(" ");
  } else {
    points = "0,10 30,10 60,10";
  }

  return (
    <svg
      data-testid={`sparkline-${appId}`}
      className="spark"
      viewBox="0 0 60 20"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#2E2A4A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConnectionRow({
  conn,
  parentAppId,
  onBlockExe,
  onUnblockExe,
  isExeBlocked,
}: {
  conn: ConnectionDetail;
  parentAppId: string;
  onBlockExe: (appId: string, exePath: string) => void;
  onUnblockExe: (appId: string, exePath: string) => void;
  isExeBlocked: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
      }}
    >
      <button
        data-testid={`child-flame-${conn.exeName}-${conn.pid}`}
        onClick={() =>
          isExeBlocked
            ? onUnblockExe(parentAppId, conn.exeName)
            : onBlockExe(parentAppId, conn.exeName)
        }
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: isExeBlocked ? "var(--coral-deep)" : "var(--ink-mute)",
          padding: 2,
        }}
        title={isExeBlocked ? "Unblock" : "Block"}
      >
        {FlameIcon}
      </button>
      <FlagChip code={conn.countryCode} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          className="mono"
          style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}
        >
          {conn.exeName}
        </span>
        <span
          className="row-sub mono"
          style={{ fontSize: 11, marginLeft: 8 }}
        >
          PID {conn.pid}
        </span>
        <span
          className="row-sub mono"
          style={{ fontSize: 11, marginLeft: 8 }}
        >
          {conn.remoteHost}:{conn.remotePort}
        </span>
      </div>
      <span className="mono" style={{ fontSize: 11, minWidth: 70, textAlign: "right" }}>
        ↑ {formatRate(conn.up)}
      </span>
      <span className="mono" style={{ fontSize: 11, minWidth: 70, textAlign: "right" }}>
        ↓ {formatRate(conn.down)}
      </span>
    </div>
  );
}

function AppRow({
  app,
  isExpanded,
  onToggle,
  sparkData,
  connections,
  isBlocked,
  onFlameClick,
  onBlockExe,
  onUnblockExe,
  isExeBlocked,
}: {
  app: ActiveAppRow;
  isExpanded: boolean;
  onToggle: () => void;
  sparkData?: number[];
  connections: ConnectionDetail[];
  isBlocked: boolean;
  onFlameClick: () => void;
  onBlockExe: (appId: string, exeName: string) => void;
  onUnblockExe: (appId: string, exeName: string) => void;
  isExeBlocked: (appId: string, exeName: string) => boolean;
}) {
  const moreCount = app.endpointCount - 1;
  const stickerColor = colorFromString(app.appId);

  return (
    <>
      <div
        data-testid={`app-row-${app.appId}`}
        onClick={onToggle}
        className="row"
        style={{ cursor: "pointer", marginBottom: 8 }}
      >
        <button
          data-testid={`flame-toggle-${app.appId}`}
          onClick={(e) => {
            e.stopPropagation();
            onFlameClick();
          }}
          style={{
            flexShrink: 0,
            background: isBlocked ? "var(--coral)" : "var(--paper)",
            border: "2.5px solid var(--ink)",
            borderRadius: 10,
            padding: 6,
            cursor: "pointer",
            color: isBlocked ? "var(--ink)" : "var(--ink-mute)",
            boxShadow: "var(--shadow-sm)",
          }}
          title={isBlocked ? "Unblock" : "Block"}
        >
          {FlameIcon}
        </button>
        <LetterSticker name={app.displayName} color={stickerColor} size="sm" />
        {app.countryCode && (
          <span data-testid={`flag-${app.appId}`}>
            <FlagChip code={app.countryCode} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-name">{app.displayName}</div>
          <div className="row-sub mono" style={{ fontSize: 11 }}>
            {app.topEndpoint}
            {moreCount > 0 && (
              <span style={{ marginLeft: 8 }}>+{moreCount} more</span>
            )}
          </div>
        </div>
        <span
          data-testid={`rate-up-${app.appId}`}
          className="mono"
          style={{ fontSize: 12, minWidth: 80, textAlign: "right" }}
        >
          ↑ {formatRate(app.up)}
        </span>
        <span
          data-testid={`rate-down-${app.appId}`}
          className="mono"
          style={{ fontSize: 12, minWidth: 80, textAlign: "right" }}
        >
          ↓ {formatRate(app.down)}
        </span>
        <Sparkline appId={app.appId} data={sparkData} />
        {ChevronDown(isExpanded)}
      </div>

      {isExpanded && (
        <div
          data-testid={`expanded-${app.appId}`}
          className="card-tight"
          style={{
            marginTop: -2,
            marginBottom: 12,
            background: "var(--cream)",
          }}
        >
          {connections.length === 0 ? (
            <p className="row-sub" style={{ margin: 0 }}>
              No active connections
            </p>
          ) : (
            connections.map((conn, i) => (
              <ConnectionRow
                key={`${conn.exeName}-${conn.pid}-${conn.remoteHost}-${conn.remotePort}-${i}`}
                conn={conn}
                parentAppId={app.appId}
                onBlockExe={onBlockExe}
                onUnblockExe={onUnblockExe}
                isExeBlocked={isExeBlocked(app.appId, conn.exeName)}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}

function BlockedAppRow({
  entry,
  onUnblock,
}: {
  entry: { appId: string; displayName: string };
  onUnblock: () => void;
}) {
  return (
    <div className="row" style={{ marginBottom: 8 }}>
      <button
        data-testid={`flame-toggle-${entry.appId}`}
        onClick={onUnblock}
        style={{
          flexShrink: 0,
          background: "var(--coral)",
          border: "2.5px solid var(--ink)",
          borderRadius: 10,
          padding: 6,
          cursor: "pointer",
          color: "var(--ink)",
          boxShadow: "var(--shadow-sm)",
        }}
        title="Unblock"
      >
        {FlameIcon}
      </button>
      <LetterSticker
        name={entry.displayName}
        color={colorFromString(entry.appId)}
        size="sm"
      />
      <span className="row-name">{entry.displayName}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  count,
  testId,
  accent,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  testId?: string;
  accent: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ marginBottom: 18 }} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className="card-title"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          marginBottom: open ? 12 : 0,
        }}
      >
        <span className="dot" style={{ background: accent }} />
        <span>{title}</span>
        {count !== undefined && (
          <span className="row-sub" style={{ marginLeft: 4 }}>
            ({count})
          </span>
        )}
        <div style={{ flex: 1 }} />
        {ChevronDown(open)}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function FirewallTab({ connection, highlightAppId, onHighlightHandled }: Props) {
  const { apps, sparkHistory } = useActiveApps(connection);
  const {
    state: firewallState,
    blockApp,
    unblockApp,
    blockExe,
    unblockExe,
    isBlocked,
    isExeBlocked,
    suspend,
    resume,
  } = useFirewall(connection);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const connections = useConnections(connection, expandedAppId);

  useEffect(() => {
    if (!highlightAppId) return;
    setExpandedAppId(highlightAppId);
    onHighlightHandled?.();
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-testid="app-row-${highlightAppId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightAppId, onHighlightHandled]);

  const blockedApps = apps.filter((a) => isBlocked(a.appId));
  const activeApps = apps.filter((a) => !isBlocked(a.appId));

  const blockedOnlyFromState = firewallState.blockedApps.filter(
    (b) => !apps.some((a) => a.appId === b.appId),
  );

  const totalBlockedCount = blockedApps.length + blockedOnlyFromState.length;
  const enabled = !firewallState.isSuspended;

  const handleToggle = () => {
    if (enabled) {
      suspend();
    } else {
      resume();
    }
  };

  return (
    <div className="page-fade">
      <div className="section-head">
        <h1 className="section-title">Firewall</h1>
        <span
          data-testid="firewall-badge"
          className="sticker-tag"
          style={{
            background: enabled ? "var(--mint)" : "var(--coral)",
          }}
        >
          {enabled ? "Shielding" : "Off duty"}
        </span>
        <div style={{ flex: 1 }} />
        <label
          data-testid="show-installed-apps-toggle"
          className="chip"
          style={{
            background: "var(--paper)",
            cursor: "pointer",
            padding: "6px 12px",
          }}
        >
          <input type="checkbox" style={{ accentColor: "var(--ink)" }} />
          Show all installed apps
        </label>
      </div>

      {firewallState.error && (
        <div
          data-testid="firewall-error-banner"
          className="card-tight"
          style={{
            background: "var(--coral)",
            marginBottom: 18,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {firewallState.error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 18, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 24px",
            background: enabled
              ? "linear-gradient(120deg, var(--mint) 0%, var(--sky) 100%)"
              : "linear-gradient(120deg, var(--cream-2) 0%, var(--peach) 100%)",
            borderBottom: "2.5px solid var(--ink)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Sticker
                color={enabled ? "mint" : "coral"}
                size="lg"
                rotate={-4}
                glyph={ShieldIcon(enabled)}
              />
              <div>
                <div
                  data-testid="firewall-banner-title"
                  style={{
                    fontFamily: "Fredoka",
                    fontSize: 22,
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  Firewall is {enabled ? "on" : "off"}
                </div>
                <div className="row-sub" data-testid="firewall-banner-subtitle">
                  {enabled
                    ? `${totalBlockedCount} apps blocked · ${activeApps.length} active`
                    : "Click the toggle to start shielding your network."}
                </div>
              </div>
            </div>
            <button
              data-testid="firewall-master-toggle"
              onClick={handleToggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={{
                fontFamily: "Fredoka",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--ink)",
              }}>
                {enabled ? "ON" : "OFF"}
              </span>
              <div
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  background: enabled ? "var(--mint)" : "var(--ink-mute)",
                  border: "2.5px solid var(--ink)",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "var(--paper)",
                    border: "2px solid var(--ink)",
                    position: "absolute",
                    top: 1.5,
                    left: enabled ? 24 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Blocked Apps"
        count={totalBlockedCount}
        testId="blocked-apps-section"
        accent="var(--coral)"
      >
        {totalBlockedCount === 0 ? (
          <div className="row-sub" style={{ padding: "16px 0", textAlign: "center" }}>
            No blocked apps
          </div>
        ) : (
          <>
            {blockedApps.map((app) => (
              <AppRow
                key={app.appId}
                app={app}
                isExpanded={expandedAppId === app.appId}
                onToggle={() =>
                  setExpandedAppId(
                    expandedAppId === app.appId ? null : app.appId,
                  )
                }
                sparkData={sparkHistory[app.appId]}
                connections={
                  expandedAppId === app.appId ? connections : []
                }
                isBlocked={true}
                onFlameClick={() => unblockApp(app.appId)}
                onBlockExe={blockExe}
                onUnblockExe={unblockExe}
                isExeBlocked={isExeBlocked}
              />
            ))}
            {blockedOnlyFromState.map((entry) => (
              <BlockedAppRow
                key={entry.appId}
                entry={entry}
                onUnblock={() => unblockApp(entry.appId)}
              />
            ))}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Active Apps"
        count={activeApps.length}
        testId="active-apps-section"
        accent="var(--mint)"
      >
        {activeApps.length === 0 ? (
          <div className="row-sub" style={{ padding: "16px 0", textAlign: "center" }}>
            No active apps detected
          </div>
        ) : (
          activeApps.map((app) => (
            <AppRow
              key={app.appId}
              app={app}
              isExpanded={expandedAppId === app.appId}
              onToggle={() =>
                setExpandedAppId(
                  expandedAppId === app.appId ? null : app.appId,
                )
              }
              sparkData={sparkHistory[app.appId]}
              connections={
                expandedAppId === app.appId ? connections : []
              }
              isBlocked={false}
              onFlameClick={() => blockApp(app.appId)}
              onBlockExe={blockExe}
              onUnblockExe={unblockExe}
              isExeBlocked={isExeBlocked}
            />
          ))
        )}
      </CollapsibleSection>
    </div>
  );
}
