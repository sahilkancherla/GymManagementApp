import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireGymRole, requireGymMember } from '../middleware/roles';
import { validate } from '../middleware/validate';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '@acuo/shared';
import { supabase } from '../supabase';

export const announcementRoutes = Router();

async function attachAuthors(rows: any[]) {
  if (!rows.length) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.author_id).filter(Boolean)));
  if (!ids.length) return rows.map((r) => ({ ...r, author: null }));
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: byId.get(r.author_id) || null }));
}

// Determine which announcements the requesting user is allowed to see.
// Admins see everything; members see gym-wide announcements plus those
// targeted to programs they're enrolled in or plans they actively subscribe to.
async function filterByVisibility(
  rows: any[],
  gymId: string,
  userId: string,
): Promise<any[]> {
  if (!rows.length) return rows;

  // Gather targeting ids referenced by these rows so we only fetch what we need.
  const programIds = new Set<string>();
  const planIds = new Set<string>();
  for (const r of rows) {
    if (r.program_id) programIds.add(r.program_id);
    if (r.plan_id) planIds.add(r.plan_id);
  }

  // Look up the user's admin status, program enrollments, and active plans
  // in parallel — short-circuit when there's nothing targeted to filter.
  const [memberRes, enrollmentsRes, subsRes] = await Promise.all([
    supabase
      .from('gym_members')
      .select('id, roles:gym_member_roles(role)')
      .eq('gym_id', gymId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    programIds.size > 0
      ? supabase
          .from('program_enrollments')
          .select('program_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .in('program_id', Array.from(programIds))
      : Promise.resolve({ data: [], error: null }),
    planIds.size > 0
      ? supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', userId)
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .in('plan_id', Array.from(planIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const roles: string[] =
    (memberRes.data?.roles as any[] | null)?.map((r) => r.role) ?? [];
  if (roles.includes('admin')) return rows;

  const enrolledPrograms = new Set(
    (enrollmentsRes.data || []).map((e: any) => e.program_id),
  );
  const subscribedPlans = new Set(
    (subsRes.data || []).map((s: any) => s.plan_id),
  );

  return rows.filter((r) => {
    if (!r.program_id && !r.plan_id) return true;
    if (r.program_id) return enrolledPrograms.has(r.program_id);
    if (r.plan_id) return subscribedPlans.has(r.plan_id);
    return false;
  });
}

// List announcements for a gym (any active member; visibility further
// filtered by program/plan targeting).
announcementRoutes.get(
  '/gyms/:gymId/announcements',
  requireAuth,
  requireGymMember(),
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('gym_id', req.params.gymId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      const visible = await filterByVisibility(
        data || [],
        req.params.gymId as string,
        user.id,
      );
      res.json(await attachAuthors(visible));
    } catch (err) {
      next(err);
    }
  },
);

// Create announcement (admin only)
announcementRoutes.post(
  '/gyms/:gymId/announcements',
  requireAuth,
  requireGymRole('admin'),
  validate(createAnnouncementSchema),
  async (req: any, res, next) => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          gym_id: req.params.gymId,
          author_id: req.user.id,
          title: req.body.title,
          body: req.body.body,
          pinned: req.body.pinned ?? false,
          program_id: req.body.program_id ?? null,
          plan_id: req.body.plan_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const [withAuthor] = await attachAuthors([data]);
      res.status(201).json(withAuthor);
    } catch (err) {
      next(err);
    }
  },
);

// Update announcement (admin only)
announcementRoutes.put(
  '/gyms/:gymId/announcements/:id',
  requireAuth,
  requireGymRole('admin'),
  validate(updateAnnouncementSchema),
  async (req, res, next) => {
    try {
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (typeof req.body.title === 'string') patch.title = req.body.title;
      if (typeof req.body.body === 'string') patch.body = req.body.body;
      if (typeof req.body.pinned === 'boolean') patch.pinned = req.body.pinned;
      if ('program_id' in req.body) patch.program_id = req.body.program_id;
      if ('plan_id' in req.body) patch.plan_id = req.body.plan_id;

      const { data, error } = await supabase
        .from('announcements')
        .update(patch)
        .eq('id', req.params.id)
        .eq('gym_id', req.params.gymId)
        .select()
        .single();
      if (error) throw error;
      const [withAuthor] = await attachAuthors([data]);
      res.json(withAuthor);
    } catch (err) {
      next(err);
    }
  },
);

// Delete announcement (admin only)
announcementRoutes.delete(
  '/gyms/:gymId/announcements/:id',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', req.params.id)
        .eq('gym_id', req.params.gymId);
      if (error) throw error;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
