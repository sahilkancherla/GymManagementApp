import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../supabase';
import { AppError } from '../middleware/errors';

export const classSignupRoutes = Router();

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

// Sign up for a class occurrence. Admins/coaches may pass `user_id` to sign
// up another member on their behalf.
classSignupRoutes.post('/occurrences/:occurrenceId/signup', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const occurrenceId = req.params.occurrenceId as string;
    const targetUserId: string =
      typeof req.body?.user_id === 'string' && req.body.user_id ? req.body.user_id : user.id;

    const { data: occurrence, error: occError } = await supabase
      .from('class_occurrences')
      .select('*, class:classes(id, capacity, gym_id)')
      .eq('id', occurrenceId)
      .single();
    if (occError || !occurrence) throw new AppError(404, 'Class occurrence not found');

    const gymId = (occurrence as any).class?.gym_id;
    const classId = (occurrence as any).class?.id;
    if (!gymId || !classId) throw new AppError(500, 'Occurrence missing class/gym');

    // Authorization: signing someone else up requires admin or coach role.
    if (targetUserId !== user.id) {
      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can sign up other users');
      }
    }

    // The target user must be a member of the gym.
    const { data: targetMember } = await supabase
      .from('gym_members')
      .select('id, status')
      .eq('gym_id', gymId)
      .eq('user_id', targetUserId)
      .maybeSingle();
    if (!targetMember || targetMember.status !== 'active') {
      throw new AppError(400, 'Target user is not an active member of this gym');
    }

    // Plan-based access control. If the class has any rows in class_plans,
    // the signup target must hold an active subscription on one of those plans.
    // Empty class_plans set = open to any active member (no restriction).
    const { data: allowedPlans, error: cpError } = await supabase
      .from('class_plans')
      .select('plan_id')
      .eq('class_id', classId);
    if (cpError) throw cpError;

    if (allowedPlans && allowedPlans.length > 0) {
      const allowedSet = new Set(allowedPlans.map((p: any) => p.plan_id));
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', targetUserId)
        .eq('gym_id', gymId)
        .eq('status', 'active');
      if (subsError) throw subsError;

      const hasAllowed = (subs || []).some((s: any) => allowedSet.has(s.plan_id));
      if (!hasAllowed) {
        throw new AppError(
          403,
          'Target user does not hold an active membership for this class',
        );
      }
    }

    if ((occurrence as any).class?.capacity) {
      const { count } = await supabase
        .from('class_signups')
        .select('*', { count: 'exact', head: true })
        .eq('occurrence_id', occurrenceId);
      if (count && count >= (occurrence as any).class.capacity) {
        throw new AppError(400, 'Class is full');
      }
    }

    const { data, error } = await supabase
      .from('class_signups')
      .insert({ occurrence_id: occurrenceId, user_id: targetUserId })
      .select('*, profile:profiles!class_signups_user_id_fkey(id, first_name, last_name)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Cancel the current user's signup for a given occurrence.
classSignupRoutes.delete('/occurrences/:occurrenceId/signup', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { error } = await supabase
      .from('class_signups')
      .delete()
      .eq('occurrence_id', req.params.occurrenceId)
      .eq('user_id', user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Admin/coach: delete any signup by id (cancel on behalf of a member).
classSignupRoutes.delete('/class-signups/:signupId', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const signupId = req.params.signupId as string;

    const { data: signup, error: signupError } = await supabase
      .from('class_signups')
      .select('id, user_id, occurrence:class_occurrences(class:classes(gym_id))')
      .eq('id', signupId)
      .single();
    if (signupError || !signup) throw new AppError(404, 'Signup not found');

    const gymId = (signup as any).occurrence?.class?.gym_id;
    if (!gymId) throw new AppError(500, 'Signup missing gym');

    if (signup.user_id !== user.id) {
      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can remove other signups');
      }
    }

    const { error } = await supabase.from('class_signups').delete().eq('id', signupId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Check in to a class (admin/coach/self).
classSignupRoutes.post('/occurrences/:occurrenceId/check-in/:signupId', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const signupId = req.params.signupId as string;

    const { data: signup, error: signupError } = await supabase
      .from('class_signups')
      .select('*, occurrence:class_occurrences(class:classes(gym_id))')
      .eq('id', signupId)
      .single();

    if (signupError || !signup) throw new AppError(404, 'Signup not found');

    if (signup.checked_in) throw new AppError(400, 'Already checked in');

    const gymId = (signup as any).occurrence?.class?.gym_id;

    // Only admin/coach can check in someone else.
    if (signup.user_id !== user.id) {
      const roles = await getRolesAtGym(user.id, gymId);
      if (!roles.some((r) => r === 'admin' || r === 'coach')) {
        throw new AppError(403, 'Only admins and coaches can check in other users');
      }
    }

    const { data, error } = await supabase
      .from('class_signups')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', signupId)
      .select()
      .single();

    if (error) throw error;

    // Increment classes_used on active count-based subscription.
    if (gymId) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, classes_used, plan:plans(class_count)')
        .eq('user_id', signup.user_id)
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .limit(1)
        .single();

      const plan = sub?.plan as any;
      if (sub && plan?.class_count) {
        await supabase
          .from('subscriptions')
          .update({ classes_used: ((sub as any).classes_used || 0) + 1 })
          .eq('id', (sub as any).id);
      }
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Undo a check-in (admin/coach only).
classSignupRoutes.delete('/occurrences/:occurrenceId/check-in/:signupId', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const signupId = req.params.signupId as string;

    const { data: signup, error: signupError } = await supabase
      .from('class_signups')
      .select('id, user_id, checked_in, occurrence:class_occurrences(class:classes(gym_id))')
      .eq('id', signupId)
      .single();
    if (signupError || !signup) throw new AppError(404, 'Signup not found');
    if (!signup.checked_in) throw new AppError(400, 'Not checked in');

    const gymId = (signup as any).occurrence?.class?.gym_id;
    const roles = await getRolesAtGym(user.id, gymId);
    if (!roles.some((r) => r === 'admin' || r === 'coach')) {
      throw new AppError(403, 'Only admins and coaches can undo a check-in');
    }

    const { data, error } = await supabase
      .from('class_signups')
      .update({ checked_in: false, checked_in_at: null, checked_in_by: null })
      .eq('id', signupId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
