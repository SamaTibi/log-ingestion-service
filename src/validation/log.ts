import { z } from "zod";

import { LOG_LEVELS } from "../types/logs.js";

export const createLogSchema = z.object({
  timestamp: z.string().datetime(),

  level: z.enum(LOG_LEVELS),

  service: z
    .string()
    .min(1)
    .max(100),

  message: z
    .string()
    .min(1),

  attributes: z
    .record(z.string(), z.unknown())
    .optional(),
});

export type CreateLogInput = z.infer<typeof createLogSchema>;