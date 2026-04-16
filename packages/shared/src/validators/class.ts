import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().nullable().optional(),
  coach_id: z.string().uuid().nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  duration_minutes: z.number().int().min(1).optional().default(60),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS (UTC)')
    .nullable()
    .optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional().default([]),
  one_off_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  // Empty array = open to any active member; otherwise restrict to these plan ids.
  plan_ids: z.array(z.string().uuid()).optional().default([]),
});

export const updateClassSchema = createClassSchema.partial();

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
