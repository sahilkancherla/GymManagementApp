import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logWorkoutStatSchema } from '@acuo/shared';
import { supabase } from '../supabase';
import { AppError } from '../middleware/errors';

export const workoutStatRoutes = Router();

async function getRolesAtGym(userId: string, gymId: string): Promise<string[]> {
  const { data } = await supabase
    .from('gym_members')
    .select('roles:gym_member_roles(role)')
    .eq('gym_id', gymId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return ((data?.roles as any[] | null) || []).map((r) => r.role);
}

async function getWorkoutGymId(workoutId: string): Promise<string | null> {
  const { data } = await supabase
    .from('workouts')
    .select('program:programs(gym_id)')
    .eq('id', workoutId)
    .single();
  return (data as any)?.program?.gym_id ?? null;
}

// Returns a comparator sorting stats by format:
//   time:  ascending by time_seconds (lower is better)
//   amrap: descending by rounds, then reps (higher is better)
// Rows missing a result are pushed to the bottom.
function formatComparator(format: string) {
  return (a: any, b: any) => {
    if (format === 'time') {
      const av = a.time_seconds;
      const bv = b.time_seconds;
      const aMissing = av == null;
      const bMissing = bv == null;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return av - bv;
    }
    if (format === 'amrap') {
      const ar = a.amrap_rounds;
      const br = b.amrap_rounds;
      const aMissing = ar == null;
      const bMissing = br == null;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (br !== ar) return (br as number) - (ar as number);
      return (b.amrap_reps ?? 0) - (a.amrap_reps ?? 0);
    }
    return 0;
  };
}

// True when a stat row has a result for the given format.
function hasResult(row: any, format: string): boolean {
  if (format === 'time') return row.time_seconds != null;
  if (format === 'amrap') return row.amrap_rounds != null;
  return false;
}

// Get stats for a workout. Admins/coaches see all stats for the workout; members
// see only their own.
workoutStatRoutes.get('/workouts/:workoutId/stats', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const workoutId = req.params.workoutId as string;

    const gymId = await getWorkoutGymId(workoutId);
    const roles = gymId ? await getRolesAtGym(user.id, gymId) : [];
    const canSeeAll = roles.some((r) => r === 'admin' || r === 'coach');

    let query = supabase
      .from('workout_stats')
      .select('*, profile:profiles(first_name, last_name)')
      .eq('workout_id', workoutId);

    if (!canSeeAll) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Log (upsert) workout stats. Admins/coaches may pass `user_id` to record a
// result on behalf of another member.
workoutStatRoutes.post('/workouts/:workoutId/stats', requireAuth, validate(logWorkoutStatSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const workoutId = req.params.workoutId as string;
    const { user_id: bodyUserId, ...stats } = req.body as {
      user_id?: string;
      time_seconds?: number | null;
      amrap_rounds?: number | null;
      amrap_reps?: number | null;
      notes?: string | null;
    };

    const targetUserId = bodyUserId && bodyUserId.length > 0 ? bodyUserId : user.id;

    if (targetUserId !== user.id) {
      const gymId = await getWorkoutGymId(workoutId);
      if (!gymId) throw new AppError(404, 'Workout not found');
      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can log results for other users');
      }
    }

    const { data, error } = await supabase
      .from('workout_stats')
      .upsert(
        {
          workout_id: workoutId,
          user_id: targetUserId,
          ...stats,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'workout_id,user_id' },
      )
      .select('*, profile:profiles(first_name, last_name)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Get a member's full workout history within a gym, with stats joined to each
// workout. Admin/coach only. Returns rows sorted by workout date descending.
// Each row is augmented with rank fields comparing the member to all other
// users who logged that workout:
//   overall_rank / overall_total — ranking across everyone with a result
//   gender_rank / gender_total  — ranking within the same gender cohort
//   user_gender                 — the target user's gender (for UI context)
workoutStatRoutes.get(
  '/gyms/:gymId/members/:userId/workout-stats',
  requireAuth,
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const gymId = req.params.gymId as string;
      const userId = req.params.userId as string;

      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can view member history');
      }

      const { data, error } = await supabase
        .from('workout_stats')
        .select(
          '*, workout:workouts(id, title, description, format, date, program:programs(id, name, gym_id))',
        )
        .eq('user_id', userId);
      if (error) throw error;

      const rows = (data || []).filter(
        (r: any) => r.workout?.program?.gym_id === gymId,
      );
      rows.sort((a: any, b: any) => {
        const ad = a.workout?.date || '';
        const bd = b.workout?.date || '';
        return bd.localeCompare(ad);
      });

      // Fetch the target user's gender once for gender-cohort ranking.
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', userId)
        .maybeSingle();
      const userGender = (userProfile as any)?.gender ?? null;

      const workoutIds = Array.from(
        new Set(rows.map((r: any) => r.workout?.id).filter(Boolean)),
      );

      let allStatsByWorkout: Record<string, any[]> = {};
      if (workoutIds.length > 0) {
        const { data: allStats, error: statsError } = await supabase
          .from('workout_stats')
          .select('workout_id, user_id, time_seconds, amrap_rounds, amrap_reps, profile:profiles(gender)')
          .in('workout_id', workoutIds);
        if (statsError) throw statsError;
        for (const s of allStats || []) {
          const key = (s as any).workout_id as string;
          (allStatsByWorkout[key] = allStatsByWorkout[key] || []).push(s);
        }
      }

      const augmented = rows.map((r: any) => {
        const format = r.workout?.format as string;
        const cohort = allStatsByWorkout[r.workout_id] || [];
        const ranked = cohort
          .filter((s: any) => hasResult(s, format))
          .sort(formatComparator(format));
        const overallTotal = ranked.length;
        const overallIdx = ranked.findIndex((s: any) => s.user_id === userId);
        const overallRank = overallIdx >= 0 ? overallIdx + 1 : null;

        let genderRank: number | null = null;
        let genderTotal = 0;
        if (userGender) {
          const sameGender = ranked.filter(
            (s: any) => s.profile?.gender === userGender,
          );
          genderTotal = sameGender.length;
          const gIdx = sameGender.findIndex((s: any) => s.user_id === userId);
          genderRank = gIdx >= 0 ? gIdx + 1 : null;
        }

        return {
          ...r,
          overall_rank: overallRank,
          overall_total: overallTotal,
          gender_rank: genderRank,
          gender_total: genderTotal,
          user_gender: userGender,
        };
      });

      res.json(augmented);
    } catch (err) {
      next(err);
    }
  },
);

// Leaderboard for a single workout. Admin/coach only. Returns the workout
// details plus all stats sorted by the workout's format with overall and
// gender-cohort ranks pre-computed. Profiles are joined for display.
workoutStatRoutes.get(
  '/workouts/:workoutId/leaderboard',
  requireAuth,
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const workoutId = req.params.workoutId as string;

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(
          'id, title, description, format, date, program:programs(id, name, gym_id)',
        )
        .eq('id', workoutId)
        .single();
      if (workoutError || !workout) throw new AppError(404, 'Workout not found');

      const gymId = (workout as any).program?.gym_id as string | undefined;
      if (!gymId) throw new AppError(500, 'Workout missing gym');
      const roles = await getRolesAtGym(user.id, gymId);
      if (roles.length === 0) {
        throw new AppError(403, 'You must be a member of this gym to view the leaderboard');
      }

      const { data: stats, error: statsError } = await supabase
        .from('workout_stats')
        .select(
          '*, profile:profiles(first_name, last_name, gender)',
        )
        .eq('workout_id', workoutId);
      if (statsError) throw statsError;

      const format = (workout as any).format as string;
      const withResults = (stats || []).filter((s: any) => hasResult(s, format));
      const withoutResults = (stats || []).filter((s: any) => !hasResult(s, format));
      withResults.sort(formatComparator(format));

      const ranked = withResults.map((s: any, i: number) => ({
        ...s,
        rank: i + 1,
      }));

      // Gender-cohort ranks, assigned independently within each gender.
      const genderCounters: Record<string, number> = {};
      const rankedWithGender = ranked.map((s: any) => {
        const g = s.profile?.gender || null;
        if (!g) return { ...s, gender_rank: null };
        genderCounters[g] = (genderCounters[g] || 0) + 1;
        return { ...s, gender_rank: genderCounters[g] };
      });

      const allRows = [
        ...rankedWithGender,
        ...withoutResults.map((s: any) => ({ ...s, rank: null, gender_rank: null })),
      ];

      res.json({
        workout,
        stats: allRows,
        overall_total: withResults.length,
        gender_totals: genderCounters,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Delete a stat row (self, or admin/coach).
workoutStatRoutes.delete('/workout-stats/:statId', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const statId = req.params.statId as string;

    const { data: stat, error: statError } = await supabase
      .from('workout_stats')
      .select('id, user_id, workout:workouts(program:programs(gym_id))')
      .eq('id', statId)
      .single();
    if (statError || !stat) throw new AppError(404, 'Stat not found');

    if (stat.user_id !== user.id) {
      const gymId = (stat as any).workout?.program?.gym_id;
      if (!gymId) throw new AppError(500, 'Stat missing gym');
      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can delete other users\' results');
      }
    }

    const { error } = await supabase.from('workout_stats').delete().eq('id', statId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
