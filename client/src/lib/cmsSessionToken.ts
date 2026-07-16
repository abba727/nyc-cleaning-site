export const CMS_SESSION_TOKEN_KEY = "nyc-cleaning.cms.session-token";

type TokenStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function readCmsSessionToken(sessionStorage: TokenStorage, localStorage: TokenStorage) {
  return sessionStorage.getItem(CMS_SESSION_TOKEN_KEY)
    ?? localStorage.getItem(CMS_SESSION_TOKEN_KEY)
    ?? "";
}

export function storeCmsSessionToken(
  sessionStorage: TokenStorage,
  localStorage: TokenStorage,
  token: string,
  rememberMe: boolean,
) {
  clearCmsSessionToken(sessionStorage, localStorage);
  const target = rememberMe ? localStorage : sessionStorage;
  target.setItem(CMS_SESSION_TOKEN_KEY, token);
}

export function clearCmsSessionToken(sessionStorage: TokenStorage, localStorage: TokenStorage) {
  sessionStorage.removeItem(CMS_SESSION_TOKEN_KEY);
  localStorage.removeItem(CMS_SESSION_TOKEN_KEY);
}

export function getCmsSessionExpiration(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === "number" && Number.isFinite(decoded.exp)
      ? decoded.exp * 1000
      : null;
  } catch {
    return null;
  }
}
