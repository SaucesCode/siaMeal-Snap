/** Every parameter in a sign-in link, from both the query (?code=…) and the hash (#access_token=…). */
export function linkParams(url: string | null | undefined): Record<string, string> {
  if (!url) return {};
  const params: Record<string, string> = {};
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');
  const query = queryAt === -1 ? '' : url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined);
  const hash = hashAt === -1 ? '' : url.slice(hashAt + 1);
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const value = pair.slice(eq + 1);
      if (value) params[pair.slice(0, eq)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return params;
}

/** The error a link came back with, in plain words; null when the link is fine. */
export function linkError(params: Record<string, string>): string | null {
  if (!params.error && !params.error_description) return null;
  if (params.error_code === 'otp_expired' || /expired|invalid/i.test(params.error_description ?? '')) {
    return 'This link has expired or was already used. Ask for a new one.';
  }
  return params.error_description || params.error;
}
