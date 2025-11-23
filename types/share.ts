import { z } from "zod";

export const shareFormSchema = z.object({
  email: z.email("E-mail inválido"),
});
