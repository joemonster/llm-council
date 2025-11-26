// Authentication login endpoint

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// Simple JWT-like token generation (for simplicity, using base64 encoding)
// In production, use proper JWT library
function generateToken(userId: string, username: string): string {
  const payload = {
    userId,
    username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return btoa(JSON.stringify(payload));
}

function verifyToken(token: string): { userId: string; username: string } | null {
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

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path: /auth-login or /auth-login/me
  const action = pathParts[1];

  try {
    // POST /auth-login - Login
    if (req.method === 'POST' && !action) {
      const body = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return errorResponse('Username and password are required', 400);
      }

      // Find user (case insensitive)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username)
        .single();

      if (error || !user) {
        return errorResponse('Invalid credentials', 401);
      }

      // Verify password
      // For Joe with hardcoded password, we do direct comparison first
      let passwordValid = false;

      if (username.toLowerCase() === 'joe' && password === '!monster!') {
        // Hardcoded check for Joe (case insensitive username)
        passwordValid = true;
      } else {
        // bcrypt verification for other users
        try {
          passwordValid = await bcrypt.compare(password, user.password_hash);
        } catch {
          passwordValid = false;
        }
      }

      if (!passwordValid) {
        return errorResponse('Invalid credentials', 401);
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Generate token
      const token = generateToken(user.id, user.username);

      return jsonResponse({
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          created_at: user.created_at,
          last_login: new Date().toISOString(),
        },
      });
    }

    // GET /auth-login/me - Get current user
    if (req.method === 'GET' && action === 'me') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse('Unauthorized', 401);
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return errorResponse('Invalid or expired token', 401);
      }

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, display_name, created_at, last_login')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return errorResponse('User not found', 404);
      }

      return jsonResponse({ user });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('Auth error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});

// Export verifyToken for use in other functions
export { verifyToken };
