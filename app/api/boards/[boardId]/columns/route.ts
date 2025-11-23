import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and, max } from "drizzle-orm";
import { boardAccessTable, boardsTable, columnsTable } from "@/lib/db/schema";
import { columnFormSchema } from "@/types/column";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessCheck = await db
      .select({ id: boardsTable.id })
      .from(boardsTable)
      .leftJoin(
        boardAccessTable,
        and(
          eq(boardsTable.id, boardAccessTable.boardId),
          eq(boardAccessTable.userId, session.user.id)
        )
      )
      .where(
        and(
          eq(boardsTable.id, boardId),
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
    const validated = columnFormSchema.parse(body);

    const maxPosResult = await db
      .select({ maxPos: max(columnsTable.position) })
      .from(columnsTable)
      .where(eq(columnsTable.boardId, boardId));

    const newPosition = (maxPosResult[0]?.maxPos ?? -1) + 1;

    const [result] = await db
      .insert(columnsTable)
      .values({
        boardId,
        name: validated.name,
        position: newPosition,
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}
