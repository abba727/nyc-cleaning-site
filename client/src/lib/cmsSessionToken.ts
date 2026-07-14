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
