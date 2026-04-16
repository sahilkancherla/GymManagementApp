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

export const programRoutes = Router();

// List programs for a gym
programRoutes.get('/gyms/:gymId/programs', requireAuth, requireGymMember(), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*, program_enrollments(count)')
      .eq('gym_id', req.params.gymId)
      .order('name');

    if (error) throw error;

    const shaped = (data || []).map((p: any) => ({
      ...p,
      enrollment_count: p.program_enrollments?.[0]?.count ?? 0,
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
    const { data, error } = await supabase
      .from('program_enrollments')
      .insert({ program_id: req.params.programId, user_id: user.id, status: 'active' })
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
