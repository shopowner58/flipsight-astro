export interface EventItem {
  title: string;
  slug: string;
  date: string;
  time: string;
  location: string;
  image: string;
  description: string;
  rsvpLink: string;
  facebookLink?: string;
  status?: "upcoming" | "past";
}

export const events: EventItem[] = [
  {
    title: "Slow Rooms - Listening & Conversation",
    slug: "slow-rooms-listening-conversation",
    date: "2026-05-14",
    time: "20:00",
    location: "Kiosk, Bijloke - Ghent",
    image: "",
    description:
      "A seated first listen for FS-012 with Yana Orlov, followed by a short conversation on rooms, duration, and sleeve making.",
    rsvpLink: "https://flipsight.be/events/slow-rooms",
    facebookLink: "https://facebook.com/events/flipsight-slow-rooms",
  },
  {
    title: "Yana Orlov - Rooms",
    slug: "yana-orlov-rooms",
    date: "2026-05-22",
    time: "18:30",
    location: "Galerie Noord - Antwerp",
    image: "",
    description:
      "Opening night for a small exhibition of linens, studies, and printed matter created around Slow Rooms.",
    rsvpLink: "https://flipsight.be/events/yana-orlov-rooms",
  },
  {
    title: "Halver - North Atlas, Live",
    slug: "halver-north-atlas-live",
    date: "2026-06-07",
    time: "21:00",
    location: "Beursschouwburg - Brussels",
    image: "",
    description:
      "A live version of North Atlas with expanded visuals, low light, and a limited event-only risograph insert.",
    rsvpLink: "https://flipsight.be/events/north-atlas-live",
    facebookLink: "https://facebook.com/events/flipsight-north-atlas",
  },
];
