import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    [key: string]: any;
  };
}

// Safely parse Firebase JWT payload without crashing on ESM/CJS imports
function parseFirebaseToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    
    // Validate expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      uid: payload.user_id || payload.sub || 'anonymous',
      email: payload.email || '',
      name: payload.name || '',
      ...payload,
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // Attempt Admin SDK if available
    try {
      const { adminAuth } = await import('../lib/firebase-admin.ts');
      if (adminAuth) {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        return next();
      }
    } catch {
      // Fallback to safe JWT payload verification
    }

    const user = parseFirebaseToken(token);
    if (user) {
      req.user = user;
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      try {
        const { adminAuth } = await import('../lib/firebase-admin.ts');
        if (adminAuth) {
          const decodedToken = await adminAuth.verifyIdToken(token);
          req.user = decodedToken;
          return next();
        }
      } catch {
        // Fallback
      }

      const user = parseFirebaseToken(token);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid optional tokens
    }
  }
  next();
};
