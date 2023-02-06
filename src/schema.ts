import { z } from "zod";

export const args_schema = z.object({
  config: z.string(),
});

export const config_schema = z.object({
  starting_position: z.number(),
  turns_to_simulate: z.number().min(1),
  blockers: z
    .object({
      tile: z.coerce.number().min(2).max(19),
      edge: z.coerce.number().min(2).max(12),
    })
    .array(),
  teleporters: z
    .object({
      tile: z.coerce.number().min(1).max(19),
      edge: z.coerce.number().min(2).max(12),
      target: z.coerce.number().min(2).max(19),
    })
    .array(),
});
