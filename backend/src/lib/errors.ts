import { Request, Response, NextFunction } from "express";

// ----- Base Error -----
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ----- Conflict (409) -----
export class ConflictError extends AppError {
  constructor(
    public type:
      | "ROOM_CONFLICT"
      | "COURSE_CONFLICT"
      | "CAPACITY_ERROR"
      | "EQUIPMENT_ERROR"
      | "DUPLICATE_PENDING"
      | "DUPLICATE_NAME"
      | "DUP_SYSTEM"
      | "DUP_SLOT",
    message: string,
    public suggestions?: any[]
  ) {
    super(409, message, type);
    this.name = "ConflictError";
  }
}

// ----- Not Found (404) -----
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = "NotFoundError";
  }
}

// ----- Forbidden (403) -----
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

// ----- Validation (400) -----
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}

// ----- Global Error Handler Middleware -----
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Typed app errors
  if (err instanceof ConflictError) {
    const body: any = { error: err.message, type: err.type };
    if (err.suggestions) body.suggestions = err.suggestions;
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // PostgreSQL errors (from drizzle / pg)
  const pgErr = err as any;
  const pgCode = pgErr?.code || pgErr?.cause?.code;

  if (pgCode === "23P01") {
    return res.status(409).json({ error: "Room already booked for this time range" });
  }
  if (pgCode === "23505") {
    return res.status(409).json({ error: "Name already exists" });
  }
  if (pgCode === "23503") {
    return res.status(409).json({ error: "Referenced record does not exist or has dependents" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}
