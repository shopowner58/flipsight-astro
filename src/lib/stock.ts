import type { Product } from "../data/products";

type StockStatus = Product["stockStatus"];

export const getStockLabel = (stockStatus: StockStatus) => {
  if (stockStatus === "Sold out") return "Sold out";
  if (stockStatus === "Low stock") return "Low in stock";
  return "Available";
};

export const getStockBadgeTone = (stockStatus: StockStatus) => {
  if (stockStatus === "Sold out") return "bg-[var(--fs-ink)] text-[var(--fs-bg)]";
  if (stockStatus === "Low stock") return "bg-[var(--fs-accent)] text-white";
  return "bg-[rgba(248,248,244,0.88)] text-[var(--fs-ink)]";
};

export const hasStockBadge = (stockStatus: StockStatus) =>
  stockStatus === "Sold out" || stockStatus === "Low stock";
