import { products as mockProducts } from "../data/products";
import type { Product, ProductCategory } from "../data/products";

export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://flipsight.be").replace(/\/$/, "");
export const WOOCOMMERCE_URL = (import.meta.env.PUBLIC_WOOCOMMERCE_URL ?? "https://flipsight.be").replace(/\/$/, "");

interface WooStoreProduct {
  id: number;
  slug: string;
  name: string;
  type?: "simple" | "variable" | string;
  sku?: string;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
    price_range?: {
      min_amount?: string;
      max_amount?: string;
    };
    currency_code?: string;
    currency_minor_unit?: number;
  };
  price_html?: string;
  stock_status?: string;
  is_in_stock?: boolean;
  categories?: Array<{ name: string; slug: string }>;
  images?: Array<{ src: string; alt?: string; thumbnail?: string }>;
  short_description?: string;
  description?: string;
  attributes?: Array<{ name: string; taxonomy?: string | null; has_variations?: boolean; terms?: Array<{ name: string; slug: string }> }>;
  variations?: Array<{ id: number; attributes?: Array<{ name: string; value: string }> }>;
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
    .replace(/&euro;/g, "€")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const getCategoryFromWooProduct = (product: WooStoreProduct): ProductCategory => {
  const slugs = product.categories?.map((item) => item.slug.toLowerCase()) ?? [];
  const category = slugs.find((slug) => ["music", "art", "merch"].includes(slug));

  if (category) return category as ProductCategory;
  if (slugs.includes("vinyl")) return "music";
  return "music";
};

const formatPrice = (product: WooStoreProduct) => {
  const min = product.prices?.price_range?.min_amount;
  const max = product.prices?.price_range?.max_amount;
  const rawPrice = product.prices?.sale_price || product.prices?.price || product.prices?.regular_price;
  const currency = product.prices?.currency_code ?? "EUR";
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  const divisor = 10 ** minorUnit;

  const formatter = new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  });

  if (min && max && min !== max) {
    return `${formatter.format(Number(min) / divisor)} - ${formatter.format(Number(max) / divisor)}`;
  }

  if (!rawPrice) return decodeHtml(product.price_html ?? "");

  return formatter.format(Number(rawPrice) / divisor);
};

const formatMoney = (rawPrice: string | undefined, product: WooStoreProduct) => {
  if (!rawPrice) return "";
  const currency = product.prices?.currency_code ?? "EUR";
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(Number(rawPrice) / 10 ** minorUnit);
};

const getAttributeTerms = (product: WooStoreProduct, attributeName: RegExp) =>
  product.attributes?.find((attribute) => attributeName.test(attribute.name))?.terms?.map((term) => term.name) ?? [];

const formatSizeLabel = (value: string) =>
  value.replace(/\s*[x×]\s*/gi, " × ");

const getYear = (product: WooStoreProduct) => {
  const source = decodeHtml(product.short_description || product.description);
  return source.match(/\b(20\d{2}|19\d{2})\b/)?.[0] ?? new Date().getFullYear().toString();
};

const getFormat = (product: WooStoreProduct, category: ProductCategory) => {
  if (category === "music") return '12" vinyl';

  const medium = getAttributeTerms(product, /^medium$/i)[0];
  const sizes = getAttributeTerms(product, /^size$/i).map(formatSizeLabel);
  return [medium, sizes.join(" / ")].filter(Boolean).join(" · ") || category;
};

const getEditionInfo = (product: WooStoreProduct, category: ProductCategory) => {
  if (category === "music") {
    return product.stock_status === "outofstock" ? "Sold out" : "Limited vinyl";
  }

  const description = decodeHtml(product.description);
  return (
    description.match(/Edition of 12.*?(?=\s+Certificate\s+|\s+Series\s+|\s+Publisher\s+|\s+Each work|$)/i)?.[0]?.trim() ??
    "FLIPSART edition"
  );
};

const getDescription = (product: WooStoreProduct, category: ProductCategory) => {
  const short = decodeHtml(product.short_description);
  if (category === "art") {
    return short
      .replace(/\s*·\s*Editioned Artwork\s*/i, " · ")
      .replace(/\s*·\s*Numbered Certificate of Authenticity included\.?/i, "")
      .replace(/\s*·\s*$/i, "")
      .trim();
  }
  return short || decodeHtml(product.description);
};

const getCatalog = (product: WooStoreProduct, category: ProductCategory) => {
  if (product.sku) return product.sku.toUpperCase();
  return category === "art" ? `FLIPSART-${product.id}` : `WC-${product.id}`;
};

const getVariants = (product: WooStoreProduct) => {
  if (product.type !== "variable") return [];

  const variationAttribute = product.attributes?.find((attribute) => attribute.has_variations);
  const attributeName = variationAttribute?.taxonomy ?? "pa_size";
  const termByName = new Map(
    variationAttribute?.terms?.map((term) => [term.name.toLowerCase(), term.slug]) ?? [],
  );

  return (
    product.variations?.map((variation) => {
      const attribute = variation.attributes?.[0];
      const label = formatSizeLabel(attribute?.value ?? "Option");
      return {
        id: variation.id,
        label,
        value: termByName.get(label.toLowerCase()) ?? label.toLowerCase().replace(/\s*×\s*/g, "x").replace(/\s+/g, "-"),
        attributeName,
      };
    }) ?? []
  );
};

const mapWooProduct = (product: WooStoreProduct): Product => {
  const category = getCategoryFromWooProduct(product);
  const tone = categoryTone[category];
  const type = product.type === "variable" ? "variable" : "simple";

  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    catalog: getCatalog(product, category),
    category,
    price: formatPrice(product),
    image: product.images?.[0]?.src ?? product.images?.[0]?.thumbnail ?? "",
    stockStatus: product.stock_status === "outofstock" || product.is_in_stock === false ? "Sold out" : product.stock_status === "onbackorder" ? "Low stock" : "Available",
    editionInfo: getEditionInfo(product, category),
    description: getDescription(product, category),
    format: getFormat(product, category),
    year: getYear(product),
    type,
    variants: getVariants(product),
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

export function getVariationCheckoutUrl(parentId: number | string, variant: { id: number | string; attributeName: string; value: string }) {
  const url = new URL(`${WOOCOMMERCE_URL}/checkout/`);
  url.searchParams.set("add-to-cart", String(parentId));
  url.searchParams.set("variation_id", String(variant.id));
  url.searchParams.set(`attribute_${variant.attributeName}`, variant.value);
  return url.toString();
}

export function getCartUrl() {
  return `${WOOCOMMERCE_URL}/cart/`;
}

export function getCheckoutUrl() {
  return `${WOOCOMMERCE_URL}/checkout/`;
}
