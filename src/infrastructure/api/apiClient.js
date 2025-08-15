// src/infrastructure/api/apiClient.js
const BASE_URL = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT; // e.g. https://myfunc.azurewebsites.net/api

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const apiClient = {
  /**
   * POST helper with retries, optional token‑budget, and unified error shape.
   * @param {string} path   – path relative to BASE_URL (e.g. "/prompt")
   * @param {object} body   – JSON payload
   * @param {object} [options] – {retries?, tokenBudget?}
   */
  async post(path, body, { retries = 2, tokenBudget = {} } = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(import.meta.env.VITE_API_TOKEN && {
        Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
      }),
    };

    // ---- token‑budget guard (client‑side) ----
    // if (tokenBudget.maxInputTokens) {
    //   const approxTokens = Math.ceil(JSON.stringify(body).length / 4);
    //   if (approxTokens > tokenBudget.maxInputTokens) {
    //     throw {
    //       status: 400,
    //       code: "TOKEN_BUDGET_EXCEEDED",
    //       message: `Payload exceeds ${tokenBudget.maxInputTokens} tokens`,
    //     };
    //   }
    // }

    // ---- retry loop ----
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
};