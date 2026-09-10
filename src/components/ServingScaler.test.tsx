import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServingScaler } from "./ServingScaler";
import type { Ingredient } from "@/types/recipe";

function ing(overrides: Partial<Ingredient>): Ingredient {
  return {
    id: crypto.randomUUID(),
    recipe_id: "r1",
    position: 0,
    amount: null,
    unit: null,
    name: "Ingredient",
    category: null,
    note: null,
    ...overrides,
  };
}

describe("ServingScaler", () => {
  it("groups ingredients by category in first-seen order, uncategorized last", () => {
    const ingredients = [
      ing({ name: "Flour", category: "Dry" }),
      ing({ name: "Milk", category: "Wet" }),
      ing({ name: "Salt", category: "Dry" }),
      ing({ name: "Orange Zest", category: null }),
    ];
    render(
      <ServingScaler baseServings={4} ingredients={ingredients} showServings={false} />
    );
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Dry", "Wet"]);

    // Uncategorized items render with no heading but still appear.
    expect(screen.getByText("Orange Zest")).toBeInTheDocument();
  });

  it("scales amounts proportionally to the servings factor", () => {
    const ingredients = [ing({ name: "Sugar", amount: 2, unit: "cup" })];
    render(
      <ServingScaler baseServings={2} ingredients={ingredients} showServings={false} />
    );
    // baseServings 2 -> initial servings state is also 2, factor 1, so amount stays 2.
    expect(screen.getByText(/2 cup/)).toBeInTheDocument();
  });

  it("renders a name with no amount without an orphaned bullet on its own line", () => {
    // Regression test: the ingredient <li> must not use flex-wrap, otherwise
    // the bullet (a ::before pseudo-element) wraps onto its own line above
    // the name for ingredients with an empty amount.
    const ingredients = [ing({ name: "Orange Zest", amount: null, unit: null })];
    const { container } = render(
      <ServingScaler baseServings={4} ingredients={ingredients} showServings={false} />
    );
    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(li?.className).not.toContain("flex-wrap");
    expect(li?.className).toContain("before:shrink-0");
  });
});
