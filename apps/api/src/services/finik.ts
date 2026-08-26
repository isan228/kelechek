import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Signer } from "@mancho.devs/authorizer";

type RequestData = {
  body: Record<string, unknown> | null;
  headers: Record<string, string | undefined>;
  httpMethod: string;
  path: string;
  queryStringParameters: Record<string, string | undefined> | null;
};

/** Корень монорепо: …/kelechek */
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Пара ключей мерчанта в корне проекта (не коммитить). */
export const FINIK_PRIVATE_KEY_FILE = join(PROJECT_ROOT, "finik_private.pem");
export const FINIK_PUBLIC_KEY_FILE = join(PROJECT_ROOT, "finik_public.pem");

/** Публичный ключ Finik (prod) для проверки webhook — из документации. */
export const FINIK_PROD_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuF/PUmhMPPidcMxhZBPb
BSGJoSphmCI+h6ru8fG8guAlcPMVlhs+ThTjw2LHABvciwtpj51ebJ4EqhlySPyT
hqSfXI6Jp5dPGJNDguxfocohaz98wvT+WAF86DEglZ8dEsfoumojFUy5sTOBdHEu
g94B4BbrJvjmBa1YIx9Azse4HFlWhzZoYPgyQpArhokeHOHIN2QFzJqeriANO+wV
aUMta2AhRVZHbfyJ36XPhGO6A5FYQWgjzkI65cxZs5LaNFmRx6pjnhjIeVKKgF99
4OoYCzhuR9QmWkPl7tL4Kd68qa/xHLz0Psnuhm0CStWOYUu3J7ZpzRK8GoEXRcr8
tQIDAQAB
-----END PUBLIC KEY-----`;

/** Публичный ключ Finik (beta). */
export const FINIK_BETA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwlrlKz/8gLWd1ARWGA/8
o3a3Qy8G+hPifyqiPosiTY6nCHovANMIJXk6DH4qAqqZeLu8pLGxudkPbv8dSyG7
F9PZEAryMPzjoB/9P/F6g0W46K/FHDtwTM3YIVvstbEbL19m8yddv/xCT9JPPJTb
LsSTVZq5zCqvKzpupwlGS3Q3oPyLAYe+ZUn4Bx2J1WQrBu3b08fNaR3E8pAkCK27
JqFnP0eFfa817VCtyVKcFHb5ij/D0eUP519Qr/pgn+gsoG63W4pPHN/pKwQUUiAy
uLSHqL5S2yu1dffyMcMVi9E/Q2HCTcez5OvOllgOtkNYHSv9pnrMRuws3u87+hNT
ZwIDAQAB
-----END PUBLIC KEY-----`;

function readPem(path: string, label: string): string {
  if (!existsSync(path)) {
    throw new Error(`${label}_MISSING:${path}`);
  }
  return readFileSync(path, "utf8").trim();
}

/** Закрытый ключ мерчанта — подпись запросов к Finik. */
export function loadFinikPrivateKey(): string {
  return readPem(FINIK_PRIVATE_KEY_FILE, "FINIK_PRIVATE_KEY");
}

/** Публичный ключ мерчанта — тот же файл, что загружаете в кабинет Finik. */
export function loadFinikPublicKey(): string {
  return readPem(FINIK_PUBLIC_KEY_FILE, "FINIK_PUBLIC_KEY");
}

export function isMockPayments(): boolean {
  return process.env.MOCK_PAYMENTS === "true";
}

export function isFinikConfigured(): boolean {
  return Boolean(
    process.env.FINIK_API_KEY &&
      process.env.FINIK_ACCOUNT_ID &&
      existsSync(FINIK_PRIVATE_KEY_FILE) &&
      existsSync(FINIK_PUBLIC_KEY_FILE),
  );
}

