import { useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { useSettings } from "../useSettings";

interface Props {
  connection: HubConnection | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function SettingsPanel({ connection, onClose }: Props) {
  const {
    settings,
    info,
    isPaused,
    setAutostart,
    setToastEnabled,
    clearData,
    pauseMonitoring,
    resumeMonitoring,
  } = useSettings(connection);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="text-gray-400 hover:text-gray-100 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              General
            </h3>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm">Start SapphWire with Windows</span>
              <input
                type="checkbox"
                checked={settings.autostartEnabled}
                onChange={() => setAutostart(!settings.autostartEnabled)}
                aria-label="Start SapphWire with Windows"
                className="w-4 h-4 accent-blue-500"
              />
            </label>
            <div className="mt-2">
              <button
                onClick={() =>
                  isPaused ? resumeMonitoring() : pauseMonitoring()
                }
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded"
              >
                {isPaused ? "Resume monitoring" : "Pause monitoring"}
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Notifications
            </h3>
            <label className="flex items-center justify-between py-1">
              <span className="text-sm">
                Show Windows toast on first-activity alerts
              </span>
              <input
                type="checkbox"
                checked={settings.toastEnabled}
                onChange={() => setToastEnabled(!settings.toastEnabled)}
                aria-label="Show Windows toast on first-activity alerts"
                className="w-4 h-4 accent-blue-500"
              />
            </label>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              Data
            </h3>
            {info && (
              <>
                <div className="text-sm space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Database path</span>
                    <span className="text-gray-200 text-xs font-mono truncate ml-2 max-w-[240px]">
                      {info.dbPath}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size</span>
                    <span className="text-gray-200">
                      {formatBytes(info.dbSizeBytes)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      connection?.invoke("OpenDataFolder").catch(() => {})
                    }
                    className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded"
                  >
                    Open data folder
                  </button>
                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-900 border border-red-700 rounded text-red-200"
                    >
                      Clear all data
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        clearData();
                        setShowClearConfirm(false);
                      }}
                      className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 border border-red-500 rounded text-white"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
              About
            </h3>
            {info && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Version</span>
                  <span className="text-gray-200">{info.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Build</span>
                  <span className="text-gray-200 font-mono text-xs">
                    {info.buildHash}
                  </span>
                </div>
                <div className="mt-2">
                  <button
                    onClick={() =>
                      connection?.invoke("ShowLogs").catch(() => {})
                    }
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Show logs
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
