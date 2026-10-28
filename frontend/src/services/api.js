const rawApiUrl = import.meta.env.VITE_API_URL || "";
const BASE_URL = rawApiUrl ? `${rawApiUrl.replace(/\/+$/, "")}/api` : "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Ocurrió un error inesperado");
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};