import { BoardView } from "@/components/board-view";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  boardAccessTable,
  boardsTable,
  cardsTable,
  columnsTable,
  userTable,
} from "@/lib/db/schema";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const boardAccessQuery = await db
    .select({
      id: boardsTable.id,
      name: boardsTable.name,
      owner_id: boardsTable.ownerId,
    })
    .from(boardsTable)
    .leftJoin(
      boardAccessTable,
      and(
        eq(boardsTable.ownerId, session.user.id),
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
    );

  if (boardAccessQuery.length === 0) {
    notFound();
  }

  const board = boardAccessQuery[0];
  const isOwner = board.owner_id === session.user.id;

  const columnsData = await db
    .select({
      id: columnsTable.id,
      name: columnsTable.name,
      position: columnsTable.position,
    })
    .from(columnsTable)
    .where(eq(columnsTable.boardId, boardId))
    .orderBy(asc(columnsTable.position));

  const cardsData = await db
    .select({
      id: cardsTable.id,
      column_id: cardsTable.columnId,
      title: cardsTable.title,
      description: cardsTable.description,
      priority: cardsTable.priority,
      position: cardsTable.position,
    })
    .from(cardsTable)
    .innerJoin(columnsTable, eq(cardsTable.columnId, columnsTable.id))
    .where(eq(columnsTable.boardId, boardId))
    .orderBy(asc(cardsTable.position));

  let usersData: any[] = [];
  if (isOwner) {
    usersData = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        granted_at: boardAccessTable.grantedAt,
      })
      .from(boardAccessTable)
      .innerJoin(userTable, eq(boardAccessTable.userId, userTable.id))
      .where(eq(boardAccessTable.boardId, boardId))
      .orderBy(desc(boardAccessTable.grantedAt));

    return (
      <BoardView
        board={{
          id: board.id,
          name: board.name,
          isOwner,
        }}
        columns={columnsData.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
        }))}
        cards={cardsData.map((c) => ({
          id: c.id,
          columnId: c.column_id,
          title: c.title,
          description: c.description || "",
          priority: c.priority,
          position: c.position,
        }))}
        users={usersData.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          grantedAt: u.granted_at.toISOString(),
        }))}
      />
    );
  }
}
