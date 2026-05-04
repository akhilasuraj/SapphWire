import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TopBar from "./TopBar";

describe("TopBar", () => {
  it("renders the app name", () => {
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={() => {}}
        onSettingsClick={() => {}}
      />,
    );
    expect(screen.getByText("SapphWire")).toBeInTheDocument();
  });

  it("renders all five tab labels", () => {
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={() => {}}
        onSettingsClick={() => {}}
      />,
    );
    const tabs = ["Graph", "Usage", "Things", "Firewall", "Alerts"];
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });

  it("highlights the active tab", () => {
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={() => {}}
        onSettingsClick={() => {}}
      />,
    );
    const graphButton = screen.getByText("Graph");
    expect(graphButton).toHaveClass("border-blue-500");
  });

  it("calls onTabChange when a tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={onTabChange}
        onSettingsClick={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Usage"));
    expect(onTabChange).toHaveBeenCalledWith("Usage");
  });

  it("renders settings gear button", () => {
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={() => {}}
        onSettingsClick={() => {}}
      />,
    );
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });

  it("calls onSettingsClick when gear is clicked", () => {
    const onSettingsClick = vi.fn();
    render(
      <TopBar
        activeTab="Graph"
        onTabChange={() => {}}
        onSettingsClick={onSettingsClick}
      />,
    );
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(onSettingsClick).toHaveBeenCalled();
  });
});
