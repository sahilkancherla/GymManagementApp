import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
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

// Get all workouts in a program with the current user's stats pre-joined
workoutRoutes.get('/programs/:programId/my-history', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    // Fetch all workouts for this program, ordered by date descending
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('id, title, description, format, date, sort_order')
      .eq('program_id', req.params.programId)
      .order('date', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!workouts || workouts.length === 0) {
      res.json([]);
      return;
    }

    // Batch-fetch user's stats for all these workouts
    const workoutIds = workouts.map((w) => w.id);
    const { data: stats, error: statsError } = await supabase
      .from('workout_stats')
      .select('workout_id, time_seconds, amrap_rounds, amrap_reps, notes, rx_scaled')
      .eq('user_id', user.id)
      .in('workout_id', workoutIds);

    if (statsError) throw statsError;

    const statsByWorkout = new Map<string, any>();
    for (const stat of stats || []) {
      statsByWorkout.set(stat.workout_id, stat);
    }

    // Only return workouts where the user has logged a result
    const history = workouts
      .filter((w) => statsByWorkout.has(w.id))
      .map((w) => ({
        ...w,
        my_stat: statsByWorkout.get(w.id),
      }));

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// Get the current user's class signups for classes in a program
workoutRoutes.get('/programs/:programId/my-signups', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const programId = req.params.programId;

    // Get classes belonging to this program
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('program_id', programId);

    if (classError) throw classError;
    if (!classes || classes.length === 0) {
      res.json([]);
      return;
    }

    const classIds = classes.map((c) => c.id);
    const classMap = new Map(classes.map((c) => [c.id, c]));

    // Get occurrences for those classes where user has a signup
    const { data: signups, error: signupError } = await supabase
      .from('class_signups')
      .select(`
        id, checked_in, checked_in_at,
        occurrence:class_occurrences(
          id, date, start_time, is_cancelled, class_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (signupError) throw signupError;

    // Filter to only signups for classes in this program and enrich with class name
    const result = (signups || [])
      .filter((s: any) => s.occurrence && classIds.includes(s.occurrence.class_id))
      .map((s: any) => ({
        ...s,
        class_name: classMap.get(s.occurrence.class_id)?.name || 'Class',
      }));

    res.json(result);
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
