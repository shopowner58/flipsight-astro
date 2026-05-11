import type { APIRoute } from "astro";
import { isValidEmail, subscribeToAudience } from "../../lib/emailit";

export const prerender = false;

const readBody = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const formData = await request.formData();
  return Object.fromEntries(formData);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await readBody(request);
  const email = String(body.email ?? "").trim().toLowerCase();
  const consent = body.consent;

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, message: "Use a valid email address." }, { status: 400 });
  }

  if (consent !== "on" && consent !== true) {
    return Response.json({ ok: false, message: "Please confirm that you want to receive FLIPSIGHT updates." }, { status: 400 });
  }

  try {
    await subscribeToAudience(email);
    return Response.json({ ok: true, message: "You are on the FLIPSIGHT list." });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Could not subscribe right now. Please try again later." }, { status: 502 });
  }
};
