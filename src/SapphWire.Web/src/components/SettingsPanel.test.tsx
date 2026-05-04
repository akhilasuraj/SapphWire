import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SettingsPanel from "./SettingsPanel";
import * as useSettingsModule from "../useSettings";
import type { SettingsHookResult } from "../useSettings";

const defaultSettings: SettingsHookResult = {
  settings: { autostartEnabled: true, toastEnabled: true },
  info: {
    settings: { autostartEnabled: true, toastEnabled: true },
    dbPath: "C:\\Users\\test\\AppData\\Local\\SapphWire\\sapphwire.db",
    dbSizeBytes: 2097152,
    version: "1.0.0",
    buildHash: "abc123def",
    logsPath: "C:\\Users\\test\\AppData\\Local\\SapphWire\\logs",
  },
  isPaused: false,
  setAutostart: vi.fn().mockResolvedValue(undefined),
  setToastEnabled: vi.fn().mockResolvedValue(undefined),
  clearData: vi.fn().mockResolvedValue(undefined),
  pauseMonitoring: vi.fn().mockResolvedValue(undefined),
  resumeMonitoring: vi.fn().mockResolvedValue(undefined),
};

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.spyOn(useSettingsModule, "useSettings").mockReturnValue(defaultSettings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders section headings", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders autostart toggle with correct state", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    const toggle = screen.getByLabelText("Start SapphWire with Windows");
    expect(toggle).toBeChecked();
  });

  it("calls setAutostart when autostart toggle is clicked", async () => {
    const setAutostart = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(useSettingsModule, "useSettings").mockReturnValue({
      ...defaultSettings,
      setAutostart,
    });

    render(<SettingsPanel connection={null} onClose={() => {}} />);
    const toggle = screen.getByLabelText("Start SapphWire with Windows");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setAutostart).toHaveBeenCalledWith(false);
    });
  });

  it("renders toast toggle with correct state", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    const toggle = screen.getByLabelText(
      "Show Windows toast on first-activity alerts",
    );
    expect(toggle).toBeChecked();
  });

  it("calls setToastEnabled when toast toggle is clicked", async () => {
    const setToastEnabled = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(useSettingsModule, "useSettings").mockReturnValue({
      ...defaultSettings,
      setToastEnabled,
    });

    render(<SettingsPanel connection={null} onClose={() => {}} />);
    const toggle = screen.getByLabelText(
      "Show Windows toast on first-activity alerts",
    );
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setToastEnabled).toHaveBeenCalledWith(false);
    });
  });

  it("renders Pause monitoring button when not paused", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("Pause monitoring")).toBeInTheDocument();
  });

  it("renders Resume monitoring button when paused", () => {
    vi.spyOn(useSettingsModule, "useSettings").mockReturnValue({
      ...defaultSettings,
      isPaused: true,
    });
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("Resume monitoring")).toBeInTheDocument();
  });

  it("calls pauseMonitoring when Pause button is clicked", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Pause monitoring"));
    expect(defaultSettings.pauseMonitoring).toHaveBeenCalled();
  });

  it("displays database path", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(
      screen.getByText(
        "C:\\Users\\test\\AppData\\Local\\SapphWire\\sapphwire.db",
      ),
    ).toBeInTheDocument();
  });

  it("displays database size formatted", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("renders Clear all data button", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("Clear all data")).toBeInTheDocument();
  });

  it("shows confirm dialog on Clear all data click", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Clear all data"));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("calls clearData when confirm is clicked", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Clear all data"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(defaultSettings.clearData).toHaveBeenCalled();
  });

  it("displays version and build hash", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("abc123def")).toBeInTheDocument();
  });

  it("renders Show logs link", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("Show logs")).toBeInTheDocument();
  });

  it("renders close button and calls onClose", () => {
    const onClose = vi.fn();
    render(<SettingsPanel connection={null} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close settings"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders Open data folder button", () => {
    render(<SettingsPanel connection={null} onClose={() => {}} />);
    expect(screen.getByText("Open data folder")).toBeInTheDocument();
  });
});
