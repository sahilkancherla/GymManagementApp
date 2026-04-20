import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireGymRole } from '../middleware/roles';
import { supabase } from '../supabase';
import { AppError } from '../middleware/errors';

export const classOccurrenceRoutes = Router();

const OCCURRENCE_WITH_SIGNUPS_SELECT = `
  *,
  class:classes(id, name, gym_id, capacity, duration_minutes, program_id),
  coach:profiles(id, first_name, last_name),
  signups:class_signups(
    id,
    user_id,
    checked_in,
    checked_in_at,
    profile:profiles!class_signups_user_id_fkey(id, first_name, last_name)
  )
`;

// Find or create the single occurrence for a class on a given date.
// Returns the occurrence with signups expanded.
classOccurrenceRoutes.post('/classes/:classId/occurrences', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const classId = req.params.classId as string;
    const date = req.body?.date;
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, 'date (YYYY-MM-DD) is required');
    }

    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('id, gym_id, start_time, coach_id')
      .eq('id', classId)
      .single();
    if (clsError || !cls) throw new AppError(404, 'Class not found');

    const { data: mem } = await supabase
      .from('gym_members')
      .select('id')
      .eq('gym_id', cls.gym_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!mem) throw new AppError(403, 'Not a member of this gym');

    const { data: existing } = await supabase
      .from('class_occurrences')
      .select(OCCURRENCE_WITH_SIGNUPS_SELECT)
      .eq('class_id', classId)
      .eq('date', date)
      .maybeSingle();
    if (existing) {
      res.json(existing);
      return;
    }

    const { error: insertError } = await supabase
      .from('class_occurrences')
      .insert({
        class_id: classId,
        date,
        start_time: cls.start_time,
        coach_id: cls.coach_id,
      });
    // 23505 = unique violation: another request created it concurrently — fall through to refetch
    if (insertError && (insertError as any).code !== '23505') throw insertError;

    const { data: created, error: refetchError } = await supabase
      .from('class_occurrences')
      .select(OCCURRENCE_WITH_SIGNUPS_SELECT)
      .eq('class_id', classId)
      .eq('date', date)
      .single();
    if (refetchError) throw refetchError;
    res.status(insertError ? 200 : 201).json(created);
  } catch (err) {
    next(err);
  }
});

// List occurrences for a gym in a date range
classOccurrenceRoutes.get('/gyms/:gymId/occurrences', requireAuth, async (req, res, next) => {
  try {
    const { start, end } = req.query;

    let query = supabase
      .from('class_occurrences')
      .select(`
        *,
        class:classes(id, name, gym_id, capacity, duration_minutes, program_id),
        coach:profiles(id, first_name, last_name),
        signups:class_signups(id, user_id, checked_in, profile:profiles!class_signups_user_id_fkey(id, first_name, last_name))
      `)
      .eq('class.gym_id', req.params.gymId)
      .order('date')
      .order('start_time');

    if (start) query = query.gte('date', start as string);
    if (end) query = query.lte('date', end as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Generate occurrences from class schedule data (admin only)
classOccurrenceRoutes.post('/gyms/:gymId/generate-occurrences', requireAuth, requireGymRole('admin'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body;
    const gymId = req.params.gymId;

    // Get all classes for this gym with their schedule info
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, coach_id, start_time, days_of_week, one_off_date')
      .eq('gym_id', gymId);

    if (classError) throw classError;

    const occurrences: Array<{
      class_id: string;
      date: string;
      start_time: string;
      coach_id: string | null;
    }> = [];

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    for (const cls of classes || []) {
      // One-off class: single occurrence on the specified date
      if (cls.one_off_date) {
        const offDate = new Date(cls.one_off_date);
        if (offDate >= startDate && offDate <= endDate) {
          occurrences.push({
            class_id: cls.id,
            date: cls.one_off_date,
            start_time: cls.start_time,
            coach_id: cls.coach_id,
          });
        }
        continue;
      }

      // Recurring class: generate for each matching day_of_week in range
      const daysOfWeek: number[] = cls.days_of_week || [];
      if (daysOfWeek.length === 0) continue;

      const current = new Date(startDate);
      while (current <= endDate) {
        if (daysOfWeek.includes(current.getDay())) {
          occurrences.push({
            class_id: cls.id,
            date: current.toISOString().split('T')[0],
            start_time: cls.start_time,
            coach_id: cls.coach_id,
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (occurrences.length > 0) {
      const { data, error } = await supabase
        .from('class_occurrences')
        .upsert(occurrences, { onConflict: 'class_id,date,start_time' })
        .select();

      if (error) throw error;
      res.status(201).json(data);
    } else {
      res.json([]);
    }
  } catch (err) {
    next(err);
  }
});

// Update occurrence (override coach, cancel). Admin/coach only at the gym
// owning the class.
classOccurrenceRoutes.put('/occurrences/:occurrenceId', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { coach_id, is_cancelled, start_time } = req.body;
    const update: Record<string, any> = {};
    if (coach_id !== undefined) update.coach_id = coach_id;
    if (is_cancelled !== undefined) update.is_cancelled = is_cancelled;
    if (start_time !== undefined) {
      if (
        start_time !== null &&
        (typeof start_time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time))
      ) {
        throw new AppError(400, 'start_time must be HH:MM or HH:MM:SS');
      }
      update.start_time = start_time;
    }

    const { data: occ, error: occError } = await supabase
      .from('class_occurrences')
      .select('id, class:classes(gym_id)')
      .eq('id', req.params.occurrenceId)
      .single();
    if (occError || !occ) throw new AppError(404, 'Occurrence not found');
    const gymId = (occ as any).class?.gym_id;
    if (!gymId) throw new AppError(500, 'Occurrence missing gym');

    const { data: memberData } = await supabase
      .from('gym_members')
      .select('roles:gym_member_roles(role)')
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    const roles = (((memberData as any)?.roles as any[]) || []).map((r) => r.role);
    if (!roles.some((r) => r === 'admin' || r === 'coach')) {
      throw new AppError(403, 'Only admins and coaches can modify an occurrence');
    }

    const { data, error } = await supabase
      .from('class_occurrences')
      .update(update)
      .eq('id', req.params.occurrenceId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
