import { cookies } from "next/headers";
import type { ApiErrorBody } from "@shipyard/shared";

/** A non-2xx response from the Shipyard API. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? `API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Calls the API from the Next.js server (server components and server actions),
 * forwarding the browser's cookies so the API sees the user's session.
 *
 * The `as T` trusts our own API's response shape; the API's types come from
 * the same packages/shared definitions.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const hasBody = options.body !== undefined;

  const res = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      cookie: (await cookies()).toString(),
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(res.status, body);
  }
  return (await res.json()) as T;
}
