import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLiveThroughput, ThroughputPoint } from "./useLiveThroughput";

function createMockConnection() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    _handlers: handlers,
  };
}

describe("useLiveThroughput", () => {
  let conn: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    conn = createMockConnection();
  });

  it("returns empty data when connection is null", () => {
    const { result } = renderHook(() => useLiveThroughput(null));
    expect(result.current).toEqual([]);
  });

  it("subscribes to liveThroughput on mount", async () => {
    renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith("SubscribeLiveThroughput");
    });
  });

  it("registers ThroughputSnapshot and ThroughputDelta handlers", () => {
    renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    expect(conn.on).toHaveBeenCalledWith(
      "ThroughputSnapshot",
      expect.any(Function),
    );
    expect(conn.on).toHaveBeenCalledWith(
      "ThroughputDelta",
      expect.any(Function),
    );
  });

  it("populates data from snapshot", () => {
    const { result } = renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    const snapshot: ThroughputPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", totalUp: 100, totalDown: 200 },
      { timestamp: "2024-01-01T00:00:01Z", totalUp: 150, totalDown: 250 },
    ];

    act(() => {
      conn._handlers["ThroughputSnapshot"](snapshot);
    });

    expect(result.current).toEqual(snapshot);
  });

  it("appends delta points to existing data", () => {
    const { result } = renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    const snapshot: ThroughputPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", totalUp: 100, totalDown: 200 },
    ];

    act(() => {
      conn._handlers["ThroughputSnapshot"](snapshot);
    });

    const delta: ThroughputPoint = {
      timestamp: "2024-01-01T00:00:01Z",
      totalUp: 300,
      totalDown: 400,
    };

    act(() => {
      conn._handlers["ThroughputDelta"](delta);
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[1]).toEqual(delta);
  });

  it("trims data to 300 points max", () => {
    const { result } = renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    const snapshot: ThroughputPoint[] = Array.from({ length: 300 }, (_, i) => ({
      timestamp: `2024-01-01T00:0${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}Z`,
      totalUp: i,
      totalDown: i * 2,
    }));

    act(() => {
      conn._handlers["ThroughputSnapshot"](snapshot);
    });

    act(() => {
      conn._handlers["ThroughputDelta"]({
        timestamp: "2024-01-01T00:05:01Z",
        totalUp: 999,
        totalDown: 999,
      });
    });

    expect(result.current).toHaveLength(300);
    expect(result.current[299].totalUp).toBe(999);
  });

  it("unsubscribes and cleans up on unmount", async () => {
    const { unmount } = renderHook(() =>
      useLiveThroughput(conn as unknown as Parameters<typeof useLiveThroughput>[0]),
    );

    unmount();

    expect(conn.invoke).toHaveBeenCalledWith("UnsubscribeLiveThroughput");
    expect(conn.off).toHaveBeenCalledWith("ThroughputSnapshot");
    expect(conn.off).toHaveBeenCalledWith("ThroughputDelta");
  });

  it("clears data and resubscribes when connection changes", () => {
    const conn2 = createMockConnection();

    const { result, rerender } = renderHook(
      ({ c }) =>
        useLiveThroughput(c as unknown as Parameters<typeof useLiveThroughput>[0]),
      { initialProps: { c: conn } },
    );

    act(() => {
      conn._handlers["ThroughputSnapshot"]([
        { timestamp: "2024-01-01T00:00:00Z", totalUp: 100, totalDown: 200 },
      ]);
    });

    expect(result.current).toHaveLength(1);

    rerender({ c: conn2 });

    expect(result.current).toEqual([]);
    expect(conn.invoke).toHaveBeenCalledWith("UnsubscribeLiveThroughput");
    expect(conn2.invoke).toHaveBeenCalledWith("SubscribeLiveThroughput");
  });
});
