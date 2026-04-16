import { z } from 'zod';
import { PLAN_TYPES } from '../constants';

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0),
  type: z.enum(PLAN_TYPES),
  program_ids: z.array(z.string().uuid()).optional().default([]),
  class_count: z.number().int().min(1).nullable().optional(),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
