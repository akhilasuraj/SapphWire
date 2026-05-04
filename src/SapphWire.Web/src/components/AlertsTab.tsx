import { useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useAlerts, type AlertRecord } from "../useAlerts";
import { useFirewall } from "../useFirewall";

interface Props {
  connection: HubConnection | null;
  onNavigateToAlert?: (alertId: number) => void;
}

type AlertPill = "Important" | "All";

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
}: {
  alert: AlertRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div
        data-testid={`alert-row-${alert.id}`}
        onClick={onToggle}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/30 ${
          !alert.isRead ? "bg-gray-800/20" : ""
        }`}
      >
        <div className="flex-shrink-0 w-6 text-center">
          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200">
              {alert.appName}
            </span>
            {!alert.isRead && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">
                NEW
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {alert.remoteIp && alert.remotePort
              ? `→ ${alert.remoteIp}:${alert.remotePort}`
              : "First network activity"}
          </div>
        </div>

        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatTime(alert.timestamp)}
        </span>

        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
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

      {isExpanded && (
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Destination IP:</span>{" "}
              <span className="text-gray-300">{alert.remoteIp}</span>
            </div>
            <div>
              <span className="text-gray-500">Port:</span>{" "}
              <span className="text-gray-300">{alert.remotePort}</span>
            </div>
            {alert.exePath && (
              <div className="col-span-2">
                <span className="text-gray-500">Exe path:</span>{" "}
                <span className="text-gray-300">{alert.exePath}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBlock();
              }}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Block this app
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Show in Firewall tab
            </button>
            <button
              data-testid={`delete-alert-${alert.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs text-gray-500 hover:text-red-400 ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AlertsTab({ connection }: Props) {
  const { alerts, markRead, markAllRead, deleteAlert } = useAlerts(connection);
  const { blockApp } = useFirewall(connection);
  const [activePill, setActivePill] = useState<AlertPill>("Important");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pills: AlertPill[] = ["Important", "All"];

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

  const grouped = alerts.reduce<Record<string, AlertRecord[]>>((acc, alert) => {
    const group = getDateGroup(alert.timestamp);
    if (!acc[group]) acc[group] = [];
    acc[group].push(alert);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {pills.map((pill) => (
            <button
              key={pill}
              onClick={() => setActivePill(pill)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                pill === activePill
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
        <button
          onClick={() => markAllRead()}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 rounded-full hover:text-gray-200"
        >
          Mark all read
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-600">No alerts yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([dateGroup, groupAlerts]) => (
            <div key={dateGroup} className="mb-4">
              <h3 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {dateGroup}
              </h3>
              {groupAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isExpanded={expandedId === alert.id}
                  onToggle={() => handleToggle(alert)}
                  onBlock={() => blockApp(alert.appName)}
                  onDelete={() => deleteAlert(alert.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
