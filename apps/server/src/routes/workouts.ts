import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWorkoutSchema, updateWorkoutSchema } from '@acuo/shared';
import { supabase } from '../supabase';

export const workoutRoutes = Router();

// Return workouts with their class_ids array (empty array = applies to all).
function attachClassIds(rows: any[], links: { workout_id: string; class_id: string }[]) {
  const byWorkout = new Map<string, string[]>();
  for (const link of links || []) {
    const list = byWorkout.get(link.workout_id) || [];
    list.push(link.class_id);
    byWorkout.set(link.workout_id, list);
  }
  return rows.map((row) => ({ ...row, class_ids: byWorkout.get(row.id) || [] }));
}

// List workouts for a program (optionally filtered by date range)
workoutRoutes.get('/programs/:programId/workouts', requireAuth, async (req, res, next) => {
  try {
    let query = supabase
      .from('workouts')
      .select('*')
      .eq('program_id', req.params.programId)
      .order('date')
      .order('sort_order');

    const { start, end } = req.query;
    if (start) query = query.gte('date', start as string);
    if (end) query = query.lte('date', end as string);

    const { data, error } = await query;
    if (error) throw error;

    const workouts = data || [];
    if (workouts.length === 0) {
      res.json([]);
      return;
    }

    const workoutIds = workouts.map((w) => w.id);
    const { data: links, error: linksError } = await supabase
      .from('workout_classes')
      .select('workout_id, class_id')
      .in('workout_id', workoutIds);
    if (linksError) throw linksError;

    res.json(attachClassIds(workouts, links || []));
  } catch (err) {
    next(err);
  }
});

async function replaceWorkoutClasses(workoutId: string, classIds: string[]) {
  const { error: delError } = await supabase
    .from('workout_classes')
    .delete()
    .eq('workout_id', workoutId);
  if (delError) throw delError;

  if (classIds.length === 0) return;

  const rows = classIds.map((classId) => ({ workout_id: workoutId, class_id: classId }));
  const { error: insError } = await supabase.from('workout_classes').insert(rows);
  if (insError) throw insError;
}

// Create workout (admin only — caller must verify admin role)
workoutRoutes.post('/programs/:programId/workouts', requireAuth, validate(createWorkoutSchema), async (req, res, next) => {
  try {
    const { class_ids, ...workoutFields } = req.body;
    const { data, error } = await supabase
      .from('workouts')
      .insert({ ...workoutFields, program_id: req.params.programId })
      .select()
      .single();

    if (error) throw error;

    const classIds: string[] = Array.isArray(class_ids) ? class_ids : [];
    if (classIds.length > 0) {
      await replaceWorkoutClasses(data.id, classIds);
    }

    res.status(201).json({ ...data, class_ids: classIds });
  } catch (err) {
    next(err);
  }
});

// Update workout
workoutRoutes.put('/workouts/:workoutId', requireAuth, validate(updateWorkoutSchema), async (req, res, next) => {
  try {
    const workoutId = req.params.workoutId as string;
    const { class_ids, ...workoutFields } = req.body;
    const { data, error } = await supabase
      .from('workouts')
      .update({ ...workoutFields, updated_at: new Date().toISOString() })
      .eq('id', workoutId)
      .select()
      .single();

    if (error) throw error;

    let classIds: string[] | undefined;
    if (Array.isArray(class_ids)) {
      classIds = class_ids;
      await replaceWorkoutClasses(workoutId, class_ids);
    } else {
      const { data: links, error: linksError } = await supabase
        .from('workout_classes')
        .select('class_id')
        .eq('workout_id', workoutId);
      if (linksError) throw linksError;
      classIds = (links || []).map((l: any) => l.class_id);
    }

    res.json({ ...data, class_ids: classIds });
  } catch (err) {
    next(err);
  }
});

// Delete workout
workoutRoutes.delete('/workouts/:workoutId', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', req.params.workoutId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
