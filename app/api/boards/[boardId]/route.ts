import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { boardsTable } from "@/lib/db/schema";
import { createBoardSchema } from "@/types/board";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createBoardSchema.parse(body);

    const [result] = await db
      .update(boardsTable)
      .set({
        name: validated.name,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(boardsTable.id, boardId),
          eq(boardsTable.ownerId, session.user.id)
        )
      )
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [result] = await db
      .delete(boardsTable)
      .where(
        and(
          eq(boardsTable.id, boardId),
          eq(boardsTable.ownerId, session.user.id)
        )
      )
      .returning({ id: boardsTable.id });

    if (!result) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
