export interface Post {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  image: string;
}

export const posts: Post[] = [
  {
    title: "FS-012: Slow Rooms enters the catalogue",
    slug: "slow-rooms-enters-the-catalogue",
    date: "2026-04-28",
    excerpt:
      "Notes on Yana Orlov's new record, the quiet discipline of the sleeve, and the listening session planned in Ghent.",
    image: "",
  },
  {
    title: "FLIPSART: editions as companions",
    slug: "flipsart-editions-as-companions",
    date: "2026-04-11",
    excerpt:
      "How the art programme sits beside the music catalogue without becoming packaging, poster, or afterthought.",
    image: "",
  },
  {
    title: "Field notes from Antwerp",
    slug: "field-notes-from-antwerp",
    date: "2026-03-19",
    excerpt:
      "A short dispatch from the studio: test pressings, linen studies, screenprint experiments, and one very full table.",
    image: "",
  },
];
