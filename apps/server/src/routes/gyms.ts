import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireGymRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import {
  createGymSchema,
  updateGymSchema,
  addMemberRoleSchema,
  updateMemberSchema,
  addMemberSchema,
  adminUpdateMemberProfileSchema,
} from '@acuo/shared';
import { supabase } from '../supabase';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const gymRoutes = Router();

// Helper: ensure an ACTIVE membership exists for (gym, user), returning the id.
// Reactivates a previously-deactivated row so re-joins and admin re-adds work.
async function ensureMembership(gymId: string, userId: string): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('gym_members')
    .select('id, status')
    .eq('gym_id', gymId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    if (existing.status !== 'active') {
      const { error: updErr } = await supabase
        .from('gym_members')
        .update({ status: 'active' })
        .eq('id', existing.id);
      if (updErr) throw updErr;
    }
    return existing.id;
  }

  const { data: created, error: insErr } = await supabase
    .from('gym_members')
    .insert({ gym_id: gymId, user_id: userId, status: 'active' })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id;
}

// Create a gym (creator becomes admin)
gymRoutes.post('/gyms', requireAuth, validate(createGymSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert(req.body)
      .select()
      .single();
    if (gymError) throw gymError;

    const memberId = await ensureMembership(gym.id, user.id);

    const { error: roleError } = await supabase
      .from('gym_member_roles')
      .insert({ member_id: memberId, role: 'admin' });
    if (roleError) throw roleError;

    res.status(201).json(gym);
  } catch (err) {
    next(err);
  }
});

// List user's gyms (one row per gym, with an array of roles)
gymRoutes.get('/gyms', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data, error } = await supabase
      .from('gym_members')
      .select('id, status, gym:gyms(*), roles:gym_member_roles(role)')
      .eq('user_id', user.id);
    if (error) throw error;

    // Shape the response to match the prior API contract as closely as possible:
    // { role, status, gym } — we pick the highest-priority role as `role` and
    // also expose the full `roles` array for callers that want it.
    const rolePriority: Record<string, number> = { admin: 3, coach: 2, member: 1 };
    const out = (data || []).map((row: any) => {
      const roles: string[] = (row.roles || []).map((r: any) => r.role);
      const primary = roles.sort(
        (a, b) => (rolePriority[b] ?? 0) - (rolePriority[a] ?? 0),
      )[0] ?? null;
      return {
        id: row.id,
        role: primary,
        roles,
        status: row.status,
        gym: row.gym,
      };
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
});

