import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function successResponse<T>(data: T, statusCode = 200) {
  return NextResponse.json(data, { status: statusCode });
}

export function errorResponse(message: string, statusCode = 500) {
  return NextResponse.json(
    { error: message },
    { status: statusCode }
  );
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    return errorResponse(`Validation error: ${validationErrors}`, 400);
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('Internal server error', 500);
}

export function validateRequest<T>(schema: any, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
