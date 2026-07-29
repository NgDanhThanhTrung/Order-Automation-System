// =============================================================================
// Request Validator Middleware — Zod schema validation
// Dùng cho route handlers để validate body/query/params.
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type Target = "body" | "query" | "params";

export function validateRequest<T>(schema: ZodSchema<T>, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const issues = (result.error as ZodError).issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));

      res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: issues,
      });
      return;
    }

    // Gắn parsed data đã validated vào request
    req[target] = result.data as typeof req[typeof target];
    next();
  };
}
