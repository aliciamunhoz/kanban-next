import { BoardsList } from "@/components/boards-list";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { boardAccessTable, boardsTable, userTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function BoardsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const ownedBoards = await db
    .select({
      id: boardsTable.id,
      name: boardsTable.name,
      created_at: boardsTable.createdAt,
      updated_at: boardsTable.updatedAt,
    })
    .from(boardsTable)
    .where(eq(boardsTable.ownerId, session.user.id))
    .orderBy(desc(boardsTable.updatedAt));

  const sharedBoards = await db
    .select({
      id: boardsTable.id,
      name: boardsTable.name,
      created_at: boardsTable.createdAt,
      updated_at: boardsTable.updatedAt,
      owner_name: userTable.name,
      owner_email: userTable.email,
    })
    .from(boardsTable)
    .innerJoin(boardAccessTable, eq(boardsTable.id, boardAccessTable.boardId))
    .innerJoin(userTable, eq(boardsTable.ownerId, userTable.id))
    .where(eq(boardAccessTable.userId, session.user.id))
    .orderBy(desc(boardsTable.updatedAt));

  return (
    <div className="min-h-screen from-background via-muted/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="KanbanFlow" width={48} height={48} />
            <div>
              <h1 className="text-2xl font-bold">Meus quadros</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo de volta, {session.user.name || session.user.email}
              </p>
            </div>
          </div>
          <form action="/api/sign-out" method="POST">
            <Button variant="outline" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BoardsList
          ownedBoards={ownedBoards.map((b) => ({
            id: b.id,
            name: b.name,
            createdAt: b.created_at.toISOString(),
            updatedAt: b.updated_at.toISOString(),
          }))}
          sharedBoards={sharedBoards.map((b) => ({
            id: b.id,
            name: b.name,
            ownerName: b.owner_name,
            ownerEmail: b.owner_email,
            createdAt: b.created_at.toISOString(),
            updatedAt: b.updated_at.toISOString(),
          }))}
          userId={session.user.id}
        />
      </main>
    </div>
  );
}
