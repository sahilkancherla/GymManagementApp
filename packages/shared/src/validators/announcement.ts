import { z } from 'zod';

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(140, 'Title is too long'),
    body: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
    pinned: z.boolean().optional(),
    // Targeting — at most one of these may be set. Both null means gym-wide.
    program_id: z.string().uuid().nullable().optional(),
    plan_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => !(v.program_id && v.plan_id), {
    message: 'Choose a program or membership, not both',
    path: ['plan_id'],
  });

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    body: z.string().trim().min(1).max(4000).optional(),
    pinned: z.boolean().optional(),
    program_id: z.string().uuid().nullable().optional(),
    plan_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => !(v.program_id && v.plan_id), {
    message: 'Choose a program or membership, not both',
    path: ['plan_id'],
  });

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
