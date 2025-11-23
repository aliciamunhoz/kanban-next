"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "./ui/button";
import { ArrowLeftIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Column, columnFormSchema, ColumnFormValues } from "@/types/column";
import { Card } from "@/types/card";
import { KanbanColumn } from "./kanban-column";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface Board {
  id: string;
  name: string;
  isOwner: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  grantedAt: string;
}

interface BoardViewProps {
  board: Board;
  columns: Column[];
  cards: Card[];
  users: User[];
}

export const shareFormSchema = z.object({
  email: z.email("E-mail inválido"),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

export function BoardView({
  board: initialBoard,
  columns: initialColumns,
  cards: initialCards,
  users: initialUsers,
}: BoardViewProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [cards, setCards] = useState(initialCards);
  const [users, setUsers] = useState(initialUsers);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareError, setShareError] = useState("");

  const {
    register: registerColumn,
    handleSubmit: handleSubmitColumn,
    reset: resetColumn,
    formState: { errors: columnErrors },
  } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnFormSchema),
  });

  const {
    register: registerShare,
    handleSubmit: handleSubmitShare,
    reset: resetShare,
    formState: { errors: shareErrors },
  } = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
  });

  async function onAddColumn(data: ColumnFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch(`api/boards/${initialBoard.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newColumn = await response.json();
        setColumns([...columns, newColumn]);
        setShowAddColumn(false);
        resetColumn();
      }
    } catch (err) {
      console.error("Erro ao adicionar coluna:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function onShareBoard(data: ShareFormValues) {
    setIsLoading(true);
    setShareError("");
    try {
      const response = await fetch(`/api/boards/${initialBoard.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedUsers = await response.json();
        setUsers(updatedUsers);
        resetShare();
      } else {
        const error = await response.json();
        setShareError(error.error || "Erro ao compartilhar o quadro");
      }
    } catch (err) {
      console.error(err);
      setShareError("Um erro ocorreu");
    } finally {
      setIsLoading(false);
    }
  }

  async function onRemoveAccess(userId: string) {
    try {
      const response = await fetch(
        `/api/boards/${initialBoard.id}/share/${userId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error("Erro ao remover acesso:", err);
    }
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, type } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (type === "column") {
      const newColumns = Array.from(columns);
      const [movedColumn] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, movedColumn);

      setColumns(newColumns);

      // Update positions on server
      await fetch("/api/columns/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: movedColumn.id,
          position: destination.index,
        }),
      });
    } else if (type === "card") {
      const sourceColumnId = source.droppableId;
      const destColumnId = destination.droppableId;

      const newCards = Array.from(cards);
      const sourceCards = newCards.filter((c) => c.columnId === sourceColumnId);
      const destCards = newCards.filter((c) => c.columnId === destColumnId);

      if (sourceColumnId === destColumnId) {
        const [movedCard] = sourceCards.splice(source.index, 1);
        sourceCards.splice(destination.index, 0, movedCard);

        const updatedCards = newCards.map((c) => {
          if (c.columnId === sourceColumnId) {
            const idx = sourceCards.findIndex((sc) => sc.id === c.id);
            return { ...c, position: idx };
          }
          return c;
        });

        setCards(updatedCards);
      } else {
        const [movedCard] = sourceCards.splice(source.index, 1);
        movedCard.columnId = destColumnId;
        destCards.splice(destination.index, 0, movedCard);

        const updatedCards = newCards.map((c) => {
          if (c.id === movedCard.id) {
            return { ...movedCard, position: destination.index };
          }
          if (c.columnId === sourceColumnId) {
            const idx = sourceCards.findIndex((sc) => sc.id === c.id);
            return { ...c, position: idx };
          }
          if (c.columnId === destColumnId) {
            const idx = destCards.findIndex((dc) => dc.id === c.id);
            return { ...c, position: idx };
          }
          return c;
        });

        setCards(updatedCards);
      }

      // Update on server
      const movedCard = cards.find((c) => c.id === result.draggableId);
      if (movedCard) {
        await fetch("/api/cards/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: movedCard.id,
            columnId: destColumnId,
            position: destination.index,
          }),
        });
      }
    }
  }

  async function deleteColumn(columnId: string) {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setColumns(columns.filter((c) => c.id !== columnId));
        setCards(cards.filter((c) => c.columnId !== columnId));
      }
    } catch (err) {
      console.error("Erro ao deletar coluna:", err);
    }
  }

  async function renameColumn(columnId: string, newName: string) {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        setColumns(
          columns.map((c) => (c.id === columnId ? { ...c, name: newName } : c))
        );
      }
    } catch (err) {
      console.error("Erro ao renomear coluna:", err);
    }
  }

  async function addCard(
    columnId: string,
    title: string,
    description: string,
    priority: string
  ) {
    try {
      const response = await fetch(`/api/columns/${columnId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });

      if (response.ok) {
        const newCard = await response.json();
        setCards([...cards, newCard]);
      }
    } catch (err) {
      console.error("Erro ao adicionar card:", err);
    }
  }

  async function updateCard(
    cardId: string,
    title: string,
    description: string,
    priority: string
  ) {
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCards(cards.map((c) => (c.id === cardId ? updated : c)));
      }
    } catch (err) {
      console.error("Erro ao atualizar card:", err);
    }
  }

  async function deleteCard(cardId: string) {
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCards(cards.filter((c) => c.id !== cardId));
      }
    } catch (err) {
      console.error("Erro ao deletar card:", err);
    }
  }

  return (
    <div className="min-h-screen from-background via-muted/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/boards")}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">{initialBoard.name}</h1>
          </div>
          {initialBoard.isOwner && (
            <Button variant="outline" onClick={() => setShowShareDialog(true)}>
              <UsersIcon className="w-4 h-4" />
              Compartilhar
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 overflow-x-auto pb-4"
              >
                {columns.map((column, index) => (
                  <Draggable
                    key={column.id}
                    draggableId={column.id}
                    index={index}
                  >
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <KanbanColumn
                          column={column}
                          cards={cards.filter((c) => c.columnId === column.id)}
                          onRename={renameColumn}
                          onDelete={deleteColumn}
                          onAddCard={addCard}
                          onUpdateCard={updateCard}
                          onDeleteCard={deleteCard}
                          dragHandleProps={
                            provided.dragHandleProps || undefined
                          }
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <Button
                  variant="outline"
                  className="min-w-[300px] h-[120px] border-dashed bg-transparent"
                  onClick={() => setShowAddColumn(true)}
                >
                  <PlusIcon className="w-5 h-5" />
                  Adicionar coluna
                </Button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>

      <Dialog open={showAddColumn} onOpenChange={setShowAddColumn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar coluna</DialogTitle>
            <DialogDescription>
              Crie uma nova coluna para o seu quadro
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitColumn(onAddColumn)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="column-name">Nome da coluna</Label>
                <Input
                  id="column-name"
                  placeholder="Em andamento"
                  {...registerColumn("name")}
                />
                {columnErrors.name && (
                  <p className="text-sm text-destructive">
                    {columnErrors.name.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddColumn(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adicionando..." : "Adicionar coluna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar quadro</DialogTitle>
            <DialogDescription>
              Adicione colaboradores ao seu quadro via e-mail
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitShare(onShareBoard)}
            className="space-y-4"
          >
            {shareError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {shareError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="share-email">E-mail</Label>
              <div className="flex gap-2">
                <Input
                  id="share-email"
                  type="email"
                  placeholder="usuario@email.com"
                  {...registerShare("email")}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
              {shareErrors.email && (
                <p className="text-sm text-destructive">
                  {shareErrors.email.message}
                </p>
              )}
            </div>
          </form>

          {users.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Usuários com acesso</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAccess(user.id)}
                    >
                      <Trash2Icon className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
