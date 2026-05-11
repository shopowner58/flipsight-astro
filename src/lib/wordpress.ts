import { events as mockEvents, type EventItem } from "../data/events";
import { WOOCOMMERCE_URL } from "./woocommerce";

interface WordPressEvent {
  slug: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  flipsight_event?: {
    date?: string;
    time?: string;
    location?: string;
    image?: string;
    description?: string;
    rsvpLink?: string;
    facebookLink?: string;
    ticketLink?: string;
    sourceUrl?: string;
    lineup?: string;
    status?: "upcoming" | "past";
  };
}

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();

const mapWordPressEvent = (event: WordPressEvent): EventItem => {
  const fields = event.flipsight_event ?? {};

  return {
    title: stripHtml(event.title?.rendered),
    slug: event.slug,
    date: fields.date ?? "",
    time: fields.time ?? "",
    location: fields.location ?? "",
    image: fields.image ?? "",
    description: fields.description || stripHtml(event.excerpt?.rendered || event.content?.rendered),
    rsvpLink: fields.rsvpLink || fields.ticketLink || fields.sourceUrl || "",
    facebookLink: fields.facebookLink ?? "",
    status: fields.status,
  };
};

let eventCache: Promise<EventItem[]> | undefined;

export async function getEvents(): Promise<EventItem[]> {
  eventCache ??= fetch(`${WOOCOMMERCE_URL}/wp-json/wp/v2/flipsight_event?per_page=50`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`WordPress events request failed: ${response.status}`);
      }

      return response.json() as Promise<WordPressEvent[]>;
    })
    .then((events) =>
      events
        .map(mapWordPressEvent)
        .sort((a, b) => b.date.localeCompare(a.date)),
    )
    .catch(() => mockEvents);

  return eventCache;
}
