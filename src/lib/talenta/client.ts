/**
 * Talenta (Mekari) API Client
 *
 * Authentication: OAuth 2.0 Client Credentials with HMAC-SHA256 request signing.
 *
 * Docs reference: https://documenter.getpostman.com/view/12246325/Tzm3nx7x
 *
 * Note: Adjust endpoint paths and request signing to match your Talenta
 * subscription version. This implementation follows the Mekari API v3 pattern.
 */

import crypto from "crypto";
import type {
  TalentaAuthToken,
  TalentaPaginatedResponse,
  TalentaRawEmployee,
} from "./types";

const BASE_URL = process.env.TALENTA_BASE_URL ?? "https://api.mekari.com";
const CLIENT_ID = process.env.TALENTA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.TALENTA_CLIENT_SECRET ?? "";
const COMPANY_ID = process.env.TALENTA_COMPANY_ID ?? "";

let cachedToken: TalentaAuthToken | null = null;
let tokenExpiresAt = 0;

function generateHmacSignature(
  method: string,
  path: string,
  date: string
): string {
  const requestTarget = `${method.toLowerCase()} ${path}`;
  const signingString = `date: ${date}\nrequest-target: ${requestTarget}`;
  return crypto
    .createHmac("sha256", CLIENT_SECRET)
    .update(signingString)
    .digest("base64");
}

function buildAuthorizationHeader(method: string, path: string): string {
  const date = new Date().toUTCString();
  const signature = generateHmacSignature(method, path, date);
  const header = [
    `keyId="${CLIENT_ID}"`,
    `algorithm="hmac-sha256"`,
    `headers="date request-target"`,
    `signature="${signature}"`,
  ].join(",");
  return `hmac ${header}`;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken.access_token;
  }

  const path = "/oauth/token";
  const method = "POST";
  const authorization = buildAuthorizationHeader(method, path);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authorization,
      Date: new Date().toUTCString(),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Talenta auth failed (${res.status}): ${text}`);
  }

  const token: TalentaAuthToken = await res.json();
  cachedToken = token;
  tokenExpiresAt = now + token.expires_in * 1000 - 60_000; // 1-min buffer
  return token.access_token;
}

async function talentaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-company-id": COMPANY_ID,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Talenta API error ${res.status} on ${path}: ${text}`);
  }

  return res.json();
}

export async function getEmployees(
  page = 1,
  perPage = 100
): Promise<TalentaPaginatedResponse<TalentaRawEmployee>> {
  return talentaFetch(
    `/v3/employees?page=${page}&per_page=${perPage}&employment_type=contract`
  );
}

export async function getAllEmployees(): Promise<TalentaRawEmployee[]> {
  const all: TalentaRawEmployee[] = [];
  let page = 1;

  while (true) {
    const res = await getEmployees(page, 100);
    all.push(...res.data);
    if (page >= res.meta.last_page) break;
    page++;
  }

  return all;
}

export async function getEmployee(
  id: number
): Promise<TalentaRawEmployee> {
  return talentaFetch(`/v3/employees/${id}`);
}

export function isTalentaConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && COMPANY_ID);
}
