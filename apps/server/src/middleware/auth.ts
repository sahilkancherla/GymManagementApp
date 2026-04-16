import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: data.user.id,
      email: data.user.email!,
    };

    next();
  });
}
