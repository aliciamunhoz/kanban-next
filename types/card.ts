import { z } from "zod";

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: string;
  position: number;
}

export const cardFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
