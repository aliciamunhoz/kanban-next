"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Edit2Icon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
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
import { Board, createBoardSchema, SharedBoard } from "@/types/board";

interface BoardsListProps {
  ownedBoards: Board[];
  sharedBoards: SharedBoard[];
  userId: string;
}

type CreateBoardFormData = z.infer<typeof createBoardSchema>;

export function BoardsList({
  ownedBoards,
  sharedBoards,
  userId,
}: BoardsListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
  });

  async function onCreateBoard(data: CreateBoardFormData) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const board = await response.json();
        router.push(`/boards/${board.id}`);
      }
    } catch (err) {
      console.error("Erro ao criar o quadro:", err);
    } finally {
      setIsLoading(false);
      setShowCreate(false);
      reset();
    }
  }

  async function onUpdateBoard(data: CreateBoardFormData) {
    if (!editingBoard) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/boards/${editingBoard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Error updating board:", err);
    } finally {
      setIsLoading(false);
      setEditingBoard(null);
      reset();
    }
  }

  async function onDeleteBoard() {
    if (!deletingBoard) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${deletingBoard.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Error deleting board:", err);
    } finally {
      setIsLoading(false);
      setDeletingBoard(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Meus quadros</h2>
          <Button onClick={() => setShowCreate(true)}>
            <PlusIcon className="w-4 h-4 mr-2" /> Novo quadro
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ownedBoards.map((board) => (
            <Card
              key={board.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
            >
              <CardHeader onClick={() => router.push(`/boards/${board.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Atualizado em{" "}
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBoard(board);
                        reset({ name: board.name });
                      }}
                    >
                      <Edit2Icon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingBoard(board);
                      }}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {ownedBoards.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nenhum quadro ainda</p>
            <Button onClick={() => setShowCreate(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Crie seu primeiro quadro
            </Button>
          </Card>
        )}
      </div>

      {sharedBoards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Compartilhados comigo</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedBoards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/boards/${board.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Compartilhado por {board.ownerName || board.ownerEmail}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo quadro</DialogTitle>
            <DialogDescription>
              Dê um nome ao seu quadro para começar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateBoard)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do quadro</Label>
                <Input
                  id="name"
                  placeholder="Meu projeto"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar quadro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBoard} onOpenChange={() => setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear quadro</DialogTitle>
            <DialogDescription>Mude o nome do seu quadro</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onUpdateBoard)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do quadro</Label>
                <Input
                  id="edit-name"
                  placeholder="Meu projeto"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBoard(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingBoard}
        onOpenChange={() => setDeletingBoard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir quadro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o quadro {deletingBoard?.name}?
              Essa ação não poderá ser desfeita e excluirá todas as colunas e
              cards .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingBoard(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteBoard}
              disabled={isLoading}
            >
              {isLoading ? "Excluindo..." : "Excluir quadro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
