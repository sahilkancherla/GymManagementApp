import { z } from 'zod';
import { ROLES, MEMBER_STATUSES, GENDERS } from '../constants';

export const createGymSchema = z.object({
  name: z.string().min(1, 'Gym name is required'),
  contact_email: z.string().email('Valid email required').nullable().optional(),
});

export const updateGymSchema = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  contact_email: z.string().email('Valid email required').nullable().optional(),
});

export const addMemberRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const updateMemberSchema = z
  .object({
    status: z.enum(MEMBER_STATUSES).optional(),
    notes: z.string().max(10000).nullable().optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.notes !== undefined,
    { message: 'At least one field must be provided' },
  );

// Add a member by email. Accepts a single `role` (legacy) or a `roles` array —
// at least one must be provided. Defaults to `['member']` when both are absent.
export const addMemberSchema = z
  .object({
    email: z.string().email('Valid email is required'),
    role: z.enum(ROLES).optional(),
    roles: z.array(z.enum(ROLES)).optional(),
    gender: z.enum(GENDERS).nullable().optional(),
  })
  .refine(
    (v) =>
      v.role !== undefined ||
      v.roles === undefined ||
      v.roles.length > 0,
    { message: 'At least one role is required', path: ['roles'] },
  );

// Admin-initiated update to another member's profile fields.
export const adminUpdateMemberProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  email: z
    .union([z.string().email('Valid email required'), z.literal('')])
    .nullable()
    .optional(),
  phone: z.string().max(40).nullable().optional(),
});

export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
export type AddMemberRoleInput = z.infer<typeof addMemberRoleSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type AdminUpdateMemberProfileInput = z.infer<typeof adminUpdateMemberProfileSchema>;
