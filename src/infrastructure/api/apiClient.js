// src/infrastructure/api/apiClient.js
/**
 * Central fetch wrapper used by the whole front‑end.
 * (Local development against the Azure Functions emulator does NOT require a function key.)
 */
const BASE_URL = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT; // e.g. http://localhost:7071/api/v1

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path) {
  return `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    ...(import.meta.env.VITE_API_TOKEN && {
      Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
    }),
  };
}

export const apiClient = {
  async post(path, body, { retries = 2 } = {}) {
    const url = buildUrl(path);
    const headers = buildHeaders();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const json = await resp.json().catch(() => null);
        if (!resp.ok) {
          throw {
            status: resp.status,
            code: json?.error?.code ?? "API_ERROR",
            message: json?.error?.message ?? resp.statusText,
            details: json?.error?.details,
          };
        }
        return json;
      } catch (err) {
        const isNetwork = err instanceof TypeError;
        if (attempt < retries && isNetwork) {
          await delay(300 * 2 ** attempt);
          continue;
        }
        throw err;
      }
    }
  },

  async get(path) {
    const url = buildUrl(path);
    const headers = buildHeaders();
    const resp = await fetch(url, { method: "GET", headers });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      throw {
        status: resp.status,
        code: json?.error?.code ?? "API_ERROR",
        message: json?.error?.message ?? resp.statusText,
        details: json?.error?.details,
      };
    }
    return json;
  },

  async delete(path) {
    const url = buildUrl(path);
    const headers = buildHeaders();
    const resp = await fetch(url, { method: "DELETE", headers });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      throw {
        status: resp.status,
        code: json?.error?.code ?? "API_ERROR",
        message: json?.error?.message ?? resp.statusText,
        details: json?.error?.details,
      };
    }
    return json;
  },
};
