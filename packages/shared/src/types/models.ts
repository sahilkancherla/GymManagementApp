import type { Database } from './database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type Gym = Tables['gyms']['Row'];
export type GymMember = Tables['gym_members']['Row'];
export type Plan = Tables['plans']['Row'];
export type Subscription = Tables['subscriptions']['Row'];
export type Program = Tables['programs']['Row'];
export type ProgramEnrollment = Tables['program_enrollments']['Row'];
export type Workout = Tables['workouts']['Row'];
export type WorkoutStat = Tables['workout_stats']['Row'];
export type Class = Tables['classes']['Row'];
export type ClassOccurrence = Tables['class_occurrences']['Row'];
export type ClassSignup = Tables['class_signups']['Row'];
