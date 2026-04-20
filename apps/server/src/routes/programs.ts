import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireGymRole, requireGymMember } from '../middleware/roles';
import { validate } from '../middleware/validate';
import {
  createProgramSchema,
  updateProgramSchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
} from '@acuo/shared';
import { supabase } from '../supabase';
import { AppError } from '../middleware/errors';

export const programRoutes = Router();

/**
 * Check whether a user holds an active subscription that grants access to a
 * specific program. Returns true when:
 *   - the program has linked plans (via plan_programs) AND the user has an
 *     active subscription to one of them, OR
 *   - the program has linked plans AND the user has an active subscription to
 *     a gym-wide plan (one with no program links at all), OR
 *   - the program has NO linked plans (open to any member).
 */
async function userCanAccessProgram(
  userId: string,
  gymId: string,
  programId: string,
): Promise<boolean> {
  const { data: planLinks, error: plError } = await supabase
    .from('plan_programs')
    .select('plan_id')
    .eq('program_id', programId);
  if (plError) throw plError;

  // No plan restrictions on this program — open to any member
  if (!planLinks || planLinks.length === 0) return true;

  const allowedPlanIds = new Set(planLinks.map((l: any) => l.plan_id));

  // Get all user's active subscriptions at this gym
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .eq('status', 'active');
  if (subsError) throw subsError;
  if (!subs || subs.length === 0) return false;

  const userPlanIds = subs.map((s: any) => s.plan_id);

  // Direct match: user has a subscription to a plan linked to this program
  if (userPlanIds.some((pid: string) => allowedPlanIds.has(pid))) return true;

  // Gym-wide plan: user has a subscription to a plan with NO program links
  const { data: allLinks, error: allError } = await supabase
    .from('plan_programs')
    .select('plan_id')
    .in('plan_id', userPlanIds);
  if (allError) throw allError;

  const plansWithLinks = new Set((allLinks || []).map((l: any) => l.plan_id));
  return userPlanIds.some((pid: string) => !plansWithLinks.has(pid));
}

