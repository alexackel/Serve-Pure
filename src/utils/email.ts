// Free-mail providers can't prove an organization owns its email address.
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'msn.com', 'protonmail.com', 'proton.me',
  'gmx.com', 'mail.com', 'zoho.com', 'yandex.com',
]);

function stripWww(host: string): string {
  return host.replace(/^www\./, '');
}

export function emailDomain(email: string): string | null {
  const at = email.trim().lastIndexOf('@');
  if (at < 0) return null;
  const domain = email.trim().slice(at + 1).toLowerCase();
  return domain || null;
}

export function isFreeMailEmail(email: string): boolean {
  const domain = emailDomain(email);
  return domain !== null && FREE_MAIL_DOMAINS.has(domain);
}

// Returns the bare host of a website, e.g. "https://www.example.org/about" -> "example.org".
export function websiteDomain(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return stripWww(new URL(withScheme).hostname.toLowerCase());
  } catch {
    return null;
  }
}

// The business email's domain must equal the website's domain.
export function businessEmailMatchesWebsite(email: string, website: string): boolean {
  const emailHost = emailDomain(email);
  const siteHost = websiteDomain(website);
  return emailHost !== null && siteHost !== null && stripWww(emailHost) === siteHost;
}
