import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActiveApps, type ActiveAppRow } from "./useActiveApps";

function makeDelta(overrides: Partial<ActiveAppRow> = {}): ActiveAppRow {
  return {
    appId: "App",
    displayName: "App",
    iconUrl: "",
    up: 0,
    down: 0,
    sparkPoint: 0,
    topEndpoint: "0.0.0.0:0",
    endpointCount: 1,
    countryCode: null,
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

describe("useActiveApps", () => {
  let mockConn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    mockConn = createMockConnection();
  });

  it("returns empty array when connection is null", () => {
    const { result } = renderHook(() => useActiveApps(null));
    expect(result.current.apps).toEqual([]);
  });

  it("subscribes to activeApps on mount", () => {
    renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );
    expect(mockConn.invoke).toHaveBeenCalledWith("SubscribeActiveApps");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );
    unmount();
    expect(mockConn.invoke).toHaveBeenCalledWith("UnsubscribeActiveApps");
  });

  it("registers ActiveAppsSnapshot and ActiveAppsDelta handlers", () => {
    renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );
    expect(mockConn.on).toHaveBeenCalledWith(
      "ActiveAppsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.on).toHaveBeenCalledWith(
      "ActiveAppsDelta",
      expect.any(Function),
    );
  });

  it("removes handlers on unmount", () => {
    const { unmount } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );
    unmount();
    expect(mockConn.off).toHaveBeenCalledWith(
      "ActiveAppsSnapshot",
      expect.any(Function),
    );
    expect(mockConn.off).toHaveBeenCalledWith(
      "ActiveAppsDelta",
      expect.any(Function),
    );
  });

  it("updates state on ActiveAppsSnapshot", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    const snapshot: ActiveAppRow[] = [
      {
        appId: "Chrome",
        displayName: "Chrome",
        iconUrl: "/api/icons/Chrome",
        up: 1000,
        down: 2000,
        sparkPoint: 3000,
        topEndpoint: "google.com:443",
        endpointCount: 5,
        countryCode: "US",
      },
    ];

    act(() => {
      mockConn._emit("ActiveAppsSnapshot", snapshot);
    });

    expect(result.current.apps).toEqual(snapshot);
  });

  it("replaces state on each ActiveAppsDelta", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    const delta1: ActiveAppRow[] = [
      {
        appId: "Chrome",
        displayName: "Chrome",
        iconUrl: "/api/icons/Chrome",
        up: 1000,
        down: 2000,
        sparkPoint: 3000,
        topEndpoint: "google.com:443",
        endpointCount: 5,
        countryCode: "US",
      },
    ];

    act(() => {
      mockConn._emit("ActiveAppsDelta", delta1);
    });
    expect(result.current.apps).toHaveLength(1);
    expect(result.current.apps[0].appId).toBe("Chrome");

    const delta2: ActiveAppRow[] = [
      {
        appId: "Discord",
        displayName: "Discord",
        iconUrl: "/api/icons/Discord",
        up: 500,
        down: 800,
        sparkPoint: 1300,
        topEndpoint: "discord.gg:443",
        endpointCount: 3,
        countryCode: "US",
      },
    ];

    act(() => {
      mockConn._emit("ActiveAppsDelta", delta2);
    });
    expect(result.current.apps).toHaveLength(1);
    expect(result.current.apps[0].appId).toBe("Discord");
  });

  it("clears data on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        {
          appId: "X",
          displayName: "X",
          iconUrl: "",
          up: 1,
          down: 1,
          sparkPoint: 2,
          topEndpoint: "a:1",
          endpointCount: 1,
          countryCode: null,
        },
      ]);
    });
    expect(result.current.apps).toHaveLength(1);

    unmount();
  });

  it("handles invoke rejection gracefully", async () => {
    mockConn.invoke.mockRejectedValueOnce(new Error("not connected"));

    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    expect(result.current.apps).toEqual([]);
  });

  it("accumulates sparkHistory from successive deltas", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 100 }),
      ]);
    });
    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 200 }),
      ]);
    });
    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 150 }),
      ]);
    });

    expect(result.current.sparkHistory["Chrome"]).toEqual([100, 200, 150]);
  });

  it("caps sparkHistory at 60 points per app", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    for (let i = 0; i < 70; i++) {
      act(() => {
        mockConn._emit("ActiveAppsDelta", [
          makeDelta({ appId: "Chrome", sparkPoint: i }),
        ]);
      });
    }

    expect(result.current.sparkHistory["Chrome"]).toHaveLength(60);
    expect(result.current.sparkHistory["Chrome"][0]).toBe(10);
    expect(result.current.sparkHistory["Chrome"][59]).toBe(69);
  });

  it("tracks sparkHistory separately per app", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 100 }),
        makeDelta({ appId: "Discord", sparkPoint: 50 }),
      ]);
    });
    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 200 }),
      ]);
    });

    expect(result.current.sparkHistory["Chrome"]).toEqual([100, 200]);
    expect(result.current.sparkHistory["Discord"]).toEqual([50]);
  });

  it("resets sparkHistory on snapshot", () => {
    const { result } = renderHook(() =>
      useActiveApps(mockConn as unknown as Parameters<typeof useActiveApps>[0]),
    );

    act(() => {
      mockConn._emit("ActiveAppsDelta", [
        makeDelta({ appId: "Chrome", sparkPoint: 100 }),
      ]);
    });
    expect(result.current.sparkHistory["Chrome"]).toEqual([100]);

    act(() => {
      mockConn._emit("ActiveAppsSnapshot", [
        makeDelta({ appId: "Chrome", sparkPoint: 999 }),
      ]);
    });

    expect(result.current.sparkHistory["Chrome"]).toEqual([999]);
  });
});
