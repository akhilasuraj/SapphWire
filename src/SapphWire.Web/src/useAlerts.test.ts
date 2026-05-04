import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAlerts, type AlertRecord } from "./useAlerts";

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

function createMockConnection() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      }
    }),
    invoke: vi.fn(() => Promise.resolve()),
    _emit(event: string, ...args: unknown[]) {
      (handlers[event] || []).forEach((h) => h(...args));
    },
  };
}

describe("useAlerts", () => {
  let mockConn: ReturnType<typeof createMockConnection>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConn = createMockConnection();
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty alerts when connection is null", () => {
    const { result } = renderHook(() => useAlerts(null));
    expect(result.current.alerts).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("subscribes to alerts SignalR group on mount", () => {
    renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeAlerts");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeAlerts");
  });

  it("populates alerts on AlertsSnapshot", () => {
    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [
        makeAlert({ id: 1 }),
        makeAlert({ id: 2, appName: "Discord" }),
      ]);
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0].appName).toBe("Chrome");
  });

  it("prepends new alert on NewAlert event", () => {
    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [makeAlert({ id: 1 })]);
    });

    act(() => {
      mockConn._emit(
        "NewAlert",
        makeAlert({ id: 2, appName: "Firefox", timestamp: "2024-06-01T13:00:00.000Z" }),
      );
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0].appName).toBe("Firefox");
  });

  it("unreadCount reflects unread alerts", () => {
    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [
        makeAlert({ id: 1, isRead: false }),
        makeAlert({ id: 2, isRead: true }),
        makeAlert({ id: 3, isRead: false }),
      ]);
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it("markRead calls hub and updates local state", async () => {
    mockConn.invoke.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [makeAlert({ id: 5, isRead: false })]);
    });

    await act(async () => {
      await result.current.markRead(5);
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("MarkAlertRead", 5);
    expect(result.current.alerts[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllRead calls hub and updates all alerts", async () => {
    mockConn.invoke.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [
        makeAlert({ id: 1, isRead: false }),
        makeAlert({ id: 2, isRead: false }),
      ]);
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("MarkAllAlertsRead");
    expect(result.current.alerts.every((a) => a.isRead)).toBe(true);
  });

  it("deleteAlert calls hub and removes from list", async () => {
    mockConn.invoke.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [
        makeAlert({ id: 1 }),
        makeAlert({ id: 2, appName: "Discord" }),
      ]);
    });

    await act(async () => {
      await result.current.deleteAlert(1);
    });

    expect(mockConn.invoke).toHaveBeenCalledWith("DeleteAlert", 1);
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].appName).toBe("Discord");
  });

  it("alertTimestamps returns ISO strings of all alert timestamps", () => {
    const { result } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    act(() => {
      mockConn._emit("AlertsSnapshot", [
        makeAlert({ id: 1, timestamp: "2024-06-01T12:00:00.000Z" }),
        makeAlert({ id: 2, timestamp: "2024-06-01T13:00:00.000Z" }),
      ]);
    });

    expect(result.current.alertTimestamps).toEqual([
      "2024-06-01T12:00:00.000Z",
      "2024-06-01T13:00:00.000Z",
    ]);
  });

  it("registers and removes SignalR handlers", () => {
    const { unmount } = renderHook(() =>
      useAlerts(mockConn as unknown as Parameters<typeof useAlerts>[0]),
    );

    expect(mockConn.on).toHaveBeenCalledWith(
      "AlertsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.on).toHaveBeenCalledWith("NewAlert", expect.any(Function));

    unmount();

    expect(mockConn.off).toHaveBeenCalledWith(
      "AlertsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.off).toHaveBeenCalledWith(
      "NewAlert",
      expect.any(Function),
    );
  });
});
