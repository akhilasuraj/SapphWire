import type { TabName } from "../App";
import type { ConnectionStatus as Status } from "../useSignalR";
import { Sticker, type StickerColor } from "./ui/Sticker";
import { TabIcon, SettingsGlyph } from "./ui/icons";

const TABS: TabName[] = ["Graph", "Usage", "Things", "Firewall", "Alerts"];

const TAB_COLORS: Record<TabName, StickerColor> = {
  Graph: "sky",
  Usage: "peach",
  Things: "mint",
  Firewall: "pink",
  Alerts: "lavender",
};

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  onSettingsClick: () => void;
  connectionStatus?: Status;
  alertsCount?: number;
}

export default function TopBar({
  activeTab,
  onTabChange,
  onSettingsClick,
  alertsCount = 0,
}: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3 L19 8 L19 16 L12 21 L5 16 L5 8 Z"
              stroke="#2E2A4A"
              strokeWidth="2.4"
              fill="var(--paper)"
              strokeLinejoin="round"
            />
            <path
              d="M9 11 L12 9 L15 11 L15 14 L12 16 L9 14 Z"
              stroke="#2E2A4A"
              strokeWidth="2"
              fill="var(--pink)"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        SapphWire
      </div>
      <nav className="tabs">
        {TABS.map((t) => {
          const isActive = t === activeTab;
          const accent = `var(--${TAB_COLORS[t]})`;
          return (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`tab-btn ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? ({ "--accent": accent } as React.CSSProperties)
                  : undefined
              }
            >
              {TabIcon[t]}
              <span>{t}</span>
              {t === "Alerts" && alertsCount > 0 && (
                <span className="badge">{alertsCount}</span>
              )}
            </button>
          );
        })}
      </nav>
      <Sticker
        color="butter"
        size="sm"
        rotate={-3}
        glyph={
          <span style={{ fontSize: 14, fontFamily: "Fredoka", fontWeight: 700 }}>
            ★
          </span>
        }
        style={{ width: 32, height: 32 }}
      />
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        className="icon-btn"
        title="Settings"
      >
        {SettingsGlyph}
      </button>
    </header>
  );
}
