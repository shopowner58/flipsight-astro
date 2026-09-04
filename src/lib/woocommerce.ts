import { products as mockProducts } from "../data/products";
import type { Product, ProductCategory } from "../data/products";

export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://flipsight.be").replace(/\/$/, "");
export const WOOCOMMERCE_URL = (import.meta.env.PUBLIC_WOOCOMMERCE_URL ?? "https://shop.flipsight.be").replace(/\/$/, "");

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
  low_stock_remaining?: number | null;
  categories?: Array<{ name: string; slug: string }>;
  images?: Array<{ src: string; alt?: string; thumbnail?: string }>;
  short_description?: string;
  description?: string;
  attributes?: Array<{ name: string; taxonomy?: string | null; has_variations?: boolean; terms?: Array<{ name: string; slug: string }> }>;
  variations?: Array<{ id: number; attributes?: Array<{ name: string; value: string }> }>;
  permalink?: string;
}

interface MusicMeta {
  productId: number;
  slug: string;
  sku?: string;
  artist?: string;
  bandcampAlbumId?: string;
  bandcampUrl?: string;
  gallery?: string[];
  availabilityLabel?: string;
}

interface ArtEditionMeta {
  productId: number;
  variationId?: number | null;
  displayPrice?: string;
  editionLabel?: string;
  availabilityLabel?: string;
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();

const getCategoryFromWooProduct = (product: WooStoreProduct): ProductCategory => {
  const slugs = product.categories?.map((item) => item.slug.toLowerCase()) ?? [];
  const category = slugs.find((slug) => ["music", "art", "merch"].includes(slug));

  if (category) return category as ProductCategory;
  if (slugs.includes("vinyl")) return "music";
  if (slugs.includes("apparel-accessories") || slugs.includes("apparel") || slugs.includes("clothing")) return "merch";
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
  product.attributes?.find((attribute) => attributeName.test(attribute.name))?.terms?.map((term) => decodeHtml(term.name)) ?? [];

const formatSizeLabel = (value: string) =>
  value.replace(/\s*[x×]\s*/gi, " × ");

const getYear = (product: WooStoreProduct) => {
  const source = decodeHtml(product.short_description || product.description);
  return source.match(/\b(20\d{2}|19\d{2})\b/)?.[0] ?? new Date().getFullYear().toString();
};

const getFormat = (product: WooStoreProduct, category: ProductCategory) => {
  if (category === "music") return '12" vinyl';
  if (category === "art") {
    const sizes = getAttributeTerms(product, /^size$/i).map(formatSizeLabel);
    return ["Fine art canvas print on 260 gsm natural white cotton canvas.", sizes.join(" / ")]
      .filter(Boolean)
      .join(" · ");
  }

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
    description.match(/Edition of \d+.*?(?=\s+Certificate\s+|\s+Series\s+|\s+Publisher\s+|\s+Each work|$)/i)?.[0]?.trim() ??
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

const normalizeName = (value = "") =>
  decodeHtml(value).toLowerCase().replace(/\s+/g, " ").trim();

const splitMusicProductName = (name: string) => {
  const separator = " - ";
  const separatorIndex = name.indexOf(separator);
  const firstParenIndex = name.indexOf("(");

  if (separatorIndex < 1 || (firstParenIndex >= 0 && separatorIndex > firstParenIndex)) {
    return { title: name };
  }

  const artist = name.slice(0, separatorIndex).trim();
  const title = name.slice(separatorIndex + separator.length).trim();
  const titleLooksLikeRelease = /\b(ep|album|single|lp|white label|vinyl)\b|\(/i.test(title);

  if (!artist || !title || !titleLooksLikeRelease) {
    return { title: name };
  }

  return { artist, title };
};

const getArtist = (product: WooStoreProduct, musicMeta?: MusicMeta, splitName?: ReturnType<typeof splitMusicProductName>) => {
  const artists = getAttributeTerms(product, /^artist$/i);
  if (artists.length > 0) return artists.join(" / ");

  const musicMetaArtist = decodeHtml(musicMeta?.artist);
  if (musicMetaArtist) return musicMetaArtist;

  return splitName?.artist;
};

const getStockStatus = (product: WooStoreProduct, musicMeta?: MusicMeta): Product["stockStatus"] => {
  const availabilityLabel = musicMeta?.availabilityLabel?.toLowerCase().trim() ?? "";

  if (availabilityLabel.includes("pre-order") || availabilityLabel.includes("preorder")) {
    return "Pre-order";
  }

  if (availabilityLabel.includes("sold")) {
    return "Sold out";
  }

  if (availabilityLabel.includes("low")) {
    return "Low stock";
  }

  if (product.stock_status === "outofstock" || product.is_in_stock === false) {
    return "Sold out";
  }

  if (product.stock_status === "onbackorder") {
    return "Pre-order";
  }

  if (typeof product.low_stock_remaining === "number") {
    return "Low stock";
  }

  if (availabilityLabel === "new") {
    return "New";
  }

  return "Available";
};

const getVariants = (product: WooStoreProduct, artEditionMeta?: Map<number, ArtEditionMeta>) => {
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
      const editionMeta = artEditionMeta?.get(variation.id);
      return {
        id: variation.id,
        label,
        value: termByName.get(label.toLowerCase()) ?? label.toLowerCase().replace(/\s*×\s*/g, "x").replace(/\s+/g, "-"),
        attributeName,
        displayPrice: editionMeta?.displayPrice,
        editionLabel: editionMeta?.editionLabel,
        availabilityLabel: editionMeta?.availabilityLabel,
      };
    }) ?? []
  );
};

const uniqueItems = (items: string[]) =>
  Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));

