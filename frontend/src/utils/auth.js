export const API_BASE_URL = "http://127.0.0.1:8000";

export function getToken() {
  return localStorage.getItem("access_token");
}

export function getUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Failed to read user information:", error);
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export async function authFetch(url, options = {}) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    window.location.href = "/login";
    return null;
  }

  return response;
}
