import { z } from "zod";

import { LOG_LEVELS } from "../types/logs.js";

const attributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const createLogSchema = z.object({
  timestamp: z.string().datetime(),

  level: z.enum(LOG_LEVELS),

  service: z
    .string()
    .min(1, "service must not be empty")
    .max(100),

  message: z
    .string()
    .min(1, "message must not be empty"),

  attributes: z
    .record(z.string(), attributeValueSchema)
    .optional(),
});

export type CreateLogInput = z.infer<typeof createLogSchema>;