import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { boardAccessTable, boardsTable, userTable } from "@/lib/db/schema";
import { shareFormSchema } from "@/components/board-view";

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

    const body = await req.json();
    const validated = shareFormSchema.parse(body);

    const [targetUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, validated.email))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(boardAccessTable)
      .where(
        and(
          eq(boardAccessTable.boardId, boardId),
          eq(boardAccessTable.userId, targetUser.id)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Board already shared with this user" },
        { status: 400 }
      );
    }

    await db.insert(boardAccessTable).values({
      boardId,
      userId: targetUser.id,
    });

    const userList = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        grantedAt: boardAccessTable.grantedAt,
      })
      .from(boardAccessTable)
      .innerJoin(userTable, eq(boardAccessTable.userId, userTable.id))
      .where(eq(boardAccessTable.boardId, boardId))
      .orderBy(desc(boardAccessTable.grantedAt));

    return NextResponse.json(
      userList.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        grantedAt: u.grantedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error sharing board:", error);
    return NextResponse.json(
      { error: "Failed to share board" },
      { status: 500 }
    );
  }
}
