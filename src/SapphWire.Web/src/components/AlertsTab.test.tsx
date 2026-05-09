import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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

function mockConnection() {
  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as import("@microsoft/signalr").HubConnection;
}

describe("AlertsTab", () => {
  let mockMarkRead: (id: number) => Promise<void>;
  let mockMarkAllRead: () => Promise<void>;
  let mockDeleteAlert: (id: number) => Promise<void>;
  let mockDeleteAllAlerts: () => Promise<void>;

  beforeEach(() => {
    mockMarkRead = vi.fn().mockResolvedValue(undefined) as unknown as (id: number) => Promise<void>;
    mockMarkAllRead = vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;
    mockDeleteAlert = vi.fn().mockResolvedValue(undefined) as unknown as (id: number) => Promise<void>;
    mockDeleteAllAlerts = vi.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;

    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [],
      unreadCount: 0,
      alertTimestamps: [],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    vi.spyOn(useFirewallModule, "useFirewall").mockReturnValue(defaultFirewall);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Important and All pills", () => {
    render(<AlertsTab connection={null} />);
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("does not render Logs pill (hidden in v1)", () => {
    render(<AlertsTab connection={null} />);
    expect(screen.queryByText("Logs")).not.toBeInTheDocument();
  });

  it("renders Mark all read button", () => {
    render(<AlertsTab connection={null} />);
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("shows empty state when no alerts", () => {
    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
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
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    expect(screen.getByText(/93\.184\.216\.34:443/)).toBeInTheDocument();
  });

  // --- Clear All ---

  it("shows Clear all button when alerts exist", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("does not show Clear all button when no alerts", () => {
    render(<AlertsTab connection={null} />);
    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("first click on Clear all morphs to Confirm state", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    fireEvent.click(screen.getByText("Clear all"));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("second click on Confirm calls deleteAllAlerts", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    fireEvent.click(screen.getByText("Clear all"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(mockDeleteAllAlerts).toHaveBeenCalled();
  });

  it("Confirm reverts to Clear all after timeout", () => {
    vi.useFakeTimers();
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1 })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    fireEvent.click(screen.getByText("Clear all"));
    expect(screen.getByText("Confirm")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.getByText("Clear all")).toBeInTheDocument();
    vi.useRealTimers();
  });

  // --- Show in Firewall navigation ---

  it("Show in Firewall tab calls onNavigateToFirewall", () => {
    const onNavigateToFirewall = vi.fn();
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, appName: "Chrome" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} onNavigateToFirewall={onNavigateToFirewall} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    fireEvent.click(screen.getByText("Show in Firewall tab"));
    expect(onNavigateToFirewall).toHaveBeenCalledWith("Chrome");
  });

  // --- Open file location ---

  it("Open file location button is hidden when exePath is null", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, exePath: null })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    expect(screen.queryByText("Open file location")).not.toBeInTheDocument();
  });

  it("Open file location button is visible when exePath is present", () => {
    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, exePath: "C:\\app\\test.exe" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={null} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));
    expect(screen.getByText("Open file location")).toBeInTheDocument();
  });

  it("Open file location calls connection.invoke with exePath", async () => {
    const conn = mockConnection();
    (conn.invoke as ReturnType<typeof vi.fn>).mockImplementation((method: string) => {
      if (method === "CheckFileExists") return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, exePath: "C:\\app\\test.exe" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={conn} onNavigateToFirewall={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("alert-row-1"));
    });
    fireEvent.click(screen.getByText("Open file location"));
    expect(conn.invoke).toHaveBeenCalledWith("OpenFileLocation", "C:\\app\\test.exe");
  });

  it("Open file location button is disabled with tooltip when file does not exist", async () => {
    const conn = mockConnection();
    (conn.invoke as ReturnType<typeof vi.fn>).mockImplementation((method: string) => {
      if (method === "CheckFileExists") return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, exePath: "C:\\app\\missing.exe" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={conn} onNavigateToFirewall={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));

    await waitFor(() => {
      const btn = screen.getByText("Open file location");
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "File no longer exists on disk");
    });
  });

  it("Open file location button is enabled when file exists on disk", async () => {
    const conn = mockConnection();
    (conn.invoke as ReturnType<typeof vi.fn>).mockImplementation((method: string) => {
      if (method === "CheckFileExists") return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    vi.spyOn(useAlertsModule, "useAlerts").mockReturnValue({
      alerts: [makeAlert({ id: 1, exePath: "C:\\app\\test.exe" })],
      unreadCount: 1,
      alertTimestamps: ["2024-06-01T12:00:00.000Z"],
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      deleteAlert: mockDeleteAlert,
      deleteAllAlerts: mockDeleteAllAlerts,
    });

    render(<AlertsTab connection={conn} onNavigateToFirewall={() => {}} />);
    fireEvent.click(screen.getByTestId("alert-row-1"));

    await waitFor(() => {
      const btn = screen.getByText("Open file location");
      expect(btn).not.toBeDisabled();
      expect(btn).not.toHaveAttribute("title");
    });
  });
});
