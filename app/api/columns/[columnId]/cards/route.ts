import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and, max } from "drizzle-orm";
import {
  boardAccessTable,
  boardsTable,
  cardsTable,
  columnsTable,
} from "@/lib/db/schema";
import { cardFormSchema } from "@/types/card";

interface RouteContext {
  params: Promise<{ columnId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { columnId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessCheck = await db
      .select({ id: columnsTable.id })
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
          eq(columnsTable.id, columnId),
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

    const body = await req.json();
    const validated = cardFormSchema.parse(body);

    const maxPosResult = await db
      .select({ maxPos: max(cardsTable.position) })
      .from(cardsTable)
      .where(eq(cardsTable.columnId, columnId));

    const newPosition = (maxPosResult[0]?.maxPos ?? -1) + 1;

    const [result] = await db
      .insert(cardsTable)
      .values({
        columnId,
        title: validated.title,
        description: validated.description || "",
        priority: validated.priority,
        position: newPosition,
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 }
    );
  }
}