const mapWooProduct = (product: WooStoreProduct, musicMeta?: MusicMeta, artEditionMeta?: Map<number, ArtEditionMeta>): Product => {
  const category = getCategoryFromWooProduct(product);
  const tone = categoryTone[category];
  const type = product.type === "variable" ? "variable" : "simple";
  const decodedName = decodeHtml(product.name);
  const splitName = category === "music" ? splitMusicProductName(decodedName) : { title: decodedName };
  const artist = getArtist(product, musicMeta, splitName);
  const title =
    artist && splitName.artist && normalizeName(artist) === normalizeName(splitName.artist)
      ? splitName.title
      : decodedName;
  const image = product.images?.[0]?.src ?? product.images?.[0]?.thumbnail ?? "";
  const wooGallery = product.images?.slice(1).map((item) => item.src || item.thumbnail || "") ?? [];
  const metaGallery = musicMeta?.gallery ?? [];

  return {
    id: product.id,
    slug: product.slug,
    title,
    artist,
    catalog: getCatalog(product, category),
    category,
    price: formatPrice(product),
    image,
    gallery: uniqueItems([...wooGallery, ...metaGallery].filter((item) => item !== image)).slice(0, 8),
    stockStatus: getStockStatus(product, musicMeta),
    editionInfo:
      category === "music" && musicMeta?.availabilityLabel?.toLowerCase().includes("pre-order")
        ? "Limited vinyl"
        : getEditionInfo(product, category),
    description: getDescription(product, category),
    bandcampAlbumId: musicMeta?.bandcampAlbumId,
    bandcampUrl: musicMeta?.bandcampUrl,
    format: getFormat(product, category),
    year: getYear(product),
    type,
    variants: getVariants(product, artEditionMeta),
    editionLabel: artEditionMeta?.get(product.id)?.editionLabel,
    availabilityLabel: musicMeta?.availabilityLabel ?? artEditionMeta?.get(product.id)?.availabilityLabel,
    ...tone,
  };
};

const getStoreApiProducts = async () => {
  const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/products?per_page=100`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`WooCommerce Store API request failed: ${response.status}`);
  }

  return (await response.json()) as WooStoreProduct[];
};

const getMusicMeta = async () => {
  try {
    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/flipsight/v1/music-meta`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return new Map<number, MusicMeta>();

    const items = (await response.json()) as MusicMeta[];
    return new Map(items.map((item) => [item.productId, item]));
  } catch {
    return new Map<number, MusicMeta>();
  }
};

const getArtEditionMeta = async () => {
  try {
    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/flipsight/v1/art-editions`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return new Map<number, ArtEditionMeta>();

    const items = (await response.json()) as ArtEditionMeta[];
    return new Map(items.map((item) => [item.variationId ?? item.productId, item]));
  } catch {
    return new Map<number, ArtEditionMeta>();
  }
};

let productCache: Promise<Product[]> | undefined;

export async function getProducts(): Promise<Product[]> {
  productCache ??= Promise.all([getStoreApiProducts(), getMusicMeta(), getArtEditionMeta()])
    .then(([wooProducts, musicMeta, artEditionMeta]) => wooProducts.map((product) => mapWooProduct(product, musicMeta.get(product.id), artEditionMeta)))
    .catch((error) => {
      if (import.meta.env.DEV) return mockProducts;
      throw error;
    });

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
  const url = new URL(`${WOOCOMMERCE_URL}/cart/`);
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
