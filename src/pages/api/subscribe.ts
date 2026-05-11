import type { APIRoute } from "astro";
import { isValidEmail, subscribeToAudience } from "../../lib/emailit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent");

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, message: "Use a valid email address." }, { status: 400 });
  }

  if (consent !== "on") {
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
