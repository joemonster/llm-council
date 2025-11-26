// Shared authentication utilities

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from './cors.ts';

export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null; // Token expired
    }
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  // Try custom header first (for user tokens)
  const customToken = req.headers.get('X-User-Token');
  if (customToken) {
    return customToken;
  }

  // Fallback to Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function getUserFromRequest(req: Request): Promise<{ userId: string; username: string } | null> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

export function requireAuth(req: Request): Response | { userId: string; username: string } {
  const token = getTokenFromRequest(req);
  if (!token) {
    return errorResponse('Unauthorized - no token provided', 401);
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return errorResponse('Unauthorized - invalid or expired token', 401);
  }

  return decoded;
}
