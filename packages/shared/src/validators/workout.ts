import { z } from 'zod';

export const createWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  title: z.string().min(1, 'Workout title is required'),
  description: z.string().nullable().optional(),
  format: z.enum(['time', 'amrap']),
  sort_order: z.number().int().min(0).optional(),
  // Empty array (or omitted) = applies to all classes in the program.
  // Non-empty array = applies only to the listed class ids.
  class_ids: z.array(z.string().uuid()).optional(),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

export const logWorkoutStatSchema = z.object({
  // Optional — admins/coaches may log results on behalf of another gym member.
  // When omitted, the stat is logged against the calling user.
  user_id: z.string().uuid().optional(),
  time_seconds: z.number().int().min(0).nullable().optional(),
  amrap_rounds: z.number().int().min(0).nullable().optional(),
  amrap_reps: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type LogWorkoutStatInput = z.infer<typeof logWorkoutStatSchema>;
