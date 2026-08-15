import { z } from "zod";

export const createLogSchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(["debug", "info", "warn", "error"]),
  service: z.string().min(1).max(100),
  message: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type CreateLogInput = z.infer<typeof createLogSchema>;