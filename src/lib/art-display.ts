import type { Product } from "../data/products";

export const sortArtOldestFirst = <T extends Pick<Product, "year" | "catalog">>(products: readonly T[]): T[] =>
  [...products].sort((a, b) =>
    a.year.localeCompare(b.year, "en", { numeric: true }) ||
    a.catalog.localeCompare(b.catalog, "en", { numeric: true }),
  );

export const formatArtDimensions = (value: string) =>
  value.replace(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*cm\b)?/gi, "$1 × $2 cm");

export const getArtPreviewDetails = (product: Pick<Product, "format" | "variants">) => {
  const [medium = "", ...formatSizes] = (product.format ?? "").split("·").map((part) => part.trim());
  const sizes = product.variants?.length
    ? product.variants.map((variant) => variant.label).join(" / ")
    : formatSizes.join(" / ");

  return {
    medium,
    sizes: formatArtDimensions(sizes),
  };
};

export const getArtEditionDetails = (editionInfo: string) => {
  const total = editionInfo.match(/^(?:Limited\s+)?Edition of\s+(\d+)\b/i)?.[1];
  if (!total) return { summary: editionInfo, breakdown: "" };

  const breakdown = editionInfo.match(/:\s*(.+)$/)?.[1] ?? "";
  return {
    summary: `Limited edition of ${total} in total`,
    breakdown: formatArtDimensions(breakdown).replace(/\s+and\s+/gi, " · "),
  };
};
