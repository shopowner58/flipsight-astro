export type ProductCategory = "music" | "art" | "merch";

export interface Product {
  id: number;
  slug: string;
  title: string;
  artist?: string;
  catalog: string;
  category: ProductCategory;
  price: string;
  image: string;
  gallery?: string[];
  stockStatus: "Available" | "Low stock" | "Sold out";
  editionInfo: string;
  description: string;
  bandcampAlbumId?: string;
  bandcampUrl?: string;
  format?: string;
  year: string;
  hue: number;
  chroma: number;
  aspect?: "square" | "portrait";
  type?: "simple" | "variable";
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  label: string;
  value: string;
  attributeName: string;
  displayPrice?: string;
  editionLabel?: string;
  availabilityLabel?: string;
}

export const products: Product[] = [
  {
    id: 12012,
    slug: "yana-orlov-slow-rooms",
    title: "Slow Rooms",
    artist: "Yana Orlov",
    catalog: "FS-012",
    category: "music",
    price: "EUR 38",
    image: "",
    stockStatus: "Available",
    editionInfo: "Edition of 300",
    description:
      "Five long-form pieces written between a disused library in Ghent and a studio in Lisbon. A record about attention, rooms, and the weight of afternoon light.",
    format: '12" Vinyl, 180g',
    year: "2026",
    hue: 18,
    chroma: 0.02,
    aspect: "square",
  },
  {
    id: 12011,
    slug: "halver-north-atlas",
    title: "North Atlas",
    artist: "Halver",
    catalog: "FS-011",
    category: "music",
    price: "EUR 46",
    image: "",
    stockStatus: "Available",
    editionInfo: "Edition of 500",
    description:
      "A widescreen double twelve inch tracing mineral tones, low-frequency cartography, and field recordings from the northern edge.",
    format: '2x12" Vinyl, 180g',
    year: "2026",
    hue: 240,
    chroma: 0.02,
    aspect: "square",
  },
  {
    id: 24024,
    slug: "yana-orlov-room-i-slow",
    title: "Room I (Slow)",
    artist: "Yana Orlov",
    catalog: "FS-A-024",
    category: "art",
    price: "EUR 4,200",
    image: "",
    stockStatus: "Available",
    editionInfo: "Unique work",
    description:
      "Oil and graphite on linen, made alongside the recording of Slow Rooms. The first in a sequence of six works sharing the record's palette and patience.",
    format: "Oil and graphite on linen, 120 x 90 cm",
    year: "2026",
    hue: 22,
    chroma: 0.03,
    aspect: "portrait",
  },
  {
    id: 24022,
    slug: "halver-atlas-plate-03",
    title: "Atlas Plate 03",
    artist: "Halver",
    catalog: "FS-A-022",
    category: "art",
    price: "EUR 480",
    image: "",
    stockStatus: "Low stock",
    editionInfo: "Edition of 25",
    description:
      "Archival pigment print from the North Atlas image sequence. Signed, numbered, and shipped flat with certificate of authenticity.",
    format: "Archival pigment print, 70 x 50 cm",
    year: "2026",
    hue: 225,
    chroma: 0.03,
    aspect: "portrait",
  },
  {
    id: 31001,
    slug: "workshop-tee-slow-rooms",
    title: "Workshop Tee - Slow Rooms",
    catalog: "FS-M-001",
    category: "merch",
    price: "EUR 48",
    image: "",
    stockStatus: "Available",
    editionInfo: "S / M / L / XL",
    description:
      "Heavyweight 240gsm cotton tee with screenprinted sleeve text and small back catalogue mark. Cut in a relaxed studio fit.",
    format: "Heavyweight cotton tee",
    year: "2026",
    hue: 38,
    chroma: 0.02,
    aspect: "portrait",
  },
  {
    id: 31002,
    slug: "north-atlas-crewneck",
    title: "North Atlas Crewneck",
    catalog: "FS-M-002",
    category: "merch",
    price: "EUR 98",
    image: "",
    stockStatus: "Available",
    editionInfo: "S / M / L / XL",
    description:
      "Heavy loopback crewneck with woven neck label, minimal front mark, and tonal Atlas print across the back.",
    format: "Heavy loopback crewneck",
    year: "2026",
    hue: 250,
    chroma: 0.02,
    aspect: "portrait",
  },
];

export const getProductsByCategory = (category: ProductCategory) =>
  products.filter((product) => product.category === category);
