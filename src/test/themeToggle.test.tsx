import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeToggle } from "../components/layout/ThemeToggle";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockCurrentTheme = "light";
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockCurrentTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentTheme = "light";
    mockResolvedTheme = "light";
  });

  it("renders light mode state with dark toggle action and aria-label", () => {
    mockCurrentTheme = "light";
    mockResolvedTheme = "light";

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Switch to dark theme");

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("renders dark mode state with light toggle action and aria-label", () => {
    mockCurrentTheme = "dark";
    mockResolvedTheme = "dark";

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Switch to light theme" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Switch to light theme");

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("renders showLabel variant correctly in light mode", () => {
    mockCurrentTheme = "light";
    mockResolvedTheme = "light";

    render(<ThemeToggle showLabel />);

    const button = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText(/Appearance:/i)).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("renders showLabel variant correctly in dark mode", () => {
    mockCurrentTheme = "dark";
    mockResolvedTheme = "dark";

    render(<ThemeToggle showLabel />);

    const button = screen.getByRole("button", { name: "Switch to light theme" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText(/Appearance:/i)).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("applies custom class names to the toggle button", () => {
    const { container } = render(<ThemeToggle className="custom-test-class hidden sm:flex" />);
    const button = container.querySelector("button");
    expect(button).toHaveClass("custom-test-class");
    expect(button).toHaveClass("hidden");
    expect(button).toHaveClass("sm:flex");
  });
});
