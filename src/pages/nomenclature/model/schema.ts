import * as z from 'zod';

export const nomenclatureSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  retention_years: z.number().min(1).max(99),
});

export type NomenclatureForm = z.infer<typeof nomenclatureSchema>;