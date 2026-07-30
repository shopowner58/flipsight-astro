const EMAILIT_SEND_URL = "https://api.emailit.com/v2/emails";

const getEnv = (key: string) => import.meta.env[key] as string | undefined;

const getEmailitApiKey = () => getEnv("EMAILIT_API_KEY")?.trim();

export const getAudienceSubscribeUrl = () =>
  getEnv("EMAILIT_AUDIENCE_SUBSCRIBE_URL")?.trim() ??
  "https://api.emailit.com/v1/audiences/subscribe/4b1c929955aef899fddbfa5531af23e4";

export const getMerchAudienceSubscribeUrl = () =>
  getEnv("EMAILIT_MERCH_AUDIENCE_SUBSCRIBE_URL")?.trim() ?? getAudienceSubscribeUrl();

export const getEmailFrom = () => getEnv("EMAIL_FROM")?.trim() ?? "FLIPSIGHT <studio@flipsight.be>";

export const getEmailReplyTo = () => getEnv("EMAIL_REPLY_TO")?.trim() ?? "studio@flipsight.be";

export type EmailitSendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export async function subscribeToAudience(email: string, audienceUrl?: string) {
  const apiKey = getEmailitApiKey();
  const url = audienceUrl?.trim() || getAudienceSubscribeUrl();

  if (!apiKey) {
    throw new Error("EMAILIT_API_KEY is not configured.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Emailit subscribe failed with HTTP ${response.status}. ${detail}`);
  }

  return response;
}

export async function sendEmail({ to, subject, html, text, replyTo }: EmailitSendInput) {
  const apiKey = getEmailitApiKey();

  if (!apiKey) {
    throw new Error("EMAILIT_API_KEY is not configured.");
  }

  const response = await fetch(EMAILIT_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to,
      reply_to: replyTo ?? getEmailReplyTo(),
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Emailit send failed with HTTP ${response.status}. ${detail}`);
  }

  return response;
}
