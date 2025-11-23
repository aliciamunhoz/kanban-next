import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and } from "drizzle-orm";
import {
  boardAccessTable,
  boardsTable,
  cardsTable,
  columnsTable,
} from "@/lib/db/schema";
import { cardFormSchema } from "@/types/card";

interface RouteContext {
  params: Promise<{ cardId: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = cardFormSchema.parse(body);

    const accessCheck = await db
      .select({ id: cardsTable.id })
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
          eq(cardsTable.id, cardId),
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

    const [result] = await db
      .update(cardsTable)
      .set({
        title: validated.title,
        description: validated.description || "",
        priority: validated.priority,
      })
      .where(eq(cardsTable.id, cardId))
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessCheck = await db
      .select({ id: cardsTable.id })
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
          eq(cardsTable.id, cardId),
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

    await db.delete(cardsTable).where(eq(cardsTable.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
