import { products as mockProducts } from "../data/products";
import type { Product, ProductCategory } from "../data/products";

export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://flipsight.be").replace(/\/$/, "");
export const WOOCOMMERCE_URL = (import.meta.env.PUBLIC_WOOCOMMERCE_URL ?? "https://flipsight.be").replace(/\/$/, "");

interface WooStoreProduct {
  id: number;
  slug: string;
  name: string;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
    currency_code?: string;
  };
  stock_status?: string;
  categories?: Array<{ name: string; slug: string }>;
  images?: Array<{ src: string; alt?: string }>;
  short_description?: string;
  description?: string;
  attributes?: Array<{ name: string; terms?: Array<{ name: string; slug: string }> }>;
  permalink?: string;
}

const categoryTone: Record<ProductCategory, Pick<Product, "hue" | "chroma" | "aspect">> = {
  music: { hue: 18, chroma: 0.02, aspect: "square" },
  art: { hue: 225, chroma: 0.03, aspect: "portrait" },
  merch: { hue: 38, chroma: 0.02, aspect: "portrait" },
};

const decodeHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .trim();

const getCategoryFromWooProduct = (product: WooStoreProduct): ProductCategory => {
  const category = product.categories?.find((item) =>
    ["music", "art", "merch"].includes(item.slug.toLowerCase()),
  )?.slug.toLowerCase();

  return (category as ProductCategory) ?? "music";
};

const formatPrice = (product: WooStoreProduct) => {
  const rawPrice = product.prices?.sale_price || product.prices?.price || product.prices?.regular_price;
  const currency = product.prices?.currency_code ?? "EUR";

  if (!rawPrice) return "";

  const amount = Number(rawPrice) / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount);
};

const mapWooProduct = (product: WooStoreProduct): Product => {
  const category = getCategoryFromWooProduct(product);
  const tone = categoryTone[category];
  const edition =
    product.attributes?.find((attribute) => /edition|size|format/i.test(attribute.name))?.terms?.map((term) => term.name).join(" / ") ??
    product.categories?.map((item) => item.name).join(" / ") ??
    "";

  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    catalog: `WC-${product.id}`,
    category,
    price: formatPrice(product),
    image: product.images?.[0]?.src ?? "",
    stockStatus: product.stock_status === "outofstock" ? "Sold out" : product.stock_status === "onbackorder" ? "Low stock" : "Available",
    editionInfo: edition || "Edition details coming soon",
    description: decodeHtml(product.short_description || product.description),
    format: edition,
    year: new Date().getFullYear().toString(),
    ...tone,
  };
};

const getStoreApiProducts = async () => {
  const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/products?per_page=100`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`WooCommerce Store API request failed: ${response.status}`);
  }

  return (await response.json()) as WooStoreProduct[];
};

let productCache: Promise<Product[]> | undefined;

export async function getProducts(): Promise<Product[]> {
  productCache ??= getStoreApiProducts()
    .then((wooProducts) => wooProducts.map(mapWooProduct))
    .catch(() => mockProducts);

  return productCache;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((product) => product.category === category);
}

const getAbsoluteReturnUrl = (returnPath = "/shop") => {
  if (/^https?:\/\//i.test(returnPath)) return returnPath;
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return `${SITE_URL}${path}`;
};

export function getAddToCartUrl(productId: number | string, returnPath = "/shop") {
  const url = new URL(WOOCOMMERCE_URL);
  url.searchParams.set("add-to-cart", String(productId));
  url.searchParams.set("return_to", getAbsoluteReturnUrl(returnPath));
  return url.toString();
}

export function getCheckoutAddToCartUrl(productId: number | string) {
  const url = new URL(`${WOOCOMMERCE_URL}/checkout/`);
  url.searchParams.set("add-to-cart", String(productId));
  return url.toString();
}

export function getCartUrl() {
  return `${WOOCOMMERCE_URL}/cart/`;
}

export function getCheckoutUrl() {
  return `${WOOCOMMERCE_URL}/checkout/`;
}
