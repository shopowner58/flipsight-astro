import type { APIRoute } from "astro";
import { getEmailReplyTo, isValidEmail, sendEmail, subscribeToAudience } from "../../lib/emailit";

export const prerender = false;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
  const subject = String(body.subject ?? "FLIPSIGHT contact").trim();
  const message = String(body.message ?? "").trim();
  const consent = body.consent;

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, message: "Use a valid email address." }, { status: 400 });
  }

  if (message.length < 8) {
    return Response.json({ ok: false, message: "Write a short message first." }, { status: 400 });
  }

  try {
    await sendEmail({
      to: getEmailReplyTo(),
      replyTo: email,
      subject: subject || "FLIPSIGHT contact",
      html: `
        <p><strong>From:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject || "FLIPSIGHT contact")}</p>
        <hr>
        <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
      `,
      text: `From: ${email}\nSubject: ${subject || "FLIPSIGHT contact"}\n\n${message}`,
    });

    if (consent === "on" || consent === true) {
      await subscribeToAudience(email).catch((error) => console.error(error));
    }

    return Response.json({ ok: true, message: "Message sent. Thank you." });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Could not send right now. Please email studio@flipsight.be." }, { status: 502 });
  }
};
