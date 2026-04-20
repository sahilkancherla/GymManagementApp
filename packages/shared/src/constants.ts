export const APP_NAME = 'GymIt';

export const ROLES = ['member', 'coach', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = ['active', 'inactive'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const PLAN_TYPES = ['count', 'monthly', 'annual'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const WORKOUT_FORMATS = ['time', 'amrap'] as const;
export type WorkoutFormat = (typeof WORKOUT_FORMATS)[number];

export const WORKOUT_TAGS = ['weightlifting', 'benchmark', 'cardio'] as const;
export type WorkoutTag = (typeof WORKOUT_TAGS)[number];

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];
