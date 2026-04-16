import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireGymRole, requireGymMember } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createClassSchema, updateClassSchema } from '@acuo/shared';
import { supabase } from '../supabase';

export const classRoutes = Router();

// Replace the set of plans linked to a class. Empty array = no restriction.
async function replaceClassPlans(classId: string, planIds: string[]) {
  const { error: delError } = await supabase
    .from('class_plans')
    .delete()
    .eq('class_id', classId);
  if (delError) throw delError;

  if (planIds.length === 0) return;

  const rows = planIds.map((planId) => ({ class_id: classId, plan_id: planId }));
  const { error: insError } = await supabase.from('class_plans').insert(rows);
  if (insError) throw insError;
}

// Attach plan_ids array to each row in `rows` based on `links`.
function attachPlanIds(rows: any[], links: { class_id: string; plan_id: string }[]) {
  const byClass = new Map<string, string[]>();
  for (const link of links || []) {
    const list = byClass.get(link.class_id) || [];
    list.push(link.plan_id);
    byClass.set(link.class_id, list);
  }
  return rows.map((row) => ({ ...row, plan_ids: byClass.get(row.id) || [] }));
}

async function attachPlanIdsToClasses<T extends { id: string }>(rows: T[]): Promise<(T & { plan_ids: string[] })[]> {
  if (rows.length === 0) return rows as any;
  const classIds = rows.map((r) => r.id);
  const { data: links, error } = await supabase
    .from('class_plans')
    .select('class_id, plan_id')
    .in('class_id', classIds);
  if (error) throw error;
  return attachPlanIds(rows as any[], links || []) as any;
}

// List classes for a gym (all programs)
classRoutes.get('/gyms/:gymId/classes', requireAuth, requireGymMember(), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*, coach:profiles(id, first_name, last_name), program:programs(id, name)')
      .eq('gym_id', req.params.gymId)
      .order('name');

    if (error) throw error;
    res.json(await attachPlanIdsToClasses(data || []));
  } catch (err) {
    next(err);
  }
});

// List classes for a specific program
classRoutes.get('/programs/:programId/classes', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*, coach:profiles(id, first_name, last_name)')
      .eq('program_id', req.params.programId)
      .order('name');

    if (error) throw error;
    res.json(await attachPlanIdsToClasses(data || []));
  } catch (err) {
    next(err);
  }
});

// Create class under a program (admin only)
classRoutes.post('/gyms/:gymId/programs/:programId/classes', requireAuth, requireGymRole('admin'), validate(createClassSchema), async (req, res, next) => {
  try {
    const { plan_ids, ...classFields } = req.body;
    const { data, error } = await supabase
      .from('classes')
      .insert({
        ...classFields,
        gym_id: req.params.gymId,
        program_id: req.params.programId,
      })
      .select('*, coach:profiles(id, first_name, last_name)')
      .single();

    if (error) throw error;

    const planIds: string[] = Array.isArray(plan_ids) ? plan_ids : [];
    if (planIds.length > 0) {
      await replaceClassPlans(data.id, planIds);
    }

    res.status(201).json({ ...data, plan_ids: planIds });
  } catch (err) {
    next(err);
  }
});

// Create class at gym level (legacy, admin only)
classRoutes.post('/gyms/:gymId/classes', requireAuth, requireGymRole('admin'), validate(createClassSchema), async (req, res, next) => {
  try {
    const { plan_ids, ...classFields } = req.body;
    const { data, error } = await supabase
      .from('classes')
      .insert({ ...classFields, gym_id: req.params.gymId })
      .select()
      .single();

    if (error) throw error;

    const planIds: string[] = Array.isArray(plan_ids) ? plan_ids : [];
    if (planIds.length > 0) {
      await replaceClassPlans(data.id, planIds);
    }

    res.status(201).json({ ...data, plan_ids: planIds });
  } catch (err) {
    next(err);
  }
});

// Update class (admin only)
classRoutes.put('/gyms/:gymId/classes/:classId', requireAuth, requireGymRole('admin'), validate(updateClassSchema), async (req, res, next) => {
  try {
    const classId = req.params.classId as string;
    const { plan_ids, ...classFields } = req.body;
    const { data, error } = await supabase
      .from('classes')
      .update({ ...classFields, updated_at: new Date().toISOString() })
      .eq('id', classId)
      .eq('gym_id', req.params.gymId)
      .select('*, coach:profiles(id, first_name, last_name)')
      .single();

    if (error) throw error;

    let planIds: string[] | undefined;
    if (Array.isArray(plan_ids)) {
      planIds = plan_ids;
      await replaceClassPlans(classId, plan_ids);
    } else {
      const { data: links, error: linksError } = await supabase
        .from('class_plans')
        .select('plan_id')
        .eq('class_id', classId);
      if (linksError) throw linksError;
      planIds = (links || []).map((l: any) => l.plan_id);
    }

    res.json({ ...data, plan_ids: planIds });
  } catch (err) {
    next(err);
  }
});

// Delete class (admin only)
classRoutes.delete('/gyms/:gymId/classes/:classId', requireAuth, requireGymRole('admin'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', req.params.classId)
      .eq('gym_id', req.params.gymId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
