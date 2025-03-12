import { ErrorRequestHandler } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { AppError, ZodValidationException } from "../utils/appError";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.log(`Error occurred on PATH ${req.path}`);

  // Handle JSON parse errors
  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON data passed.",
      error: (error as Error).message || "Invalid JSON data.",
    });
  }

  // Handle Zod validation errors specifically
  if (error instanceof ZodValidationException) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
      details: error.details?.errors || error.details?.format(), // Format Zod errors nicely
    });
  }

  // Handle all custom AppErrors (this catches all your custom error classes)

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  // Handle any other unexpected errors
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal server error. Please try again later.",
    error: (error as Error).message || "An unexpected error occurred.",
  });
};