// List programs for a gym
programRoutes.get('/gyms/:gymId/programs', requireAuth, requireGymMember(), async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const gymId = req.params.gymId as string;

    const { data, error } = await supabase
      .from('programs')
      .select('*, program_enrollments(count)')
      .eq('gym_id', gymId)
      .order('name');

    if (error) throw error;

    // Fetch current user's active enrollments for this gym's programs
    const programIds = (data || []).map((p: any) => p.id);
    let enrolledSet = new Set<string>();
    if (programIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('program_enrollments')
        .select('program_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .in('program_id', programIds);
      enrolledSet = new Set((enrollments || []).map((e: any) => e.program_id));
    }

    // Check eligibility for each program
    const eligibilityChecks = await Promise.all(
      (data || []).map((p: any) => userCanAccessProgram(userId, gymId, p.id)),
    );

    const shaped = (data || []).map((p: any, i: number) => ({
      ...p,
      enrollment_count: p.program_enrollments?.[0]?.count ?? 0,
      user_enrolled: enrolledSet.has(p.id),
      user_eligible: eligibilityChecks[i],
      program_enrollments: undefined,
    }));

    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

// Create program (admin only)
programRoutes.post('/gyms/:gymId/programs', requireAuth, requireGymRole('admin'), validate(createProgramSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .insert({ ...req.body, gym_id: req.params.gymId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Update program (admin only)
programRoutes.put('/gyms/:gymId/programs/:programId', requireAuth, requireGymRole('admin'), validate(updateProgramSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.programId)
      .eq('gym_id', req.params.gymId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Delete program (admin only)
programRoutes.delete('/gyms/:gymId/programs/:programId', requireAuth, requireGymRole('admin'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', req.params.programId)
      .eq('gym_id', req.params.gymId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Enroll in program (self)
programRoutes.post('/gyms/:gymId/programs/:programId/enroll', requireAuth, requireGymMember(), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const gymId = req.params.gymId as string;
    const programId = req.params.programId as string;

    // Plan-based access control: check user holds a qualifying subscription
    const eligible = await userCanAccessProgram(user.id, gymId, programId);
    if (!eligible) {
      throw new AppError(403, 'You do not hold an active membership that includes this program');
    }

    const { data, error } = await supabase
      .from('program_enrollments')
      .insert({ program_id: programId, user_id: user.id, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Leave program (self)
programRoutes.delete('/gyms/:gymId/programs/:programId/enroll', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { error } = await supabase
      .from('program_enrollments')
      .delete()
      .eq('program_id', req.params.programId)
      .eq('user_id', user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// List all program enrollments for a member at a gym (admin only)
programRoutes.get(
  '/gyms/:gymId/members/:userId/program-enrollments',
  requireAuth,
  requireGymRole('admin', 'coach'),
  async (req, res, next) => {
    try {
      const { gymId, userId } = req.params;

      // Pull this gym's programs and the user's enrollments separately,
      // then merge so the admin sees one row per program with enrolled state.
      const [programsRes, enrollmentsRes] = await Promise.all([
        supabase
          .from('programs')
          .select('id, name, description, start_date, end_date')
          .eq('gym_id', gymId)
          .order('name'),
        supabase
          .from('program_enrollments')
          .select('id, program_id, status, created_at, program:programs!inner(id, gym_id)')
          .eq('user_id', userId)
          .eq('program.gym_id', gymId),
      ]);
      if (programsRes.error) throw programsRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const byProgram = new Map<string, any>();
      for (const e of enrollmentsRes.data || []) {
        byProgram.set(e.program_id, e);
      }

      const out = (programsRes.data || []).map((p) => {
        const e = byProgram.get(p.id);
        return {
          program: p,
          enrollment: e
            ? { id: e.id, status: e.status, created_at: e.created_at }
            : null,
        };
      });
      res.json(out);
    } catch (err) {
      next(err);
    }
  },
);

// List all enrollees in a program (admin only). Returns one row per user
// with profile info and their subscriptions that apply to this program.
programRoutes.get(
  '/gyms/:gymId/programs/:programId/enrollments',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { gymId, programId } = req.params as {
        gymId: string;
        programId: string;
      };

      const { data: enrollments, error } = await supabase
        .from('program_enrollments')
        .select('id, user_id, status, created_at, profile:profiles(*)')
        .eq('program_id', programId);
      if (error) throw error;

      const userIds = (enrollments || []).map((e: any) => e.user_id);

      // Collect active subscriptions that apply to this program (either via
      // plan_programs join, or gym-wide plans with no program filter).
      const subsByUser = new Map<string, any[]>();
      if (userIds.length > 0) {
        const [planLinksRes, subsRes] = await Promise.all([
          supabase
            .from('plan_programs')
            .select('plan_id')
            .eq('program_id', programId),
          supabase
            .from('subscriptions')
            .select(
              'id, user_id, status, period_end, plan:plans(id, name, price_cents, type, class_count)',
            )
            .eq('gym_id', gymId)
            .in('user_id', userIds)
            .eq('status', 'active'),
        ]);
        if (planLinksRes.error) throw planLinksRes.error;
        if (subsRes.error) throw subsRes.error;

        const planIdsForProgram = new Set(
          (planLinksRes.data || []).map((l: any) => l.plan_id),
        );

        // A subscription counts toward this program if the plan is linked to
        // it, OR if the plan has no program links at all (gym-wide).
        const linkedPlanIds = new Set<string>();
        {
          const { data: allLinks } = await supabase
            .from('plan_programs')
            .select('plan_id');
          for (const l of allLinks || []) linkedPlanIds.add((l as any).plan_id);
        }

        for (const s of subsRes.data || []) {
          const plan = (s as any).plan;
          if (!plan) continue;
          const linkedToThisProgram = planIdsForProgram.has(plan.id);
          const gymWide = !linkedPlanIds.has(plan.id);
          if (!linkedToThisProgram && !gymWide) continue;
          const uid = (s as any).user_id as string;
          const list = subsByUser.get(uid) || [];
          list.push({
            id: (s as any).id,
            status: (s as any).status,
            period_end: (s as any).period_end,
            plan,
          });
          subsByUser.set(uid, list);
        }
      }

      const shaped = (enrollments || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        status: e.status,
        created_at: e.created_at,
        profile: e.profile,
        subscriptions: subsByUser.get(e.user_id) || [],
      }));

      res.json(shaped);
    } catch (err) {
      next(err);
    }
  },
);

// Enroll a user in a program (admin only)
programRoutes.post(
  '/gyms/:gymId/programs/:programId/enrollments',
  requireAuth,
  requireGymRole('admin'),
  validate(createEnrollmentSchema),
  async (req, res, next) => {
    try {
      const { user_id, status } = req.body;
      const { data, error } = await supabase
        .from('program_enrollments')
        .insert({
          program_id: req.params.programId,
          user_id,
          status: status || 'active',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ error: 'User is already enrolled in this program' });
          return;
        }
        throw error;
      }
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Update a user's enrollment status in a program (admin only)
programRoutes.put(
  '/gyms/:gymId/programs/:programId/enrollments/:userId',
  requireAuth,
  requireGymRole('admin'),
  validate(updateEnrollmentSchema),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const { data, error } = await supabase
        .from('program_enrollments')
        .update({ status })
        .eq('program_id', req.params.programId)
        .eq('user_id', req.params.userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Remove a user's enrollment from a program (admin only)
programRoutes.delete(
  '/gyms/:gymId/programs/:programId/enrollments/:userId',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('program_enrollments')
        .delete()
        .eq('program_id', req.params.programId)
        .eq('user_id', req.params.userId);

      if (error) throw error;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
