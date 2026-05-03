import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConnections, type ConnectionDetail } from "./useConnections";

function makeDetail(overrides: Partial<ConnectionDetail> = {}): ConnectionDetail {
  return {
    exeName: "chrome",
    pid: 1234,
    remoteHost: "google.com",
    remotePort: 443,
    up: 100,
    down: 200,
    countryCode: "US",
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

describe("useConnections", () => {
  let mockConn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    mockConn = createMockConnection();
  });

  it("returns empty array when appId is null", () => {
    const { result } = renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], null),
    );
    expect(result.current).toEqual([]);
    expect(mockConn.invoke).not.toHaveBeenCalled();
  });

  it("subscribes to connections/{appId} on mount", () => {
    renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], "Chrome"),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeConnections", "Chrome");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], "Chrome"),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeConnections", "Chrome");
  });

  it("registers ConnectionsSnapshot and ConnectionsDelta handlers", () => {
    renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], "Chrome"),
    );
    expect(mockConn.on).toHaveBeenCalledWith("ConnectionsSnapshot", expect.any(Function));
    expect(mockConn.on).toHaveBeenCalledWith("ConnectionsDelta", expect.any(Function));
  });

  it("updates state on ConnectionsDelta", () => {
    const { result } = renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], "Chrome"),
    );

    const details = [makeDetail(), makeDetail({ exeName: "helper", pid: 5678 })];

    act(() => {
      mockConn._emit("ConnectionsDelta", details);
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0].exeName).toBe("chrome");
    expect(result.current[1].exeName).toBe("helper");
  });

  it("updates state on ConnectionsSnapshot", () => {
    const { result } = renderHook(() =>
      useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], "Chrome"),
    );

    act(() => {
      mockConn._emit("ConnectionsSnapshot", [makeDetail({ pid: 999 })]);
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].pid).toBe(999);
  });

  it("clears data and resubscribes when appId changes", () => {
    const { result, rerender } = renderHook(
      ({ appId }) =>
        useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], appId),
      { initialProps: { appId: "Chrome" as string | null } },
    );

    act(() => {
      mockConn._emit("ConnectionsDelta", [makeDetail()]);
    });
    expect(result.current).toHaveLength(1);

    rerender({ appId: "Discord" });
    expect(result.current).toEqual([]);
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeConnections", "Chrome");
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeConnections", "Discord");
  });

  it("clears data when appId becomes null", () => {
    const { result, rerender } = renderHook(
      ({ appId }) =>
        useConnections(mockConn as unknown as Parameters<typeof useConnections>[0], appId),
      { initialProps: { appId: "Chrome" as string | null } },
    );

    act(() => {
      mockConn._emit("ConnectionsDelta", [makeDetail()]);
    });
    expect(result.current).toHaveLength(1);

    rerender({ appId: null });
    expect(result.current).toEqual([]);
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeConnections", "Chrome");
  });

  it("returns empty array when connection is null", () => {
    const { result } = renderHook(() => useConnections(null, "Chrome"));
    expect(result.current).toEqual([]);
  });
});
