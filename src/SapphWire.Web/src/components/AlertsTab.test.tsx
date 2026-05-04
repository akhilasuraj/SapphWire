import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AlertsTab from "./AlertsTab";
import * as useAlertsModule from "../useAlerts";
import * as useFirewallModule from "../useFirewall";
import type { AlertRecord } from "../useAlerts";

function makeAlert(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    id: 1,
    timestamp: "2024-06-01T12:00:00.000Z",
    appName: "Chrome",
    exePath: "C:\\Program Files\\Google\\Chrome\\chrome.exe",
    remoteIp: "8.8.8.8",
    remotePort: 443,
    isRead: false,
    ...overrides,
  };
}

const defaultFirewall = {
  state: { blockedApps: [], error: null },
  blockApp: vi.fn().mockResolvedValue(undefined),
  unblockApp: vi.fn().mockResolvedValue(undefined),
  blockExe: vi.fn().mockResolvedValue(undefined),
  unblockExe: vi.fn().mockResolvedValue(undefined),
  isBlocked: vi.fn().mockReturnValue(false),
  isExeBlocked: vi.fn().mockReturnValue(false),
};

describe("AlertsTab", () => {
  let mockMarkRead: (id: number) => Promise<void>;
  let mockMarkAllRead: () => Promise<void>;
  let mockDeleteAlert: (id: number) => Promise<void>;

  beforeEach(() => {
    mockMarkRead = vi.fn().mockResolvedValue(undefined) as unknown as (id: number) => Promise<void>;
    mockMarkAllRead = vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;
    mockDeleteAlert = vi.fn().mockResolvedValue(undefined) as unknown as (id: number) => Promise<void>;

    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [],
      unreadCount: 0,
      alertTimestamps: [],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    vi.spyOn(useFirewallModule, "useFirewall").mockReturnValue(defaultFirewall);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Important and All pills", () => {
    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("does not render Logs pill (hidden in v1)", () => {
    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.queryByText("Logs")).not.toBeInTheDocument();
  });

  it("renders Mark all read button", () => {
    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("shows empty state when no alerts", () => {
    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("No alerts yet")).toBeInTheDocument();
  });

  it("renders alert rows when data is present", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, appName: "Chrome" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("Chrome")).toBeInTheDocument();
  });

  it("shows NEW badge for unread alerts", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, isRead: false })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("does not show NEW badge for read alerts", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, isRead: true })],
      unreadCount: 0,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("clicking unread alert calls markRead", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 5, isRead: false })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-5"));
    expect(mockMarkRead).toHaveBeenCalledWith(5);
  });

  it("clicking Mark all read calls markAllRead", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, isRead: false })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByText("Mark all read"));
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("expanded alert shows details: IP, port, exe path", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [
        makeAlert({
          id: 1,
          remoteIp: "1.2.3.4",
          remotePort: 8080,
          exePath: "C:\\app\\test.exe",
        }),
      ],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));

    expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("8080")).toBeInTheDocument();
    expect(screen.getByText("C:\\app\\test.exe")).toBeInTheDocument();
  });

  it("expanded alert shows Block this app action link", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    expect(screen.getByText("Block this app")).toBeInTheDocument();
  });

  it("Block this app calls firewall blockApp", () => {
    const blockApp = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(useFirewallModule, "useFirewall").mockReturnValue({
      ...defaultFirewall,
      blockApp,
    });
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, appName: "Chrome" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    fireEvent.click(screen.getByText("Block this app"));
    expect(blockApp).toHaveBeenCalledWith("Chrome");
  });

  it("expanded alert shows Show in Firewall tab link", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    expect(screen.getByText("Show in Firewall tab")).toBeInTheDocument();
  });

  it("delete button calls deleteAlert", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 3 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-3"));
    fireEvent.click(screen.getByTestId("delete-alert-3"));
    expect(mockDeleteAlert).toHaveBeenCalledWith(3);
  });

  it("groups alerts by date (Today header)", () => {
    const todayTs = new Date().toISOString();
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, timestamp: todayTs })],
      unreadCount: 1,
      alertTimestamps: [todayTs],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("groups alerts by date (Yesterday header)", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTs = yesterday.toISOString();
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, timestamp: yesterdayTs })],
      unreadCount: 1,
      alertTimestamps: [yesterdayTs],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("shows first remote host info in alert row", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, remoteIp: "93.184.216.34", remotePort: 443 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
    });

    render(<AlertsTab connection={null} onNavigateToAlert={() => {}} />);
    expect(screen.getByText(/93\.184\.216\.34:443/)).toBeInTheDocument();
  });
});
