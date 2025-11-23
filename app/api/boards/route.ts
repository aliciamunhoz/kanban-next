import { createBoardSchema } from "@/components/boards-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { boardAccessTable, boardsTable, userTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownedBoards = await db
      .select()
      .from(boardsTable)
      .where(eq(boardsTable.ownerId, session.user.id))
      .orderBy(desc(boardsTable.updatedAt));

    const sharedBoards = await db
      .select({
        id: boardsTable.id,
        name: boardsTable.name,
        ownerId: boardsTable.ownerId,
        createdAt: boardsTable.createdAt,
        updatedAt: boardsTable.updatedAt,
        ownerEmail: userTable.email,
      })
      .from(boardAccessTable)
      .innerJoin(boardsTable, eq(boardsTable.id, boardAccessTable.boardId))
      .innerJoin(userTable, eq(userTable.id, boardsTable.ownerId))
      .where(eq(boardAccessTable.userId, session.user.id))
      .orderBy(desc(boardsTable.updatedAt));

    return NextResponse.json(
      { owned: ownedBoards, shared: sharedBoards },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching boards:", err);
    return NextResponse.json(
      { error: "Internal Server Error when fetching the boards" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createBoardSchema.parse(body);

    const [board] = await db
      .insert(boardsTable)
      .values({
        name: validated.name,
        ownerId: session.user.id,
      })
      .returning();

    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    console.error("Error creating board:", err);
    return NextResponse.json(
      { error: "Internal Server Error when creating the board" },
      { status: 500 }
    );
  }
}
