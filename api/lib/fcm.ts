import crypto from "crypto";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign
    .sign(sa.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !fcmToken) return;

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw) as ServiceAccount;
  } catch {
    console.warn("[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
    return;
  }

  try {
    const accessToken = await getAccessToken(sa);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: "/favicon.svg", badge: "/favicon.svg" },
              fcm_options: { link: data?.url || "/dashboard" },
            },
            data: data || {},
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn("[FCM] Send failed:", err);
    }
  } catch (e) {
    console.warn("[FCM] Send error:", e);
  }
}
