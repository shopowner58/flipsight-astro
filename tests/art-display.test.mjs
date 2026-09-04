import assert from "node:assert/strict";
import test from "node:test";
import { formatArtDimensions, getArtEditionDetails, getArtPreviewDetails, sortArtOldestFirst } from "../src/lib/art-display.ts";

const medium = "Fine art canvas print on 260 gsm natural white cotton canvas.";

test("art overviews sort by design year, oldest first, without changing the source order", () => {
  const products = [
    { catalog: "FLIPSART001", year: "2026" },
    { catalog: "FLIPSART012", year: "2023" },
    { catalog: "FLIPSART005", year: "2025" },
  ];
  const original = [...products];
  assert.deepEqual(sortArtOldestFirst(products).map((product) => product.year), ["2023", "2025", "2026"]);
  assert.deepEqual(products, original);
});

test("works from the same year use ascending numeric catalogue order", () => {
  const products = ["FLIPSART010", "FLIPSART2", "FLIPSART001"].map((catalog) => ({ catalog, year: "2025" }));
  assert.deepEqual(sortArtOldestFirst(products).map((product) => product.catalog), ["FLIPSART001", "FLIPSART2", "FLIPSART010"]);
  assert.deepEqual(sortArtOldestFirst([]), []);
});

test("art preview metadata shows sizes and medium without repeating the title year", () => {
  assert.deepEqual(getArtPreviewDetails({
    format: `${medium} · 80 × 120 / 70 × 50`,
    variants: [{ label: "70 × 50" }, { label: "80 × 120" }],
    year: "2026",
  }), {
    sizes: "70 × 50 cm / 80 × 120 cm",
    medium,
  });
});

test("single-format diptychs keep both panel dimensions together", () => {
  assert.deepEqual(getArtPreviewDetails({
    format: `${medium} · 70 × 100 + 70 × 25`,
    year: "2023",
  }), {
    sizes: "70 × 100 cm + 70 × 25 cm",
    medium,
  });
});

test("missing sizes do not invent formats or separators", () => {
  assert.deepEqual(getArtPreviewDetails({ format: medium, year: "2025" }), {
    sizes: "",
    medium,
  });
});

test("dimension formatting normalizes multiplication signs without duplicating units", () => {
  assert.equal(formatArtDimensions("70x50 cm / 80 × 120 CM"), "70 × 50 cm / 80 × 120 cm");
  assert.equal(formatArtDimensions("70,5x50 / 80.5x120"), "70,5 × 50 cm / 80.5 × 120 cm");
});

test("edition display separates the total from the actual size allocation", () => {
  assert.deepEqual(getArtEditionDetails("Edition of 12 total, echoing the 12-inch vinyl format: 7 in 70 × 50 and 5 in 80 × 120"), {
    summary: "Limited edition of 12 in total",
    breakdown: "7 in 70 × 50 cm · 5 in 80 × 120 cm",
  });
});

test("single-format editions do not invent a size allocation", () => {
  assert.deepEqual(getArtEditionDetails("Edition of 12, echoing the 12-inch vinyl format"), {
    summary: "Limited edition of 12 in total",
    breakdown: "",
  });
});

test("edition totals are not hard-coded and unrecognized descriptions are preserved", () => {
  assert.deepEqual(getArtEditionDetails("Edition of 25"), {
    summary: "Limited edition of 25 in total",
    breakdown: "",
  });
  assert.deepEqual(getArtEditionDetails("Unique work"), { summary: "Unique work", breakdown: "" });
});
