import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRankedApps, type RankedApp } from "./useRankedApps";

function createMockConnection() {
  return {
    invoke: vi.fn((): Promise<RankedApp[]> => Promise.resolve([])),
  };
}

function makeRanked(overrides: Partial<RankedApp> = {}): RankedApp {
  return {
    appId: "Chrome",
    cumulativeBytes: 5000000,
    currentUp: 100,
    currentDown: 200,
    lastSeen: "2026-05-10T00:00:00Z",
    isInstalledOnly: false,
    ...overrides,
  };
}

describe("useRankedApps", () => {
  let mockConn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConn = createMockConnection();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array when connection is null", () => {
    const { result } = renderHook(() => useRankedApps(null, false));
    expect(result.current).toEqual([]);
  });

  it("fetches ranked apps on mount", async () => {
    const ranked = [makeRanked()];
    mockConn.invoke.mockResolvedValue(ranked);

    const { result } = renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        false,
      ),
    );

    await act(async () => {});

    expect(mockConn.invoke).toHaveBeenCalledWith("GetRankedApps", false);
    expect(result.current).toEqual(ranked);
  });

  it("passes includeInstalled to hub method", async () => {
    mockConn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        true,
      ),
    );

    await act(async () => {});

    expect(mockConn.invoke).toHaveBeenCalledWith("GetRankedApps", true);
  });

  it("polls every 5 seconds", async () => {
    mockConn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        false,
      ),
    );

    await act(async () => {});
    expect(mockConn.invoke).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockConn.invoke).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockConn.invoke).toHaveBeenCalledTimes(3);
  });

  it("re-fetches when includeInstalled changes", async () => {
    mockConn.invoke.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ inc }: { inc: boolean }) =>
        useRankedApps(
          mockConn as unknown as Parameters<typeof useRankedApps>[0],
          inc,
        ),
      { initialProps: { inc: false } },
    );

    await act(async () => {});
    expect(mockConn.invoke).toHaveBeenLastCalledWith("GetRankedApps", false);

    rerender({ inc: true });
    await act(async () => {});

    expect(mockConn.invoke).toHaveBeenLastCalledWith("GetRankedApps", true);
  });

  it("handles invoke rejection gracefully", async () => {
    mockConn.invoke.mockRejectedValue(new Error("not connected"));

    const { result } = renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        false,
      ),
    );

    await act(async () => {});

    expect(result.current).toEqual([]);
  });

  it("clears interval on unmount", async () => {
    mockConn.invoke.mockResolvedValue([]);

    const { unmount } = renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        false,
      ),
    );

    await act(async () => {});
    expect(mockConn.invoke).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockConn.invoke).toHaveBeenCalledTimes(1);
  });

  it("returns apps in ranked order", async () => {
    const ranked = [
      makeRanked({ appId: "Chrome", cumulativeBytes: 10000000 }),
      makeRanked({ appId: "Discord", cumulativeBytes: 5000000 }),
      makeRanked({ appId: "Slack", cumulativeBytes: 1000000 }),
    ];
    mockConn.invoke.mockResolvedValue(ranked);

    const { result } = renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        false,
      ),
    );

    await act(async () => {});

    expect(result.current.map((a) => a.appId)).toEqual([
      "Chrome",
      "Discord",
      "Slack",
    ]);
  });

  it("includes installed-only apps when flag is set", async () => {
    const ranked = [
      makeRanked({ appId: "Chrome", cumulativeBytes: 10000000 }),
      makeRanked({
        appId: "Notepad",
        cumulativeBytes: 0,
        isInstalledOnly: true,
      }),
    ];
    mockConn.invoke.mockResolvedValue(ranked);

    const { result } = renderHook(() =>
      useRankedApps(
        mockConn as unknown as Parameters<typeof useRankedApps>[0],
        true,
      ),
    );

    await act(async () => {});

    expect(result.current).toHaveLength(2);
    expect(result.current[1].isInstalledOnly).toBe(true);
  });
});
