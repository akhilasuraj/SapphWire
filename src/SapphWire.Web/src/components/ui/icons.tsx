import type { ReactNode } from "react";
import type { TabName } from "../../App";

export const TabIcon: Record<TabName, ReactNode> = {
  Graph: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 18 L8 11 L12 14 L17 6 L21 10"
        stroke="#2E2A4A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="11" r="1.5" fill="#2E2A4A" />
      <circle cx="17" cy="6" r="1.5" fill="#2E2A4A" />
    </svg>
  ),
  Usage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="#2E2A4A" strokeWidth="2.5" />
      <path
        d="M12 4 A8 8 0 0 1 20 12 L12 12 Z"
        fill="#FFCDA8"
        stroke="#2E2A4A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Things: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="2.4" fill="#B7E8CF" stroke="#2E2A4A" strokeWidth="2" />
      <circle cx="18" cy="6" r="2.4" fill="#FFC2D1" stroke="#2E2A4A" strokeWidth="2" />
      <circle cx="18" cy="18" r="2.4" fill="#D6C7FF" stroke="#2E2A4A" strokeWidth="2" />
      <path
        d="M8 11 L16 7 M8 13 L16 17"
        stroke="#2E2A4A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Firewall: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 C13 6 16 7 16 11 C16 14 14 16 12 16 C10 16 8 14 8 11 C8 7 11 6 12 3 Z"
        fill="#FFB3A7"
        stroke="#2E2A4A"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <rect x="6" y="17" width="12" height="4" rx="1.5" fill="#FFE69A" stroke="#2E2A4A" strokeWidth="2" />
    </svg>
  ),
  Alerts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 C8 3 6 6 6 10 C6 13 5 14 4 16 H20 C19 14 18 13 18 10 C18 6 16 3 12 3 Z"
        fill="#BCDFFB"
        stroke="#2E2A4A"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M10 18 C10 19 11 20 12 20 C13 20 14 19 14 18"
        stroke="#2E2A4A"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="18" cy="5" r="3" fill="#F58FAE" stroke="#2E2A4A" strokeWidth="2" />
    </svg>
  ),
};

export const PcIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="5" width="16" height="11" rx="2" stroke="#2E2A4A" strokeWidth="2.2" fill="none" />
    <path d="M2 19 H22" stroke="#2E2A4A" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const GatewayIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke="#2E2A4A" strokeWidth="2.2" fill="none" />
    <path
      d="M4 12h16 M12 4 C9 7 9 17 12 20 M12 4 C15 7 15 17 12 20"
      stroke="#2E2A4A"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const PhoneIcon: ReactNode = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="7" y="2" width="10" height="20" rx="2.5" stroke="#2E2A4A" strokeWidth="2.2" fill="none" />
    <circle cx="12" cy="18.5" r="1" fill="#2E2A4A" />
  </svg>
);

export const WifiIcon: ReactNode = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M2 9 C7 4 17 4 22 9" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M5 13 C8 10 16 10 19 13" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M8 17 C10 15 14 15 16 17" stroke="#2E2A4A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <circle cx="12" cy="20" r="1.6" fill="#2E2A4A" />
  </svg>
);

export const ShieldIcon = (checked: boolean): ReactNode => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3 L20 6 V12 C20 16 16 19 12 21 C8 19 4 16 4 12 V6 Z"
      stroke="#2E2A4A"
      strokeWidth="2.4"
      fill="var(--paper)"
      strokeLinejoin="round"
    />
    {checked && (
      <path
        d="M9 12 L11 14 L15 10"
        stroke="#2E2A4A"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </svg>
);

export const SearchIcon: ReactNode = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="6" stroke="#2E2A4A" strokeWidth="2.5" />
    <path d="m20 20-4-4" stroke="#2E2A4A" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const PlusIcon: ReactNode = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 4 V20 M4 12 H20" stroke="#2E2A4A" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const FlameIcon: ReactNode = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3 C13 6 16 7 16 11 C16 14 14 16 12 16 C10 16 8 14 8 11 C8 7 11 6 12 3 Z"
      fill="currentColor"
      stroke="#2E2A4A"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const AlertGlyph: ReactNode = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#2E2A4A" strokeWidth="2.2" fill="none" />
    <path d="M12 7 V13" stroke="#2E2A4A" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.2" fill="#2E2A4A" />
  </svg>
);

export const WarningTriangle: ReactNode = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3 L21 19 H3 Z"
      stroke="#2E2A4A"
      strokeWidth="2.4"
      fill="var(--coral)"
      strokeLinejoin="round"
    />
    <path d="M12 9 V14" stroke="#2E2A4A" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="#2E2A4A" />
  </svg>
);

export const ChevronDown = (rotated = false): ReactNode => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 20 20"
    fill="none"
    style={{
      transform: rotated ? "rotate(180deg)" : undefined,
      transition: "transform .15s",
    }}
  >
    <path
      d="M5 8 L10 13 L15 8"
      stroke="#2E2A4A"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const HostGlyph: ReactNode = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke="#2E2A4A" strokeWidth="2.2" />
    <path
      d="M4 12h16 M12 4 C9 7 9 17 12 20 M12 4 C15 7 15 17 12 20"
      stroke="#2E2A4A"
      strokeWidth="1.8"
      fill="none"
    />
  </svg>
);

export const TrafficGlyph: ReactNode = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="6" width="16" height="12" rx="3" stroke="#2E2A4A" strokeWidth="2.2" fill="none" />
    <path
      d="M7 10 L12 14 L17 10"
      stroke="#2E2A4A"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SettingsGlyph: ReactNode = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="#2E2A4A" strokeWidth="2.2" />
    <path
      d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9"
      stroke="#2E2A4A"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);
