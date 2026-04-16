import { z } from 'zod';
import { MEMBER_STATUSES } from '../constants';

export const createEnrollmentSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(MEMBER_STATUSES).optional(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(MEMBER_STATUSES),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
