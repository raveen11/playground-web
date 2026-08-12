import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  roomCode: text("room_code").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const columns = sqliteTable("columns", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  columnId: text("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: text("order").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});
