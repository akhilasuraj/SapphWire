import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TopBar from "./TopBar";

describe("TopBar", () => {
  it("renders the app name", () => {
    render(<TopBar />);
    expect(screen.getByText("SapphWire")).toBeInTheDocument();
  });

  it("renders all five tab labels", () => {
    render(<TopBar />);
    const tabs = ["Graph", "Usage", "Things", "Firewall", "Alerts"];
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });
});
