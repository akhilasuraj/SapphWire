import { useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useActiveApps, type ActiveAppRow } from "../useActiveApps";
import { useConnections, type ConnectionDetail } from "../useConnections";

interface Props {
  connection: HubConnection | null;
}

function formatRate(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB/s`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB/s`;
  return `${bytes} B/s`;
}

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
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
      className="w-16 h-6"
      viewBox="0 0 60 20"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ConnectionRow({ conn }: { conn: ConnectionDetail }) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2">
      <div className="w-5 text-center text-xs">
        {conn.countryCode ? countryFlag(conn.countryCode) : null}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-300">{conn.exeName}</span>
        <span className="text-xs text-gray-600 ml-2">PID {conn.pid}</span>
        <span className="text-xs text-gray-500 ml-2">
          {conn.remoteHost}:{conn.remotePort}
        </span>
      </div>
      <span className="text-xs text-green-400 w-16 text-right">
        {"↑"} {formatRate(conn.up)}
      </span>
      <span className="text-xs text-blue-400 w-16 text-right">
        {"↓"} {formatRate(conn.down)}
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
}: {
  app: ActiveAppRow;
  isExpanded: boolean;
  onToggle: () => void;
  sparkData?: number[];
  connections: ConnectionDetail[];
}) {
  const moreCount = app.endpointCount - 1;

  return (
    <>
      <div
        data-testid={`app-row-${app.appId}`}
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 cursor-pointer border-b border-gray-800/50"
      >
        <button
          data-testid={`flame-toggle-${app.appId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-gray-600 hover:text-orange-400 transition-colors flex-shrink-0"
          title="Block/Unblock (coming soon)"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
          </svg>
        </button>

        <div className="flex-shrink-0 w-6 text-center">
          {app.countryCode ? (
            <span data-testid={`flag-${app.appId}`}>
              {countryFlag(app.countryCode)}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-200 truncate block">
            {app.displayName}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{app.topEndpoint}</span>
            {moreCount > 0 && <span>+{moreCount} more</span>}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <span
            data-testid={`rate-up-${app.appId}`}
            className="text-xs text-green-400 w-20 text-right"
          >
            {"↑"} {formatRate(app.up)}
          </span>
          <span
            data-testid={`rate-down-${app.appId}`}
            className="text-xs text-blue-400 w-20 text-right"
          >
            {"↓"} {formatRate(app.down)}
          </span>
          <Sparkline appId={app.appId} data={sparkData} />
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div
          data-testid={`expanded-${app.appId}`}
          className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-3"
        >
          {connections.length === 0 ? (
            <p className="text-xs text-gray-500">No active connections</p>
          ) : (
            connections.map((conn, i) => (
              <ConnectionRow key={`${conn.exeName}-${conn.pid}-${conn.remoteHost}-${conn.remotePort}-${i}`} conn={conn} />
            ))
          )}
        </div>
      )}
    </>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-800/30"
      >
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-xs text-gray-600">({count})</span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function FirewallTab({ connection }: Props) {
  const { apps, sparkHistory } = useActiveApps(connection);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const connections = useConnections(connection, expandedAppId);

  return (
    <div className="flex-1 flex flex-col p-4">
      <CollapsibleSection title="Blocked Apps" count={0}>
        <div className="px-4 py-6 text-center text-sm text-gray-600">
          No blocked apps
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Active Apps" count={apps.length}>
        {apps.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-600">
            No active apps detected
          </div>
        ) : (
          apps.map((app) => (
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
              connections={expandedAppId === app.appId ? connections : []}
            />
          ))
        )}
      </CollapsibleSection>
    </div>
  );
}
