import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { boardAccessTable, boardsTable } from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ boardId: string; userId: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { boardId, userId } = await context.params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [board] = await db
      .select()
      .from(boardsTable)
      .where(
        and(
          eq(boardsTable.id, boardId),
          eq(boardsTable.ownerId, session.user.id)
        )
      )
      .limit(1);

    if (!board) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db
      .delete(boardAccessTable)
      .where(
        and(
          eq(boardAccessTable.boardId, boardId),
          eq(boardAccessTable.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing access:", error);
    return NextResponse.json(
      { error: "Failed to remove access" },
      { status: 500 }
    );
  }
}
