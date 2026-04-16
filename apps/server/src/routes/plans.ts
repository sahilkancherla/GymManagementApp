import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireGymRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createPlanSchema, updatePlanSchema } from '@acuo/shared';
import { supabase } from '../supabase';

export const planRoutes = Router();

// Replace the set of programs a plan applies to. Empty array = applies to
// the gym at large (not tied to any program).
async function replacePlanPrograms(planId: string, programIds: string[]) {
  const { error: delError } = await supabase
    .from('plan_programs')
    .delete()
    .eq('plan_id', planId);
  if (delError) throw delError;

  if (programIds.length === 0) return;

  const rows = programIds.map((program_id) => ({ plan_id: planId, program_id }));
  const { error: insError } = await supabase.from('plan_programs').insert(rows);
  if (insError) throw insError;
}

function attachProgramIds(rows: any[], links: { plan_id: string; program_id: string }[]) {
  const byPlan = new Map<string, string[]>();
  for (const link of links || []) {
    const list = byPlan.get(link.plan_id) || [];
    list.push(link.program_id);
    byPlan.set(link.plan_id, list);
  }
  return rows.map((row) => ({ ...row, program_ids: byPlan.get(row.id) || [] }));
}

async function attachProgramIdsToPlans<T extends { id: string }>(
  rows: T[],
): Promise<(T & { program_ids: string[] })[]> {
  if (rows.length === 0) return rows as any;
  const planIds = rows.map((r) => r.id);
  const { data: links, error } = await supabase
    .from('plan_programs')
    .select('plan_id, program_id')
    .in('plan_id', planIds);
  if (error) throw error;
  return attachProgramIds(rows as any[], links || []) as any;
}

// List plans for a gym
planRoutes.get('/gyms/:gymId/plans', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('gym_id', req.params.gymId)
      .eq('is_active', true)
      .order('price_cents');

    if (error) throw error;
    const plans = await attachProgramIdsToPlans(data || []);

    // Attach active subscriber counts per plan in one round trip
    const planIds = plans.map((p: any) => p.id);
    const counts = new Map<string, number>();
    if (planIds.length > 0) {
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .in('plan_id', planIds)
        .eq('status', 'active');
      if (subErr) throw subErr;
      for (const s of subs || []) {
        const pid = (s as any).plan_id as string;
        counts.set(pid, (counts.get(pid) || 0) + 1);
      }
    }
    res.json(
      plans.map((p: any) => ({
        ...p,
        subscriber_count: counts.get(p.id) || 0,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// List plans that apply to a specific program (via plan_programs join)
planRoutes.get('/programs/:programId/plans', requireAuth, async (req, res, next) => {
  try {
    const programId = req.params.programId as string;

    const { data: linkRows, error: linkError } = await supabase
      .from('plan_programs')
      .select('plan_id')
      .eq('program_id', programId);
    if (linkError) throw linkError;

    const planIds = (linkRows || []).map((l: any) => l.plan_id);
    if (planIds.length === 0) {
      res.json([]);
      return;
    }

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .in('id', planIds)
      .eq('is_active', true)
      .order('price_cents');

    if (error) throw error;
    res.json(await attachProgramIdsToPlans(data || []));
  } catch (err) {
    next(err);
  }
});

// Create plan at gym level (admin only). Optionally applies to one or more programs.
planRoutes.post(
  '/gyms/:gymId/plans',
  requireAuth,
  requireGymRole('admin'),
  validate(createPlanSchema),
  async (req, res, next) => {
    try {
      const { program_ids, ...planFields } = req.body;
      const { data, error } = await supabase
        .from('plans')
        .insert({ ...planFields, gym_id: req.params.gymId })
        .select()
        .single();

      if (error) throw error;

      const programIds: string[] = Array.isArray(program_ids) ? program_ids : [];
      if (programIds.length > 0) {
        await replacePlanPrograms(data.id, programIds);
      }

      res.status(201).json({ ...data, program_ids: programIds });
    } catch (err) {
      next(err);
    }
  },
);

// Update plan (admin only)
planRoutes.put(
  '/gyms/:gymId/plans/:planId',
  requireAuth,
  requireGymRole('admin'),
  validate(updatePlanSchema),
  async (req, res, next) => {
    try {
      const planId = req.params.planId as string;
      const { program_ids, ...planFields } = req.body;

      const { data, error } = await supabase
        .from('plans')
        .update({ ...planFields, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .eq('gym_id', req.params.gymId)
        .select()
        .single();

      if (error) throw error;

      let programIds: string[] | undefined;
      if (Array.isArray(program_ids)) {
        programIds = program_ids;
        await replacePlanPrograms(planId, program_ids);
      } else {
        const { data: links, error: linksError } = await supabase
          .from('plan_programs')
          .select('program_id')
          .eq('plan_id', planId);
        if (linksError) throw linksError;
        programIds = (links || []).map((l: any) => l.program_id);
      }

      res.json({ ...data, program_ids: programIds });
    } catch (err) {
      next(err);
    }
  },
);

// List subscribers for a specific plan (admin only)
planRoutes.get(
  '/gyms/:gymId/plans/:planId/subscribers',
  requireAuth,
  requireGymRole('admin'),
  async (req, res, next) => {
    try {
      const { gymId, planId } = req.params;

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, period_start, period_end, classes_used, created_at, profile:profiles(*)')
        .eq('gym_id', gymId)
        .eq('plan_id', planId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(subs || []);
    } catch (err) {
      next(err);
    }
  },
);

// Deactivate plan (admin only)
planRoutes.delete('/gyms/:gymId/plans/:planId', requireAuth, requireGymRole('admin'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.planId)
      .eq('gym_id', req.params.gymId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
