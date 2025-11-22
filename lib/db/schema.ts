import { create } from "domain";
import { desc, relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const sessionTable = pgTable("session", {
  id: text().primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  token: text().notNull(),
});

export const accountTable = pgTable("account", {
  id: text().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  password: text(),
});

export const verificationTable = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const boardsTable = pgTable("boards", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const boardAccessTable = pgTable(
  "board_access",
  {
    id: uuid().primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boardsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    boardIdx: index("idx_board_access_board").on(table.boardId),
    userIdx: index("idx_board_access_user").on(table.userId),
  })
);

export const columnsTable = pgTable(
  "columns",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boardsTable.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    boardIdx: index("idx_columns_board").on(table.boardId),
  })
);

export const cardsTable = pgTable(
  "cards",
  {
    id: uuid().primaryKey().defaultRandom(),
    columnIdL: uuid("column_id")
      .notNull()
      .references(() => columnsTable.id, { onDelete: "cascade" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    priority: varchar({ length: 20 }).notNull().default("medium"),
    position: integer().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    columnIdx: index("idx_cards_column").on(table.columnIdL),
  })
);

export const boardsRelations = relations(boardsTable, ({ many, one }) => ({
  owner: one(userTable, {
    fields: [boardsTable.ownerId],
    references: [userTable.id],
  }),
  columns: many(columnsTable),
  boardAccess: many(boardAccessTable),
}));

export const columnsRelations = relations(columnsTable, ({ many, one }) => ({
  board: one(boardsTable, {
    fields: [columnsTable.boardId],
    references: [boardsTable.id],
  }),
  cards: many(cardsTable),
}));

export const cardsRelations = relations(cardsTable, ({ one }) => ({
  column: one(columnsTable, {
    fields: [cardsTable.columnIdL],
    references: [columnsTable.id],
  }),
}));

export const boardAccessRelations = relations(boardAccessTable, ({ one }) => ({
  board: one(boardsTable, {
    fields: [boardAccessTable.boardId],
    references: [boardsTable.id],
  }),
  user: one(userTable, {
    fields: [boardAccessTable.userId],
    references: [userTable.id],
  }),
}));
