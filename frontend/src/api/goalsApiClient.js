// src/api/goalsApiClient.js
/* eslint-disable no-undef */

function readCachedSession() {
  try {
    const raw = localStorage.getItem("pv_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Prefer the logged-in user's id; fallback to anon id
function getClientId() {
  const cached = readCachedSession();
  const userId = cached?.user?.id;
  if (userId) return userId;

  try {
    const KEY = "anon_client_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

const CLIENT_ID = getClientId();

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:5000";

// Generic helper (no Authorization header)
async function jsonFetch(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      msg = text || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

/* ---------------- CRUD (no auth header, but scoped by client_id) ---------------- */

export async function getMyGoals() {
  return jsonFetch(`${API}/api/goals?client_id=${encodeURIComponent(CLIENT_ID)}`);
}

export async function createGoal(payload) {
  return jsonFetch(`${API}/api/goals`, {
    method: "POST",
    body: JSON.stringify({ ...payload, client_id: CLIENT_ID }),
  });
}

export async function updateGoal(id, patch) {
  return jsonFetch(`${API}/api/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, client_id: CLIENT_ID }),
  });
}

export async function completeGoal(id) {
  return jsonFetch(`${API}/api/goals/${id}/complete`, {
    method: "POST",
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });
}

export async function deleteGoal(id) {
  return jsonFetch(`${API}/api/goals/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });
}
