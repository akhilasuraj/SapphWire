import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TopBar from "./TopBar";

describe("TopBar", () => {
  it("renders the app name", () => {
    render(<TopBar activeTab="Graph" onTabChange={() => {}} />);
    expect(screen.getByText("SapphWire")).toBeInTheDocument();
  });

  it("renders all five tab labels", () => {
    render(<TopBar activeTab="Graph" onTabChange={() => {}} />);
    const tabs = ["Graph", "Usage", "Things", "Firewall", "Alerts"];
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });

  it("highlights the active tab", () => {
    render(<TopBar activeTab="Graph" onTabChange={() => {}} />);
    const graphButton = screen.getByText("Graph");
    expect(graphButton).toHaveClass("border-blue-500");
  });

  it("calls onTabChange when a tab is clicked", () => {
    const onTabChange = vi.fn();
    render(<TopBar activeTab="Graph" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText("Usage"));
    expect(onTabChange).toHaveBeenCalledWith("Usage");
  });
});
