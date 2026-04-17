/** First non-empty trimmed string, in argument order. */
export function firstLogoField(
  ...values: (string | null | undefined)[]
): string | null {
  for (const v of values) {
    if (v == null) continue;
    const t = String(v).trim();
    if (t) return t;
  }
  return null;
}

/**
 * Value to pass to {@link logoDisplaySrc} for `<img src>` when both
 * `logo` (e.g. storage path) and `logo_url` (https, `data:…`, or base64) exist.
 * Prefers `logo_url` first so a long base64 / data URL in that field wins over
 * a storage key in `logo`.
 */
export function logoPreviewSource(
  logo: string | null | undefined,
  logoUrl: string | null | undefined,
): string | null {
  return firstLogoField(logoUrl, logo);
}

/**
 * When true, do not bind the value to a visible text input (data URLs / huge
 * base64). The value is still kept in form state for save; show preview only.
 */
export function shouldHideLogoTextValue(s: string | null | undefined): boolean {
  const t = String(s ?? "").trim();
  if (!t) return false;
  if (/^data:/i.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  if (compact.length < 280) return false;
  if (/^https?:\/\//i.test(compact)) return false;
  // storage paths use "/" — do not treat as opaque base64
  if (compact.includes("/") && !compact.startsWith("/9j/")) return false;
  return /^[A-Za-z0-9+/=_-]+$/.test(compact);
}

/**
 * Builds a string suitable for `<img src>` from logo fields that may be
 * absolute URLs, `data:` URLs, storage paths, or raw base64 (with or without
 * the `data:image/...;base64,` prefix).
 *
 * Normalizes JSON-style escaped slashes (`data:image\/png;base64,...`).
 */
export function logoDisplaySrc(
  logoPath: string | null | undefined,
): string | null {
  if (logoPath == null) return null;
  const raw0 = String(logoPath).trim();
  if (!raw0) return null;
  const raw = raw0.replace(/\\\//g, "/");

  if (raw.startsWith("data:")) {
    return raw;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const lower = raw.toLowerCase();
  if (
    lower.startsWith("storage/") ||
    lower.startsWith("/storage/") ||
    lower.startsWith("images/") ||
    lower.startsWith("/images/")
  ) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  const compact = raw.replace(/\s/g, "");
  const looksLikeBase64Chunk =
    /^[A-Za-z0-9+/=_-]+$/.test(compact) &&
    compact.length >= 48 &&
    !raw.includes("://");

  if (looksLikeBase64Chunk) {
    if (compact.startsWith("iVBORw")) {
      return `data:image/png;base64,${compact}`;
    }
    if (compact.startsWith("R0lGOD")) {
      return `data:image/gif;base64,${compact}`;
    }
    if (compact.startsWith("UklGR")) {
      return `data:image/webp;base64,${compact}`;
    }
    if (compact.startsWith("PHN2Zy")) {
      return `data:image/svg+xml;base64,${compact}`;
    }
    if (compact.startsWith("/9j/")) {
      return `data:image/jpeg;base64,${compact}`;
    }
    return `data:image/png;base64,${compact}`;
  }

  if (!raw.startsWith("/")) {
    return `/storage/${raw}`;
  }

  return raw;
}