function finikBaseUrl(): string {
  const env = (process.env.FINIK_ENV ?? "prod").toLowerCase();
  if (process.env.FINIK_BASE_URL) return process.env.FINIK_BASE_URL.replace(/\/$/, "");
  return env === "beta"
    ? "https://beta.api.acquiring.averspay.kg"
    : "https://api.acquiring.averspay.kg";
}

function webOrigin(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
}

/** Публичный ключ Finik (эквайер) для проверки webhook. */
function webhookPublicKey(): string {
  const fromFile = join(PROJECT_ROOT, "finik_webhook_public.pem");
  if (existsSync(fromFile)) {
    return readFileSync(fromFile, "utf8").trim();
  }
  const env = (process.env.FINIK_ENV ?? "prod").toLowerCase();
  return env === "beta" ? FINIK_BETA_PUBLIC_KEY : FINIK_PROD_PUBLIC_KEY;
}

export type CreateFinikPaymentInput = {
  paymentId: string;
  amountKgs: number;
  description?: string;
  lang?: "ru" | "ky" | "en";
};

/** Создаёт платёж в Finik и возвращает URL QR-страницы (из Location 302). */
export async function createFinikPaymentUrl(input: CreateFinikPaymentInput): Promise<string> {
  const apiKey = process.env.FINIK_API_KEY!;
  const accountId = process.env.FINIK_ACCOUNT_ID!;
  const privateKey = loadFinikPrivateKey();
  // Убеждаемся, что публичный ключ лежит в корне (тот, что отдан Finik).
  loadFinikPublicKey();
  const baseUrl = finikBaseUrl();
  const host = new URL(baseUrl).host;
  const path = "/v1/payment";
  const timestamp = Date.now().toString();
  const origin = webOrigin();

  const body = {
    Amount: input.amountKgs,
    CardType: "FINIK_QR",
    PaymentId: input.paymentId,
    RedirectUrl: `${origin}/pay/success?paymentId=${input.paymentId}`,
    Data: {
      accountId,
      name_en: process.env.FINIK_QR_NAME ?? "Kelechek",
      webhookUrl: `${origin}/api/webhooks/finik`,
      description: input.description ?? "Kelechek membership",
      Lang: input.lang ?? "ru",
    },
  };

  const requestData: RequestData = {
    httpMethod: "POST",
    path,
    headers: {
      Host: host,
      "x-api-key": apiKey,
      "x-api-timestamp": timestamp,
    },
    queryStringParameters: null,
    body: body as Record<string, unknown>,
  };

  const signature = await new Signer(requestData as never).sign(privateKey);
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-api-timestamp": timestamp,
      signature,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });

  if (res.status === 302 || res.status === 301 || res.status === 303) {
    const location = res.headers.get("location");
    if (!location) throw new Error("FINIK_NO_LOCATION");
    return location;
  }

  const text = await res.text();
  throw new Error(`FINIK_CREATE_FAILED:${res.status}:${text.slice(0, 400)}`);
}

export type FinikWebhookBody = {
  id?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  fields?: { paymentId?: string; amount?: number; [k: string]: unknown };
};

/** Проверка подписи входящего webhook Finik. */
export async function verifyFinikWebhook(opts: {
  body: unknown;
  path: string;
  host: string;
  headers: Record<string, string | string[] | undefined>;
  signature: string;
}): Promise<boolean> {
  const xApiHeaders: Record<string, string> = { Host: opts.host };
  for (const [key, value] of Object.entries(opts.headers)) {
    const lower = key.toLowerCase();
    if (lower.startsWith("x-api-") && typeof value === "string") {
      xApiHeaders[lower] = value;
    }
  }

  const requestData: RequestData = {
    httpMethod: "POST",
    path: opts.path,
    headers: xApiHeaders,
    queryStringParameters: null,
    body: (opts.body ?? null) as Record<string, unknown> | null,
  };

  return new Signer(requestData as never).verify(webhookPublicKey(), opts.signature);
}

export function isFinikSuccessStatus(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "success" || s === "succeeded";
}
