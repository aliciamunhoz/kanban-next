"use client";

import { Card as KanbanCard } from "@/types/card";
import { Column, columnFormSchema, ColumnFormValues } from "@/types/column";
import {
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
} from "@hello-pangea/dnd";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit2Icon,
  GripVerticalIcon,
  MoreVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const cardFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

interface KanbanColumnProps {
  column: Column;
  cards: KanbanCard[];
  onRename: (columnId: string, newName: string) => void;
  onDelete: (columnId: string) => void;
  onAddCard: (
    columnId: string,
    title: string,
    description: string,
    priority: string
  ) => void;
  onUpdateCard: (
    cardId: string,
    title: string,
    description: string,
    priority: string
  ) => void;
  onDeleteCard: (cardId: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}

export function KanbanColumn({
  column,
  cards,
  onRename,
  onDelete,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  dragHandleProps,
}: KanbanColumnProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerCard,
    handleSubmit: handleSubmitCard,
    reset: resetCard,
    setValue: setValueCard,
    watch: watchCard,
    formState: { errors: cardErrors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      priority: "medium",
    },
  });

  const {
    register: registerColumn,
    handleSubmit: handleSubmitColumn,
    reset: resetColumn,
    formState: { errors: columnErrors },
  } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnFormSchema),
    defaultValues: {
      name: column.name,
    },
  });

  const priority = watchCard("priority");

  async function onSubmitCard(data: CardFormValues) {
    setIsLoading(true);
    try {
      if (editingCard) {
        await onUpdateCard(
          editingCard.id,
          data.title,
          data.description || "",
          data.priority
        );
        setEditingCard(null);
      } else {
        await onAddCard(
          column.id,
          data.title,
          data.description || "",
          data.priority
        );
        setShowAddCard(false);
      }
      resetCard({ priority: "média" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitRename(data: ColumnFormValues) {
    setIsLoading(true);
    try {
      await onRename(column.id, data.name);
      setShowRename(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(card: KanbanCard) {
    setEditingCard(card);
    resetCard({
      title: card.title,
      description: card.description,
      priority: card.priority as "baixa" | "média" | "alta",
    });
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  }

  return (
    <>
      <div className="min-w-[300px] flex flex-col bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVerticalIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{column.name}</h3>
            <Badge variant="secondary">{cards.length}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowRename(true)}>
                <Edit2Icon className="w-4 h-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(column.id)}
                className="text-destructive"
              >
                <Trash2Icon className="w-4 h-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Droppable droppableId={column.id} type="card">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 space-y-2 min-h-[200px] ${
                snapshot.isDraggingOver ? "bg-muted/80 rounded-md" : ""
              }`}
            >
              {cards
                .sort((a, b) => a.position - b.position)
                .map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging ? "shadow-lg rotate-2" : ""
                        }`}
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {card.title}
                            </CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVerticalIcon className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEdit(card)}
                                >
                                  <Edit2Icon className="w-4 h-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteCard(card.id)}
                                  className="text-destructive"
                                >
                                  <Trash2Icon className="w-4 h-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        {card.description && (
                          <CardContent className="p-4 pt-0">
                            {card.description}
                          </CardContent>
                        )}
                        <div className="px-4 pb-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(
                              card.priority
                            )} text-white border-0`}
                          >
                            {card.priority}
                          </Badge>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Button
          variant="ghost"
          className="w-full mt-2 justify-start"
          onClick={() => {
            resetCard({ priority: "medium" });
            setShowAddCard(true);
          }}
        >
          <PlusIcon className="w-4 h-4" />
          Adicionar card
        </Button>
      </div>

      <Dialog
        open={showAddCard || !!editingCard}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddCard(false);
            setEditingCard(null);
            resetCard({ priority: "medium" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Editar card" : "Adicionar card"}
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? "Atualizar os detalhes do card"
                : "Criar um novo card nesta coluna"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCard(onSubmitCard)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Título do card"
                  {...registerCard("title")}
                />
                {cardErrors.title && (
                  <p className="text-sm text-destructive">
                    {cardErrors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Adicione mais detalhes..."
                  rows={3}
                  {...registerCard("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setValueCard("priority", value as "low" | "medium" | "high")
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddCard(false);
                  setEditingCard(null);
                  resetCard({ priority: "medium" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Salvando..."
                  : editingCard
                  ? "Atualizar card"
                  : "Adicionar card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear coluna</DialogTitle>
            <DialogDescription>Mudar o nome desta coluna</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitColumn(onSubmitRename)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="column-rename">Nome da coluna</Label>
                <Input
                  id="column-rename"
                  placeholder="Nome da coluna"
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
                onClick={() => setShowRename(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
