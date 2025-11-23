import { z } from "zod";

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedBoard extends Board {
  ownerName: string;
  ownerEmail: string;
}

export const createBoardSchema = z.object({
  name: z.string().min(1, "O nome do quadro é obrigatório"),
});
