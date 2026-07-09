import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Consistent API envelope: { success, data } | { success, error } */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ success: true, data } satisfies ApiEnvelope<T>, init);

export const created = <T>(data: T) => ok(data, { status: 201 });

export const fail = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json(
    { success: false, error: { code, message, details } } satisfies ApiEnvelope<never>,
    { status },
  );

/** Wrap a route handler: catches ApiError/ZodError/unknown into the envelope. */
export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return fail(err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return fail(422, "VALIDATION_ERROR", "Invalid input", err.flatten());
  }
  console.error("[api] unhandled error:", err);
  return fail(500, "INTERNAL_ERROR", "Something went wrong");
}

export const notFound = (what = "Resource") =>
  new ApiError(404, "NOT_FOUND", `${what} not found`);
export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to do this") =>
  new ApiError(403, "FORBIDDEN", message);
export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
