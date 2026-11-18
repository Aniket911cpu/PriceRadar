const trackingParams = /^(utm_|ref$|tag$|fbclid$|gclid$|mc_cid$|mc_eid$)/i;

export function normalizeUrl(input: string): string {
  const url = new URL(input);
  [...url.searchParams.keys()].forEach((key) => {
    if (trackingParams.test(key)) url.searchParams.delete(key);
  });
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

export function productKey(input: string, stableId?: string): string {
  const url = new URL(normalizeUrl(input));
  return `${url.hostname}:${stableId?.trim().toLowerCase() || url.pathname + url.search}`;
}
