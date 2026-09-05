/**
 * Application error hierarchy. Route handlers catch `AppError` and use
 * `.statusCode` + `.publicMessage` to build the HTTP response. Anything that
 * isn't an `AppError` is logged in full server-side and returned to the
 * client as a generic, detail-free 500. Never leak `error.message` from an
 * unknown/internal error to the client.
 */

import type { ZodType, ZodTypeDef } from "zod";

export class AppError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(publicMessage: string, statusCode: number, cause?: unknown) {
    super(publicMessage, { cause });
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

export class ValidationError extends AppError {
  readonly issues?: unknown;
  constructor(message = "Invalid input.", issues?: unknown) {
    super(message, 400);
    this.issues = issues;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to do this.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "This conflicts with existing data.") {
    super(message, 409);
  }
}

export class PaymentError extends AppError {
  constructor(message = "Payment could not be processed.", cause?: unknown) {
    super(message, 402, cause);
  }
}

export class StorageError extends AppError {
  constructor(message = "File storage operation failed.", cause?: unknown) {
    super(message, 500, cause);
  }
}

export class WebhookError extends AppError {
  constructor(message = "Webhook could not be verified.", cause?: unknown) {
    super(message, 400, cause);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Parse `data` against a zod `schema`, throwing a `ValidationError` (caught
 * by every route's `isAppError` check → a proper 400 with a useful message)
 * instead of letting a raw `ZodError` escape. A bare `schema.parse(...)`
 * throws `ZodError`, which is NOT an `AppError` — route handlers then fall
 * through to their generic catch-all and return an opaque, detail-free 500
 * "Internal server error.", even for an ordinary bad-input mistake (e.g. a
 * price field that didn't parse to a number). Use this instead of
 * `schema.parse(...)` wherever a request body/query is validated.
 */
export function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".");
    const message = issue ? `${path ? `${path}: ` : ""}${issue.message}` : "Invalid input.";
    throw new ValidationError(message, result.error.issues);
  }
  return result.data;
}
