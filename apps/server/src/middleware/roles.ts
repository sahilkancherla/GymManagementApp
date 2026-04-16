import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import type { AuthenticatedRequest } from './auth';
import type { Role } from '@acuo/shared';

export function requireGymRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;
    const gymId = req.params.gymId;

    if (!gymId) {
      res.status(400).json({ error: 'Missing gymId parameter' });
      return;
    }

    const { data, error } = await supabase
      .from('gym_members')
      .select('id, roles:gym_member_roles(role)')
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const memberRoles: string[] = (data.roles as any[] | null)?.map((r) => r.role) ?? [];
    const hasRole = memberRoles.some((r) => (roles as string[]).includes(r));

    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireGymMember() {
  return requireGymRole('member', 'coach', 'admin');
}
