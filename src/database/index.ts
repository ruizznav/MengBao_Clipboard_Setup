import Database from "@tauri-apps/plugin-sql";
import { isBoolean } from "es-toolkit";
import { Kysely } from "kysely";
import { TauriSqliteDialect } from "kysely-dialect-tauri";
import { SerializePlugin } from "kysely-plugin-serialize";
import type { DatabaseSchema } from "@/types/database";
import { getSaveDatabasePath } from "@/utils/path";

let db: Kysely<DatabaseSchema> | null = null;

export const getDatabase = async () => {
  if (db) return db;

  const path = await getSaveDatabasePath();

  db = new Kysely<DatabaseSchema>({
    dialect: new TauriSqliteDialect({
      database: (prefix) => Database.load(prefix + path),
    }),
    plugins: [
      new SerializePlugin({
        deserializer: (value) => value,
        serializer: (value) => {
          if (isBoolean(value)) {
            return Number(value);
          }

          return value;
        },
      }),
    ],
  });

  await db.schema
    .createTable("history")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("type", "text")
    .addColumn("group", "text")
    .addColumn("value", "text")
    .addColumn("search", "text")
    .addColumn("count", "integer")
    .addColumn("width", "integer")
    .addColumn("height", "integer")
    .addColumn("createTime", "text")
    .addColumn("note", "text")
    .addColumn("subtype", "text")
    .execute();

  await db.schema
    .createTable("group")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("color", "text", (col) => col.notNull())
    .addColumn("sortOrder", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("createTime", "text")
    .execute();

  // 确保预设分组存在，并强制排序位置
  const presetGroups = [
    {
      color: "#64b5f6",
      createTime: new Date().toISOString(),
      id: "_default",
      name: "默认",
      sortOrder: 0,
    },
    {
      color: "#f06292",
      createTime: new Date().toISOString(),
      id: "_work",
      name: "工作",
      sortOrder: 1,
    },
    {
      color: "#81c784",
      createTime: new Date().toISOString(),
      id: "_study",
      name: "学习",
      sortOrder: 2,
    },
    {
      color: "#ffb74d",
      createTime: new Date().toISOString(),
      id: "_etc",
      name: "等等",
      sortOrder: 3,
    },
  ];
  for (const g of presetGroups) {
    const exists = await db
      .selectFrom("group")
      .selectAll()
      .where("id", "=", g.id)
      .execute();
    if (exists.length === 0) {
      await db.insertInto("group").values(g).execute();
    } else {
      // 强制更新排序位置，确保 _default 永远第一
      await db
        .updateTable("group")
        .set({ sortOrder: g.sortOrder })
        .where("id", "=", g.id)
        .execute();
    }
  }

  return db;
};

export const destroyDatabase = async () => {
  const db = await getDatabase();

  return db.destroy();
};
