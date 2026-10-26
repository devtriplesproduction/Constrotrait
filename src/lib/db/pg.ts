// @ts-ignore
import { Client } from "pg";

export function getPostgresConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const password = process.env.SUPABASE_DB_PASSWORD || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = projectIdMatch ? projectIdMatch[1] : "nxvghafschdniemrpqkn";
  return `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;
}

export function createPgClient(): Client {
  const connectionString = getPostgresConnectionString();
  return new Client({
    connectionString,
  });
}
