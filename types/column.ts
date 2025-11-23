import { z } from "zod";

export interface Column {
  id: string;
  name: string;
  position: number;
}

export const columnFormSchema = z.object({
  name: z.string().min(1, "Nome da coluna é obrigatório"),
});

export type ColumnFormValues = z.infer<typeof columnFormSchema>;
