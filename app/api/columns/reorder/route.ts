import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and, asc } from "drizzle-orm";
import { z } from "zod";
import { boardAccessTable, boardsTable, columnsTable } from "@/lib/db/schema";

const reorderSchema = z.object({
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
        id: columnsTable.id,
        boardId: columnsTable.boardId,
      })
      .from(columnsTable)
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
          eq(columnsTable.id, validated.columnId),
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

    const boardId = accessCheck[0].boardId;

    await db
      .update(columnsTable)
      .set({ position: validated.position })
      .where(eq(columnsTable.id, validated.columnId));

    const allColumns = await db
      .select()
      .from(columnsTable)
      .where(eq(columnsTable.boardId, boardId))
      .orderBy(asc(columnsTable.position));

    for (let i = 0; i < allColumns.length; i++) {
      if (allColumns[i].id !== validated.columnId) {
        await db
          .update(columnsTable)
          .set({ position: i })
          .where(eq(columnsTable.id, allColumns[i].id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering column:", error);
    return NextResponse.json(
      { error: "Failed to reorder column" },
      { status: 500 }
    );
  }
}
