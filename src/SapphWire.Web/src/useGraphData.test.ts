import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./useLiveThroughput", () => ({
  useLiveThroughput: vi.fn(() => []),
}));

import {
  useGraphData,
  type GraphPoint,
  type TimePill,
  type FilterPill,
} from "./useGraphData";
import { useLiveThroughput, type ThroughputPoint } from "./useLiveThroughput";

const mockUseLiveThroughput = vi.mocked(useLiveThroughput);

function createMockConnection() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    invoke: vi.fn().mockResolvedValue([]),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    _handlers: handlers,
  };
}

type Conn = Parameters<typeof useGraphData>[0];

describe("useGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLiveThroughput.mockReturnValue([]);
  });

  it("returns empty data when connection is null", () => {
    const { result } = renderHook(() =>
      useGraphData(null, "5 Minutes", "All"),
    );
    expect(result.current).toEqual([]);
  });

  it("delegates to useLiveThroughput for 5 Minutes + All", () => {
    const liveData: ThroughputPoint[] = [
      { timestamp: "2024-01-01T00:00:00Z", totalUp: 100, totalDown: 200 },
      { timestamp: "2024-01-01T00:00:01Z", totalUp: 50, totalDown: 150 },
    ];
    mockUseLiveThroughput.mockReturnValue(liveData);

    const conn = createMockConnection();
    const { result } = renderHook(() =>
      useGraphData(conn as unknown as Conn, "5 Minutes", "All"),
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].values["Total"]).toBe(300);
    expect(result.current[1].values["Total"]).toBe(200);
  });

  it("passes connection to useLiveThroughput when 5 Minutes + All", () => {
    const conn = createMockConnection();
    renderHook(() =>
      useGraphData(conn as unknown as Conn, "5 Minutes", "All"),
    );

    expect(mockUseLiveThroughput).toHaveBeenCalledWith(conn);
  });

  it("passes null to useLiveThroughput when not in live mode", () => {
    const conn = createMockConnection();
    renderHook(() =>
      useGraphData(conn as unknown as Conn, "3 Hours", "All"),
    );

    expect(mockUseLiveThroughput).toHaveBeenCalledWith(null);
  });

  it("invokes GetGraphSeries for non-live time pills", async () => {
    const conn = createMockConnection();
    const historical: GraphPoint[] = [
      { timestamp: "2024-01-01T10:00:00Z", values: { Total: 5000 } },
      { timestamp: "2024-01-01T10:01:00Z", values: { Total: 3000 } },
    ];
    conn.invoke.mockResolvedValue(historical);

    const { result } = renderHook(() =>
      useGraphData(conn as unknown as Conn, "3 Hours", "All"),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetGraphSeries",
        expect.any(String),
        expect.any(String),
        60,
        "None",
      );
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
      expect(result.current[0].values["Total"]).toBe(5000);
    });
  });

  it("invokes GetGraphSeries with groupBy App for Apps filter", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useGraphData(conn as unknown as Conn, "3 Hours", "Apps"),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetGraphSeries",
        expect.any(String),
        expect.any(String),
        60,
        "App",
      );
    });
  });

  it("invokes GetGraphSeries with groupBy Publisher for Publishers filter", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useGraphData(conn as unknown as Conn, "3 Hours", "Publishers"),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetGraphSeries",
        expect.any(String),
        expect.any(String),
        60,
        "Publisher",
      );
    });
  });

  it("re-queries when timePill changes", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ pill }: { pill: TimePill }) =>
        useGraphData(conn as unknown as Conn, pill, "All"),
      { initialProps: { pill: "3 Hours" as TimePill } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ pill: "24 Hours" });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("re-queries when filterPill changes", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ filter }: { filter: FilterPill }) =>
        useGraphData(conn as unknown as Conn, "3 Hours", filter),
      { initialProps: { filter: "All" as FilterPill } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ filter: "Apps" });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("uses correct bucket sizes for each pill", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    const pills = [
      { pill: "3 Hours" as const, bucket: 60 },
      { pill: "24 Hours" as const, bucket: 300 },
      { pill: "Week" as const, bucket: 3600 },
      { pill: "Month" as const, bucket: 3600 },
    ];

    for (const { pill, bucket } of pills) {
      vi.clearAllMocks();
      conn.invoke.mockResolvedValue([]);

      renderHook(() =>
        useGraphData(conn as unknown as Conn, pill, "All"),
      );

      await waitFor(() => {
        expect(conn.invoke).toHaveBeenCalledWith(
          "GetGraphSeries",
          expect.any(String),
          expect.any(String),
          bucket,
          "None",
        );
      });
    }
  });

  it("polls for 5 Minutes + Apps filter", async () => {
    vi.useFakeTimers();
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useGraphData(conn as unknown as Conn, "5 Minutes", "Apps"),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(conn.invoke).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(conn.invoke).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("invokes with bucket=1 and groupBy=App for 5 Minutes + Apps", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useGraphData(conn as unknown as Conn, "5 Minutes", "Apps"),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetGraphSeries",
        expect.any(String),
        expect.any(String),
        1,
        "App",
      );
    });
  });

  it("does not poll for historical time pills", async () => {
    vi.useFakeTimers();
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue([]);

    renderHook(() =>
      useGraphData(conn as unknown as Conn, "3 Hours", "All"),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(conn.invoke).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(conn.invoke).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("clears historical data when switching to live mode", async () => {
    const conn = createMockConnection();
    const historical: GraphPoint[] = [
      { timestamp: "2024-01-01T10:00:00Z", values: { Total: 5000 } },
    ];
    conn.invoke.mockResolvedValue(historical);

    const { result, rerender } = renderHook(
      ({ pill, filter }: { pill: TimePill; filter: FilterPill }) =>
        useGraphData(conn as unknown as Conn, pill, filter),
      {
        initialProps: {
          pill: "3 Hours" as TimePill,
          filter: "All" as FilterPill,
        },
      },
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    mockUseLiveThroughput.mockReturnValue([]);
    await act(async () => {
      rerender({ pill: "5 Minutes", filter: "All" });
    });

    expect(result.current).toEqual([]);
  });
});
