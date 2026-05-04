import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useUsageData,
  type UsagePeriod,
  type UsagePill,
  type UsageFilters,
  type UsageData,
} from "./useUsageData";

function createMockConnection() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    invoke: vi.fn().mockResolvedValue(emptyResult()),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    _handlers: handlers,
  };
}

function emptyResult(): UsageData {
  return {
    left: [],
    middle: [],
    right: [],
    totalUp: 0,
    totalDown: 0,
    sparkline: [],
  };
}

type Conn = Parameters<typeof useUsageData>[0];

const NO_FILTERS: UsageFilters = { left: [], middle: [], right: [] };

describe("useUsageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty data when connection is null", () => {
    const { result } = renderHook(() =>
      useUsageData(null, "Day", 0, "Apps", NO_FILTERS),
    );
    expect(result.current.left).toEqual([]);
    expect(result.current.totalUp).toBe(0);
  });

  it("invokes GetUsage on connection with correct parameters for Day", async () => {
    const conn = createMockConnection();
    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", 0, "Apps", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetUsage",
        expect.any(String),
        expect.any(String),
        "App",
        NO_FILTERS,
      );
    });
  });

  it("maps Publishers pill to Publisher grouping", async () => {
    const conn = createMockConnection();
    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", 0, "Publishers", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetUsage",
        expect.any(String),
        expect.any(String),
        "Publisher",
        NO_FILTERS,
      );
    });
  });

  it("maps Traffic pill to Protocol grouping", async () => {
    const conn = createMockConnection();
    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", 0, "Traffic", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetUsage",
        expect.any(String),
        expect.any(String),
        "Protocol",
        NO_FILTERS,
      );
    });
  });

  it("returns data from hub invocation", async () => {
    const conn = createMockConnection();
    const mockData: UsageData = {
      left: [{ name: "Chrome", bytesUp: 100, bytesDown: 500 }],
      middle: [{ name: "google.com", bytesUp: 80, bytesDown: 400 }],
      right: [{ name: "HTTPS", bytesUp: 90, bytesDown: 450 }],
      totalUp: 100,
      totalDown: 500,
      sparkline: [{ timestamp: "2024-01-01T00:00:00Z", value: 600 }],
    };
    conn.invoke.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", 0, "Apps", NO_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.left).toHaveLength(1);
      expect(result.current.left[0].name).toBe("Chrome");
      expect(result.current.totalUp).toBe(100);
      expect(result.current.totalDown).toBe(500);
    });
  });

  it("re-queries when period changes", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    const { rerender } = renderHook(
      ({ period }: { period: UsagePeriod }) =>
        useUsageData(conn as unknown as Conn, period, 0, "Apps", NO_FILTERS),
      { initialProps: { period: "Day" as UsagePeriod } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ period: "Week" });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("re-queries when offset changes", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    const { rerender } = renderHook(
      ({ offset }: { offset: number }) =>
        useUsageData(conn as unknown as Conn, "Day", offset, "Apps", NO_FILTERS),
      { initialProps: { offset: 0 } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ offset: -1 });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("re-queries when pill changes", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    const { rerender } = renderHook(
      ({ pill }: { pill: UsagePill }) =>
        useUsageData(conn as unknown as Conn, "Day", 0, pill, NO_FILTERS),
      { initialProps: { pill: "Apps" as UsagePill } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ pill: "Publishers" });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("re-queries when filters change", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    const { rerender } = renderHook(
      ({ filters }: { filters: UsageFilters }) =>
        useUsageData(conn as unknown as Conn, "Day", 0, "Apps", filters),
      { initialProps: { filters: NO_FILTERS } },
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    rerender({ filters: { left: ["Chrome"], middle: [], right: [] } });

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(2);
    });
  });

  it("passes filters to hub invocation", async () => {
    const conn = createMockConnection();
    const filters: UsageFilters = {
      left: ["Chrome"],
      middle: ["google.com"],
      right: [],
    };
    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", 0, "Apps", filters),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledWith(
        "GetUsage",
        expect.any(String),
        expect.any(String),
        "App",
        filters,
      );
    });
  });

  it("computes correct date range for Day offset -1", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Day", -1, "Apps", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    const [, fromIso, toIso] = conn.invoke.mock.calls[0];
    const from = new Date(fromIso as string);
    const to = new Date(toIso as string);
    const diffHours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(24);
  });

  it("computes correct date range for Week", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Week", 0, "Apps", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    const [, fromIso, toIso] = conn.invoke.mock.calls[0];
    const from = new Date(fromIso as string);
    const to = new Date(toIso as string);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("computes correct date range for Month", async () => {
    const conn = createMockConnection();
    conn.invoke.mockResolvedValue(emptyResult());

    renderHook(() =>
      useUsageData(conn as unknown as Conn, "Month", 0, "Apps", NO_FILTERS),
    );

    await waitFor(() => {
      expect(conn.invoke).toHaveBeenCalledTimes(1);
    });

    const [, fromIso, toIso] = conn.invoke.mock.calls[0];
    const from = new Date(fromIso as string);
    const to = new Date(toIso as string);
    expect(from.getDate()).toBe(1);
    expect(to.getMonth()).toBe(from.getMonth() + 1 > 11 ? 0 : from.getMonth() + 1);
  });
});
