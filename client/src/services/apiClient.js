// One place that talks to the backend. Every service function goes through request().
// In development VITE_API_URL is empty, so calls go to /api and Vite proxies them to Express.
const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api`;
const TOKEN_KEY = 'campusgig_token';

export class ApiError extends Error {
  constructor(message, { status = 0, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || [];
  }
}

// localStorage can throw (private mode, blocked storage), so every access is guarded.
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* the person will simply need to log in again next time */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  const token = auth ? tokenStore.get() : null;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* the server sent something that is not JSON */
  }

  if (!response.ok || !payload || payload.success === false) {
    const error = new ApiError(payload?.message || 'Something went wrong. Please try again.', {
      status: response.status,
      code: payload?.code,
      errors: payload?.errors,
    });
    // A rejected token or a suspended account means the saved login is no longer usable.
    const sessionRejected = response.status === 401 || error.code === 'ACCOUNT_SUSPENDED';
    if (token && sessionRejected && unauthorizedHandler) unauthorizedHandler(error);
    throw error;
  }

  return payload.data;
}
