import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import Categories from "../pages/Categories";

// Mock hooks
const mockCategories = [
  {
    id: "cat-1",
    slug: "floral",
    name: "Floral",
    description: "Delicate and romantic blossoms.",
    image: "/category-floral.jpg",
    color: "#F7EBE8",
    sort_order: 1,
    is_active: true,
    type: "perfume",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "cat-2",
    slug: "woody",
    name: "Woody",
    description: "Rich notes of cedar and agarwood.",
    image: "/category-woody.jpg",
    color: "#EFECE6",
    sort_order: 2,
    is_active: true,
    type: "perfume",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "cat-3",
    slug: "attar",
    name: "Attar",
    description: "Pure botanical concentrated essences.",
    image: null,
    color: null,
    sort_order: 3,
    is_active: true,
    type: "attar",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

const mockProducts = [
  { id: 1, name: "Ethereal Bloom", category: "floral" },
  { id: 2, name: "Rose Garden", category: "floral" },
  { id: 3, name: "Oud Sovereign", category: "woody" },
  { id: 4, name: "Jannatul Firdaus", category: "attar" },
  { id: 5, name: "Misk Amber", category: "attar" },
  { id: 6, name: "Mukhallat", category: "attar" },
];

let mockCategoriesLoading = false;
let mockCategoriesError: Error | null = null;
let mockCategoriesData: typeof mockCategories | undefined = mockCategories;

vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({
    data: mockCategoriesData,
    isLoading: mockCategoriesLoading,
    error: mockCategoriesError,
  }),
}));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    data: mockProducts,
    isLoading: false,
    error: null,
  }),
}));

describe("Categories Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoriesLoading = false;
    mockCategoriesError = null;
    mockCategoriesData = mockCategories;
  });

  it("renders active categories with titles, descriptions, and taxonomy heading", () => {
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("Olfactive Taxonomy")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fragrance Families", level: 1 })).toBeInTheDocument();

    expect(screen.getByText("Floral")).toBeInTheDocument();
    expect(screen.getByText("Woody")).toBeInTheDocument();
    expect(screen.getByText("Attar")).toBeInTheDocument();
    expect(screen.getByText("Delicate and romantic blossoms.")).toBeInTheDocument();
  });

  it("calculates and displays dynamic creation counts from supplied product data", () => {
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // Floral has 2 products: "2 creations"
    expect(screen.getByText("2 creations")).toBeInTheDocument();
    // Woody has 1 product: "1 creation"
    expect(screen.getByText("1 creation")).toBeInTheDocument();
    // Attar has 3 products: "3 creations"
    expect(screen.getByText("3 creations")).toBeInTheDocument();
  });

  it("preserves exact slug-based navigation links (/products?category=...)", () => {
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const floralLink = screen.getByRole("link", { name: /floral/i });
    expect(floralLink).toHaveAttribute("href", "/products?category=floral");

    const woodyLink = screen.getByRole("link", { name: /woody/i });
    expect(woodyLink).toHaveAttribute("href", "/products?category=woody");

    const attarLink = screen.getByRole("link", { name: /attar/i });
    expect(attarLink).toHaveAttribute("href", "/products?category=attar");
  });

  it("toggles between Grid view and List view when segmented buttons are clicked", () => {
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // Initially in grid view
    expect(screen.getAllByText("Explore Family →")).toHaveLength(3);

    // Switch to list view
    const listButton = screen.getByRole("button", { name: /list view/i });
    fireEvent.click(listButton);

    expect(screen.getAllByText("View all fragrances →")).toHaveLength(3);

    // Switch back to grid view
    const gridButton = screen.getByRole("button", { name: /grid view/i });
    fireEvent.click(gridButton);

    expect(screen.getAllByText("Explore Family →")).toHaveLength(3);
  });

  it("displays loading state while categories data is fetching", () => {
    mockCategoriesLoading = true;
    mockCategoriesData = [];

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("Cataloging families...")).toBeInTheDocument();
  });

  it("displays empty state message when no active categories are present", () => {
    mockCategoriesLoading = false;
    mockCategoriesData = [];

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("No categories available in the library yet.")).toBeInTheDocument();
  });

  it("displays graceful error state when category query fails", () => {
    mockCategoriesLoading = false;
    mockCategoriesError = new Error("Network error");
    mockCategoriesData = [];

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    expect(screen.getByText("Unable to catalog fragrance families at this time.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view collection/i })).toHaveAttribute("href", "/products");
  });

  it("handles image fallback properly when category image is null", () => {
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // Attar has null image, so no <img> with alt="Attar"
    const images = screen.getAllByRole("img");
    const imageAlts = images.map((img) => img.getAttribute("alt"));
    expect(imageAlts).toContain("Floral");
    expect(imageAlts).toContain("Woody");
    expect(imageAlts).not.toContain("Attar");
  });
});
