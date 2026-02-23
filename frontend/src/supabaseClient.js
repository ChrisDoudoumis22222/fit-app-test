// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Enable debug logs:
 *  - add ?debug=1 to the URL, OR
 *  - localStorage.setItem("pv_debug", "1"); location.reload();
 */
const PV_DEBUG =
  typeof window !== "undefined" &&
  (() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return (
        qs.get("debug") === "1" ||
        window.localStorage.getItem("pv_debug") === "1"
      );
    } catch {
      return false;
    }
  })();

const dbg = {
  log: (...a) => PV_DEBUG && console.log("[PV DEBUG][SUPABASE]", ...a),
  warn: (...a) => PV_DEBUG && console.warn("[PV DEBUG][SUPABASE]", ...a),
  error: (...a) => PV_DEBUG && console.error("[PV DEBUG][SUPABASE]", ...a),
};

function getProjectRef(url) {
  try {
    const u = new URL(url);
    return u.hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error("Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY");
  // Fail fast: without these, Supabase client will misbehave anyway.
  throw new Error("Supabase env vars missing (URL / ANON KEY).");
} else if (PV_DEBUG) {
  try {
    const u = new URL(SUPABASE_URL);
    dbg.log("init", {
      origin: u.origin,
      projectRef: u.hostname.split(".")[0],
      anonKeyLength: SUPABASE_ANON_KEY.length,
      online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    });
  } catch {
    dbg.log("init", { url: SUPABASE_URL, anonKeyLength: SUPABASE_ANON_KEY.length });
  }
}

const PROJECT_REF = getProjectRef(SUPABASE_URL);
const STORAGE_KEY = `pv.sb.${PROJECT_REF}.auth`;

const FETCH_TIMEOUT_MS = 60000;

function redactHeaders(headers) {
  const out = {};
  if (!headers) return out;

  const entries =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
      ? headers
      : Object.entries(headers);

  for (const [k, v] of entries) {
    const key = String(k).toLowerCase();
    if (key === "authorization" || key === "apikey" || key === "x-client-info") {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

function normalizeUrl(input) {
  try {
    if (typeof input === "string") return input;
    if (input instanceof Request) return input.url;
    return String(input);
  } catch {
    return "[unknown-url]";
  }
}

function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();

  if (init.signal) {
    const s = init.signal;
    if (s.aborted) controller.abort();
    else s.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const url = normalizeUrl(input);
  const method =
    (init && init.method) ||
    (input instanceof Request ? input.method : undefined) ||
    "GET";

  const headers =
    (init && init.headers) ||
    (input instanceof Request ? input.headers : undefined);

  const requestId = PV_DEBUG
    ? `req_${Math.random().toString(16).slice(2)}_${Date.now()}`
    : null;

  if (PV_DEBUG) {
    dbg.log("fetch:start", {
      requestId,
      method,
      url,
      timeoutMs: FETCH_TIMEOUT_MS,
      headers: redactHeaders(headers),
    });
  }

  return fetch(input, { ...init, signal: controller.signal })
    .then((res) => {
      if (PV_DEBUG) {
        const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        dbg.log("fetch:done", {
          requestId,
          method,
          url,
          status: res.status,
          ok: res.ok,
          durationMs: Math.round(endedAt - startedAt),
        });
      }
      return res;
    })
    .catch((err) => {
      const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const isAbort =
        err?.name === "AbortError" ||
        String(err?.message || "").toLowerCase().includes("aborted");

      dbg.error("fetch:error", {
        requestId,
        method,
        url,
        durationMs: Math.round(endedAt - startedAt),
        aborted: isAbort,
        name: err?.name,
        message: err?.message,
      });

      throw err;
    })
    .finally(() => clearTimeout(id));
}

// Optional: avoid multiple listeners in dev/HMR
function attachAuthDebugOnce(client) {
  if (!PV_DEBUG || typeof window === "undefined") return;
  if (window.__PV_SUPABASE_AUTH_DEBUG_ATTACHED__) return;
  window.__PV_SUPABASE_AUTH_DEBUG_ATTACHED__ = true;

  client.auth.onAuthStateChange((event, session) => {
    dbg.log("auth:event", {
      event,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      expiresAt: session?.expires_at || null,
    });
  });

  window.addEventListener("online", () => dbg.log("network:online"));
  window.addEventListener("offline", () => dbg.warn("network:offline"));
  window.addEventListener("unhandledrejection", (e) =>
    dbg.error("unhandledrejection", e?.reason)
  );
  window.addEventListener("error", (e) =>
    dbg.error("window.error", e?.message, e?.error)
  );

  window.__PV_DEBUG__ = window.__PV_DEBUG__ || {};
  window.__PV_DEBUG__.supabase = client;
  window.__PV_DEBUG__.enable = () => {
    localStorage.setItem("pv_debug", "1");
    location.reload();
  };
  window.__PV_DEBUG__.disable = () => {
    localStorage.removeItem("pv_debug");
    location.reload();
  };
}

/**
 * ✅ Create the client (called once, then cached globally)
 */
function makeSupabaseClient() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      // ✅ unique per project to avoid collisions
      storageKey: STORAGE_KEY,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });

  attachAuthDebugOnce(client);

  if (PV_DEBUG) {
    dbg.log("client:ready", {
      projectRef: PROJECT_REF,
      storageKey: STORAGE_KEY,
    });
  }

  return client;
}

/**
 * ✅ True singleton across CRA dev / HMR:
 * caches the client on globalThis so it won't recreate sockets.
 */
const GLOBAL_KEY = "__PV_SUPABASE_CLIENT__";

export const supabase = (() => {
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = makeSupabaseClient();
  return g[GLOBAL_KEY];
})();