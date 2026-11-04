import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import About from "../pages/About";

describe("About Page (Our Story)", () => {
  it("renders the hero section with primary heading and heritage eyebrow", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByText("Heritage & Vision")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Story of AURIX", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Founded on a devotion to rare botanical harvests/i)
    ).toBeInTheDocument();
  });

  it("renders the brand philosophy section and all four guiding creed pillars", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByText("Our Guiding Creed")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "An Intimate Expression of Identity",
        level: 2,
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Artisanal Small-Batch")).toBeInTheDocument();
    expect(screen.getByText("Ethical Raw Sourcing")).toBeInTheDocument();
    expect(screen.getByText("Bespoke Identity")).toBeInTheDocument();
    expect(screen.getByText("Collaborative Mastery")).toBeInTheDocument();
  });

  it("renders the three craftsmanship formulation steps with numbers", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByText("Craftsmanship")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "From Blossom to Flacon", level: 2 })
    ).toBeInTheDocument();

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ethical Harvest", level: 3 })
    ).toBeInTheDocument();

    expect(screen.getByText("02")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Artisanal Maceration", level: 3 })
    ).toBeInTheDocument();

    expect(screen.getByText("03")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Precision Bottling", level: 3 })
    ).toBeInTheDocument();
  });

  it("renders the atelier team profiles with all four artisans and titles", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByText("The Atelier")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Hands Behind AURIX", level: 2 })
    ).toBeInTheDocument();

    // Usama Malik
    expect(
      screen.getByRole("heading", { name: "Usama Malik", level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByText("Founder & Creative Director")).toBeInTheDocument();

    // Michel Lambert
    expect(
      screen.getByRole("heading", { name: "Michel Lambert", level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByText("Master Perfumer")).toBeInTheDocument();

    // Amélie Roux
    expect(
      screen.getByRole("heading", { name: "Amélie Roux", level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByText("Naturals Specialist")).toBeInTheDocument();

    // Thomas Martin
    expect(
      screen.getByRole("heading", { name: "Thomas Martin", level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByText("Design & Presentation")).toBeInTheDocument();
  });

  it("renders the ethical pledge with founder quote", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Our Ethical Pledge", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/To bottle a fragrance is to encapsulate a memory/i)
    ).toBeInTheDocument();
    expect(screen.getByText("— Usama Malik, Founder")).toBeInTheDocument();
  });

  it("renders calls-to-action with correct navigation routes", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: "Experience Haute Perfumery", level: 2 })
    ).toBeInTheDocument();

    const exploreLink = screen.getByRole("link", { name: "Explore Collection" });
    expect(exploreLink).toHaveAttribute("href", "/products");

    const conciergeLink = screen.getByRole("link", { name: "Contact Concierge" });
    expect(conciergeLink).toHaveAttribute("href", "/contact");
  });

  it("verifies all images have appropriate alt text attributes", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    const images = screen.getAllByRole("img");
    expect(images.length).toBe(5);

    const alts = images.map((img) => img.getAttribute("alt"));
    expect(alts).toContain("Artisanal perfume compounding");
    expect(alts).toContain("Usama Malik");
    expect(alts).toContain("Michel Lambert");
    expect(alts).toContain("Amélie Roux");
    expect(alts).toContain("Thomas Martin");
  });
});
