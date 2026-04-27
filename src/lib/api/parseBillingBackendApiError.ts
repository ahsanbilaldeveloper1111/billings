import axios from "axios";

export type ParsedBillingBackendApiError = {
  status?: number;
  /** First line for titles / single-message UIs */
  headline: string;
  /** API `errors` flattened, or top-level `message` when no field errors */
  messages: string[];
};

const FALLBACK = "Something went wrong.";

function collectErrorMessages(data: unknown): string[] {
  const out: string[] = [];
  if (!data || typeof data !== "object") return out;

  const errors = (data as { errors?: Record<string, unknown> }).errors;
  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    for (const key of Object.keys(errors)) {
      const val = errors[key];
      if (Array.isArray(val)) {
        for (const line of val) {
          if (typeof line === "string" && line.trim()) out.push(line.trim());
        }
      } else if (typeof val === "string" && val.trim()) {
        out.push(val.trim());
      }
    }
  }

  if (out.length === 0) {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) out.push(msg.trim());
  }

  if (out.length === 0) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) {
      out.push(err.trim());
    } else if (Array.isArray(err)) {
      for (const line of err) {
        if (typeof line === "string" && line.trim()) out.push(line.trim());
      }
    }
  }

  return out;
}

/**
 * Reads billing backend JSON error bodies: `{ message, errors: { field: string[] } }` (422, etc.)
 * and generic Axios failures.
 */
export function parseBillingBackendApiError(
  error: unknown,
): ParsedBillingBackendApiError {
  if (!axios.isAxiosError(error)) {
    return {
      headline: error instanceof Error ? error.message : FALLBACK,
      messages: [],
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const messages = collectErrorMessages(data);

  const fromDataMessage =
    typeof data === "object" &&
    data &&
    typeof (data as { message?: unknown }).message === "string"
      ? String((data as { message: string }).message).trim()
      : "";
  const fromDataError =
    typeof data === "object" &&
    data &&
    typeof (data as { error?: unknown }).error === "string"
      ? String((data as { error: string }).error).trim()
      : "";

  const headline =
    messages[0] || fromDataMessage || fromDataError || error.message || FALLBACK;

  return {
    status,
    headline,
    messages,
  };
}
