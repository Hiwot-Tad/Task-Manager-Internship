import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload;
}

export function withAuth<T = any>(
  handler: (req: AuthenticatedRequest, ...args: T[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T[]): Promise<NextResponse> => {
    try {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authorization token required' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 500 }
        );
      }

      // Add user data to request
      (request as AuthenticatedRequest).user = decoded;
      
      return handler(request as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}
