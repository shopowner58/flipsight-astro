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

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "FLIPSIGHT contact").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = formData.get("consent");

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

    if (consent === "on") {
      await subscribeToAudience(email).catch((error) => console.error(error));
    }

    return Response.json({ ok: true, message: "Message sent. Thank you." });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Could not send right now. Please email studio@flipsight.be." }, { status: 502 });
  }
};
