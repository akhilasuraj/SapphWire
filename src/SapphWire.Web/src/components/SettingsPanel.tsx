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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span style={{ position: "relative" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={label}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            cursor: "pointer",
          }}
        />
        <span
          className={`toggle ${checked ? "on" : ""}`}
          aria-hidden="true"
          style={{ display: "block" }}
        >
          <span className="knob" />
        </span>
      </span>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "Fredoka",
        fontWeight: 600,
        fontSize: 17,
        margin: 0,
        marginBottom: 12,
      }}
    >
      {children}
    </h3>
  );
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "Fredoka",
              fontWeight: 600,
              fontSize: 24,
              margin: 0,
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="icon-btn"
            style={{ width: 36, height: 36 }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, fontWeight: 700 }}>
              ×
            </span>
          </button>
        </div>

        <div style={{ overflowY: "auto", paddingRight: 4 }}>
          <section style={{ marginBottom: 18 }}>
            <SectionTitle>General</SectionTitle>
            <ToggleSwitch
              label="Start SapphWire with Windows"
              checked={settings.autostartEnabled}
              onChange={() => setAutostart(!settings.autostartEnabled)}
            />
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() =>
                  isPaused ? resumeMonitoring() : pauseMonitoring()
                }
                className="pill"
                style={{ background: "var(--lavender)" }}
              >
                {isPaused ? "Resume monitoring" : "Pause monitoring"}
              </button>
            </div>
          </section>

          <div className="doodle-line" />

          <section style={{ marginBottom: 18 }}>
            <SectionTitle>Notifications</SectionTitle>
            <ToggleSwitch
              label="Show Windows toast on first-activity alerts"
              checked={settings.toastEnabled}
              onChange={() => setToastEnabled(!settings.toastEnabled)}
            />
          </section>

          <div className="doodle-line" />

          <section style={{ marginBottom: 18 }}>
            <SectionTitle>Data</SectionTitle>
            {info && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "4px 12px",
                    marginBottom: 12,
                  }}
                >
                  <span className="row-sub">Database path</span>
                  <span
                    className="mono"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={info.dbPath}
                  >
                    {info.dbPath}
                  </span>
                  <span className="row-sub">Size</span>
                  <span className="mono">{formatBytes(info.dbSizeBytes)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      connection?.invoke("OpenDataFolder").catch(() => {})
                    }
                    className="pill"
                    style={{ background: "var(--sky)" }}
                  >
                    Open data folder
                  </button>
                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="pill"
                      style={{ background: "var(--coral)" }}
                    >
                      Clear all data
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        clearData();
                        setShowClearConfirm(false);
                      }}
                      className="pill"
                      style={{ background: "var(--coral-deep)", color: "var(--paper)" }}
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          <div className="doodle-line" />

          <section>
            <SectionTitle>About</SectionTitle>
            {info && (
              <div
                style={{
                  fontSize: 12,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "4px 12px",
                }}
              >
                <span className="row-sub">Version</span>
                <span className="mono">{info.version}</span>
                <span className="row-sub">Build</span>
                <span className="mono">{info.buildHash}</span>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() =>
                  connection?.invoke("ShowLogs").catch(() => {})
                }
                className="pill"
                style={{ background: "var(--butter)" }}
              >
                Show logs
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
