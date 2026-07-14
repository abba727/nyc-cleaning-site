export const CMS_REMEMBERED_EMAIL_KEY = "nyc-cleaning.cms.remembered-email";

type EmailStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function normalizeCmsEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readRememberedCmsEmail(storage: EmailStorage) {
  return normalizeCmsEmail(storage.getItem(CMS_REMEMBERED_EMAIL_KEY) ?? "");
}

export function updateRememberedCmsEmail(storage: EmailStorage, email: string, remember: boolean) {
  if (!remember) {
    storage.removeItem(CMS_REMEMBERED_EMAIL_KEY);
    return;
  }

  const normalizedEmail = normalizeCmsEmail(email);
  if (normalizedEmail) storage.setItem(CMS_REMEMBERED_EMAIL_KEY, normalizedEmail);
}
