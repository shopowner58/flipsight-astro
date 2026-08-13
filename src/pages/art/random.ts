import type { APIRoute } from "astro";
import { getProductsByCategory } from "../../lib/woocommerce";

export const prerender = false;

const LAST_ART_COOKIE = "flipsight_last_random_art";

const disableCaching = (response: Response) => {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vary", "Cookie");
  return response;
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const artProducts = await getProductsByCategory("art");
    const inStockProducts = artProducts.filter((product) => product.stockStatus !== "Sold out");
    const candidates = inStockProducts.length > 0 ? inStockProducts : artProducts;

    if (candidates.length === 0) {
      return disableCaching(redirect("/art", 302));
    }

    const previousProductId = Number(cookies.get(LAST_ART_COOKIE)?.value);
    const nextCandidates =
      candidates.length > 1
        ? candidates.filter((product) => product.id !== previousProductId)
        : candidates;
    const product = nextCandidates[Math.floor(Math.random() * nextCandidates.length)];

    cookies.set(LAST_ART_COOKIE, String(product.id), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/art/random",
      sameSite: "lax",
      secure: import.meta.env.PROD,
    });

    return disableCaching(redirect(`/product/${encodeURIComponent(product.slug)}`, 302));
  } catch {
    return disableCaching(redirect("/art", 302));
  }
};
