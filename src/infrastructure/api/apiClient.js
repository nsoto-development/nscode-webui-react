// src/infrastructure/api/apiClient.js
/**
 * Central fetch wrapper used by the whole front‑end.
 * The token‑budget check has been removed (you can re‑add it later if needed).
 */
const BASE_URL = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT; // e.g. http://localhost:7071/CodeAgentFunction/

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const apiClient = {
  /**
   * POST helper with retries and unified error shape.
   *
   * @param {string} path   – path to append to BASE_URL (e.g. "v1/chat/completions")
   * @param {object} body   – JSON payload that will be stringified
   * @param {object} [options] – currently only { retries? } is supported
   */
  async post(path, body, { retries = 2 } = {}) {
    const url = `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
    const headers = {
      "Content-Type": "application/json",
      ...(import.meta.env.VITE_API_TOKEN && {
        Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
      }),
    };

    // ---------- retry loop ----------
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
        const isNetwork = err instanceof TypeError; // fetch throws TypeError on network failure
        if (attempt < retries && isNetwork) {
          await delay(300 * 2 ** attempt); // exponential back‑off
          continue;
        }
        throw err; // final error
      }
    }
  },

  // -----------------------------------------------------------------
  // Optional GET / DELETE helpers (they also use the same BASE_URL)
  // -----------------------------------------------------------------
  async get(path) {
    const url = `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
    const headers = {
      ...(import.meta.env.VITE_API_TOKEN && {
        Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
      }),
    };
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
    const url = `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
    const headers = {
      ...(import.meta.env.VITE_API_TOKEN && {
        Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
      }),
    };
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
