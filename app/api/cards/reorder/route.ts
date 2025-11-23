import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and, gte, ne, asc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  boardAccessTable,
  boardsTable,
  cardsTable,
  columnsTable,
} from "@/lib/db/schema";

const reorderSchema = z.object({
  cardId: z.string(),
  columnId: z.string(),
  position: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = reorderSchema.parse(body);

    const accessCheck = await db
      .select({
        id: cardsTable.id,
        oldColumnId: cardsTable.columnId,
      })
      .from(cardsTable)
      .innerJoin(columnsTable, eq(cardsTable.columnId, columnsTable.id))
      .innerJoin(boardsTable, eq(columnsTable.boardId, boardsTable.id))
      .leftJoin(
        boardAccessTable,
        and(
          eq(boardsTable.id, boardAccessTable.boardId),
          eq(boardAccessTable.userId, session.user.id)
        )
      )
      .where(
        and(
          eq(cardsTable.id, validated.cardId),
          or(
            eq(boardsTable.ownerId, session.user.id),
            eq(boardAccessTable.userId, session.user.id)
          )
        )
      )
      .limit(1);

    if (accessCheck.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const oldColumnId = accessCheck[0].oldColumnId;

    await db
      .update(cardsTable)
      .set({
        columnId: validated.columnId,
        position: validated.position,
      })
      .where(eq(cardsTable.id, validated.cardId));

    await db
      .update(cardsTable)
      .set({
        position: sql`${cardsTable.position} + 1`,
      })
      .where(
        and(
          eq(cardsTable.columnId, validated.columnId),
          ne(cardsTable.id, validated.cardId),
          gte(cardsTable.position, validated.position)
        )
      );

    if (oldColumnId !== validated.columnId) {
      const oldColumnCards = await db
        .select()
        .from(cardsTable)
        .where(eq(cardsTable.columnId, oldColumnId))
        .orderBy(asc(cardsTable.position));

      for (let i = 0; i < oldColumnCards.length; i++) {
        await db
          .update(cardsTable)
          .set({ position: i })
          .where(eq(cardsTable.id, oldColumnCards[i].id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering card:", error);
    return NextResponse.json(
      { error: "Failed to reorder card" },
      { status: 500 }
    );
  }
}
