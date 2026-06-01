import axios from "axios";

export const DEFAULT_SERVER_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.252.111:3000";

let apiBaseUrl = DEFAULT_SERVER_URL;

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): string {
  apiBaseUrl = normalizeServerUrl(url);
  api.defaults.baseURL = apiBaseUrl;
  return apiBaseUrl;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
