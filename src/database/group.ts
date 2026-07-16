import type { DatabaseSchemaGroup } from "@/types/database";
import { getDatabase } from ".";

export const selectGroups = async () => {
  const db = await getDatabase();

  return db
    .selectFrom("group")
    .selectAll()
    .orderBy("sortOrder", "asc")
    .orderBy("createTime", "asc")
    .execute() as Promise<DatabaseSchemaGroup[]>;
};

export const insertGroup = async (data: DatabaseSchemaGroup) => {
  const db = await getDatabase();

  return db.insertInto("group").values(data).execute();
};

export const updateGroup = async (
  id: string,
  nextData: Partial<DatabaseSchemaGroup>,
) => {
  const db = await getDatabase();

  return db.updateTable("group").set(nextData).where("id", "=", id).execute();
};

export const deleteGroup = async (id: string) => {
  const db = await getDatabase();

  return db.deleteFrom("group").where("id", "=", id).execute();
};