// Search gyms by name (case-insensitive substring match). Used by the
// join-gym flow on mobile/web.
gymRoutes.get('/gyms/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .ilike('name', `%${q}%`)
      .limit(20);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

// Get gym details
gymRoutes.get('/gyms/:gymId', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', req.params.gymId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Update gym (admin only)
gymRoutes.put('/gyms/:gymId', requireAuth, requireGymRole('admin'), validate(updateGymSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.gymId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Upload gym logo (admin only)
gymRoutes.post('/gyms/:gymId/logo', requireAuth, requireGymRole('admin'), upload.single('logo'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const ext = file.originalname.split('.').pop();
    const filePath = `${req.params.gymId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('gym-logos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('gym-logos').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('gyms')
      .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', req.params.gymId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// List gym members (admin only) — one row per user, roles flattened into an array,
// plus the user's program enrollments at this gym (only programs that belong to this gym).
gymRoutes.get('/gyms/:gymId/members', requireAuth, requireGymRole('admin'), async (req, res, next) => {
  try {
    const gymId = req.params.gymId as string;

    const { data, error } = await supabase
      .from('gym_members')
      .select('id, user_id, status, notes, created_at, profile:profiles(*), roles:gym_member_roles(role)')
      .eq('gym_id', gymId);
    if (error) throw error;

    const userIds = (data || []).map((m: any) => m.user_id);

    // Pull this gym's program enrollments for the listed users in one round trip.
    let enrollmentsByUser = new Map<
      string,
      { id: string; program_id: string; program_name: string; status: 'active' | 'inactive' }[]
    >();
    if (userIds.length > 0) {
      const { data: enrollments, error: enrErr } = await supabase
        .from('program_enrollments')
        .select('id, user_id, status, program:programs!inner(id, name, gym_id)')
        .in('user_id', userIds)
        .eq('program.gym_id', gymId);
      if (enrErr) throw enrErr;

      for (const e of enrollments || []) {
        const program = (e as any).program;
        if (!program) continue;
        const list = enrollmentsByUser.get((e as any).user_id) || [];
        list.push({
          id: (e as any).id,
          program_id: program.id,
          program_name: program.name,
          status: (e as any).status,
        });
        enrollmentsByUser.set((e as any).user_id, list);
      }
    }

    // Pull active subscriptions with plan details for the listed users
    const subsByUser = new Map<string, any[]>();
    if (userIds.length > 0) {
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select(
          'id, user_id, status, period_end, plan:plans(id, name, price_cents, type, class_count)',
        )
        .eq('gym_id', gymId)
        .in('user_id', userIds);
      if (subErr) throw subErr;
      for (const s of subs || []) {
        const uid = (s as any).user_id as string;
        const list = subsByUser.get(uid) || [];
        list.push({
          id: (s as any).id,
          status: (s as any).status,
          period_end: (s as any).period_end,
          plan: (s as any).plan,
        });
        subsByUser.set(uid, list);
      }
    }

    const shaped = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      notes: row.notes ?? null,
      created_at: row.created_at,
      profile: row.profile,
      roles: (row.roles || []).map((r: any) => r.role),
      program_enrollments: enrollmentsByUser.get(row.user_id) || [],
      subscriptions: subsByUser.get(row.user_id) || [],
    }));
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

// Add a member to a gym by email (admin only).
// Looks up the user by email in auth.users via the admin API, then creates
// (or reactivates) their membership and grants the requested role (default 'member').
gymRoutes.post(
  '/gyms/:gymId/members',
  requireAuth,
  requireGymRole('admin'),
  validate(addMemberSchema),
  async (req, res, next) => {
    try {
      const { email, role, roles, gender } = req.body as {
        email: string;
        role?: string;
        roles?: string[];
        gender?: string | null;
      };
      const gymId = req.params.gymId as string;
      const targetEmail = email.trim().toLowerCase();

      // Find the auth user by email. supabase-js doesn't accept an email
      // filter on listUsers, so paginate until we find a match (or run out).
      let foundUserId: string | null = null;
      const perPage = 200;
      for (let page = 1; page <= 25 && !foundUserId; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users || [];
        const match = users.find((u) => (u.email || '').toLowerCase() === targetEmail);
        if (match) {
          foundUserId = match.id;
          break;
        }
        if (users.length < perPage) break;
      }

      if (!foundUserId) {
        res.status(404).json({
          error: 'No user found with that email. Ask them to sign up first.',
        });
        return;
      }

      const memberId = await ensureMembership(gymId, foundUserId);

      // Optionally set/update the member's gender on their profile.
      if (gender !== undefined) {
        const { error: genderErr } = await supabase
          .from('profiles')
          .update({ gender, updated_at: new Date().toISOString() })
          .eq('id', foundUserId);
        if (genderErr) throw genderErr;
      }

      // Grant roles (default ['member']); ignore duplicates.
      const grantRoles: string[] =
        roles && roles.length > 0
          ? Array.from(new Set(roles))
          : role
          ? [role]
          : ['member'];
      for (const r of grantRoles) {
        const { error: roleErr } = await supabase
          .from('gym_member_roles')
          .insert({ member_id: memberId, role: r });
        if (roleErr && roleErr.code !== '23505') throw roleErr;
      }

      // Return the new member shaped like the GET /members rows so the UI
      // can append it without a full refetch.
      const { data: row, error: rowErr } = await supabase
        .from('gym_members')
        .select(
          'id, user_id, status, notes, created_at, profile:profiles(*), roles:gym_member_roles(role)',
        )
        .eq('id', memberId)
        .single();
      if (rowErr) throw rowErr;

      res.status(201).json({
        id: (row as any).id,
        user_id: (row as any).user_id,
        status: (row as any).status,
        notes: (row as any).notes ?? null,
        created_at: (row as any).created_at,
        profile: (row as any).profile,
        roles: ((row as any).roles || []).map((r: any) => r.role),
        program_enrollments: [],
        subscriptions: [],
      });
    } catch (err) {
      next(err);
    }
  },
);

// Add a role to a member (admin only). Creates the membership if missing.
gymRoutes.post(
  '/gyms/:gymId/members/:userId/roles',
  requireAuth,
  requireGymRole('admin'),
  validate(addMemberRoleSchema),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const { gymId, userId } = req.params as { gymId: string; userId: string };

      const memberId = await ensureMembership(gymId, userId);

      const { data, error } = await supabase
        .from('gym_member_roles')
        .insert({ member_id: memberId, role })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'User already has this role at this gym' });
          return;
        }
        throw error;
      }

      res.status(201).json({ member_id: memberId, role: data.role });
    } catch (err) {
      next(err);
    }
  },
);

// Remove a role from a member (admin only)
gymRoutes.delete(
  '/gyms/:gymId/members/:userId/roles/:role',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { gymId, userId, role } = req.params;

      // Look up the membership
      const { data: membership, error: memErr } = await supabase
        .from('gym_members')
        .select('id')
        .eq('gym_id', gymId)
        .eq('user_id', userId)
        .maybeSingle();
      if (memErr) throw memErr;
      if (!membership) {
        res.status(404).json({ error: 'Membership not found' });
        return;
      }

      // Prevent removing the last admin at the gym
      if (role === 'admin') {
        const { count, error: countError } = await supabase
          .from('gym_member_roles')
          .select('member_id, member:gym_members!inner(gym_id, status)', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('member.gym_id', gymId)
          .eq('member.status', 'active');
        if (countError) throw countError;

        if ((count ?? 0) <= 1) {
          res.status(400).json({ error: 'Cannot remove the last admin from a gym' });
          return;
        }
      }

      // Prevent leaving the membership with zero roles
      const { data: otherRoles, error: othersErr } = await supabase
        .from('gym_member_roles')
        .select('role')
        .eq('member_id', membership.id)
        .neq('role', role);
      if (othersErr) throw othersErr;

      if (!otherRoles || otherRoles.length === 0) {
        res.status(400).json({
          error: 'Cannot remove the last role — remove the member instead',
        });
        return;
      }

      const { data, error } = await supabase
        .from('gym_member_roles')
        .delete()
        .eq('member_id', membership.id)
        .eq('role', role)
        .select()
        .single();
      if (error) throw error;

      if (!data) {
        res.status(404).json({ error: 'Role not found for this member' });
        return;
      }

      res.json({ message: 'Role removed successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// Update member status and/or admin notes (admin only)
gymRoutes.put(
  '/gyms/:gymId/members/:memberId',
  requireAuth,
  requireGymRole('admin'),
  validate(updateMemberSchema),
  async (req, res, next) => {
    try {
      const patch: Record<string, any> = {};
      if (req.body.status !== undefined) patch.status = req.body.status;
      if (req.body.notes !== undefined) {
        const n = req.body.notes;
        patch.notes =
          typeof n === 'string' && n.trim() === '' ? null : n;
      }

      const { data, error } = await supabase
        .from('gym_members')
        .update(patch)
        .eq('id', req.params.memberId)
        .eq('gym_id', req.params.gymId)
        .select('id, user_id, status, notes, created_at, roles:gym_member_roles(role)')
        .single();
      if (error) throw error;

      res.json({
        ...data,
        notes: (data as any).notes ?? null,
        roles: ((data as any).roles || []).map((r: any) => r.role),
      });
    } catch (err) {
      next(err);
    }
  },
);

// Admin: update another member's profile fields (first_name, last_name, gender).
// Only the gym's admins can invoke; targets the `profiles` row for the member.
gymRoutes.put(
  '/gyms/:gymId/members/:userId/profile',
  requireAuth,
  requireGymRole('admin'),
  validate(adminUpdateMemberProfileSchema),
  async (req, res, next) => {
    try {
      const { gymId, userId } = req.params as { gymId: string; userId: string };

      // Verify the target is actually a member of this gym before editing
      // their profile — avoids admins of gym A editing profiles of users
      // who only belong to gym B.
      const { data: membership, error: memErr } = await supabase
        .from('gym_members')
        .select('id')
        .eq('gym_id', gymId)
        .eq('user_id', userId)
        .maybeSingle();
      if (memErr) throw memErr;
      if (!membership) {
        res.status(404).json({ error: 'Member not found at this gym' });
        return;
      }

      // Normalize empty strings to null for contact fields.
      const patch: Record<string, any> = { ...req.body };
      for (const key of ['email', 'phone'] as const) {
        if (typeof patch[key] === 'string' && patch[key].trim() === '') {
          patch[key] = null;
        }
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;

      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Join a gym with a plan (current user)
gymRoutes.post('/gyms/:gymId/join', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { plan_id } = req.body;
    const gymId = req.params.gymId as string;

    const memberId = await ensureMembership(gymId, user.id);

    // Grant 'member' role (idempotent)
    const { error: roleError } = await supabase
      .from('gym_member_roles')
      .insert({ member_id: memberId, role: 'member' });
    if (roleError && roleError.code !== '23505') throw roleError;

    // Create subscription if plan selected
    if (plan_id) {
      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      const now = new Date();
      let periodEnd: string | null = null;
      if (plan?.type === 'monthly') {
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
      } else if (plan?.type === 'annual') {
        periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
      }

      const { error: subError } = await supabase.from('subscriptions').insert({
        gym_id: gymId,
        user_id: user.id,
        plan_id,
        period_start: now.toISOString(),
        period_end: periodEnd,
      });
      if (subError) throw subError;
    }

    res.status(201).json({ message: 'Joined gym successfully' });
  } catch (err) {
    next(err);
  }
});

// Assign a plan (subscription) to a member (admin only)
gymRoutes.post(
  '/gyms/:gymId/members/:userId/subscriptions',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { gymId, userId } = req.params as { gymId: string; userId: string };
      const { plan_id } = req.body as { plan_id?: string };
      if (!plan_id) {
        res.status(400).json({ error: 'plan_id is required' });
        return;
      }

      // Make sure the membership exists (auto-creates + grants no roles beyond existing)
      await ensureMembership(gymId, userId);

      const { data: plan, error: planErr } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .eq('gym_id', gymId)
        .single();
      if (planErr || !plan) {
        res.status(404).json({ error: 'Plan not found for this gym' });
        return;
      }

      const now = new Date();
      let periodEnd: string | null = null;
      if (plan.type === 'monthly') {
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
      } else if (plan.type === 'annual') {
        periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          gym_id: gymId,
          user_id: userId,
          plan_id,
          status: 'active',
          period_start: now.toISOString(),
          period_end: periodEnd,
        })
        .select('id, status, period_end, plan:plans(id, name, price_cents, type, class_count)')
        .single();
      if (error) throw error;

      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Cancel a member subscription (admin only)
gymRoutes.delete(
  '/gyms/:gymId/members/:userId/subscriptions/:subId',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { gymId, userId, subId } = req.params as {
        gymId: string;
        userId: string;
        subId: string;
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subId)
        .eq('gym_id', gymId)
        .eq('user_id', userId)
        .select('id, status, period_end, plan:plans(id, name, price_cents, type, class_count)')
        .single();
      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);
