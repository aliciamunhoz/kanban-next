import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and } from "drizzle-orm";
import { columnFormSchema } from "@/types/column";
import { boardAccessTable, boardsTable, columnsTable } from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ columnId: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { columnId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = columnFormSchema.parse(body);

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

    const [result] = await db
      .update(columnsTable)
      .set({ name: validated.name })
      .where(eq(columnsTable.id, columnId))
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
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

    await db.delete(columnsTable).where(eq(columnsTable.id, columnId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
