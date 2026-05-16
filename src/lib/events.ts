import type { EventItem } from "../data/events";

export const getBelgiumDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const isUpcomingEvent = (event: EventItem, todayKey = getBelgiumDateKey()) => {
  if (!event.date) return event.status === "upcoming";
  if (event.status === "past") return false;

  return event.date >= todayKey;
};
