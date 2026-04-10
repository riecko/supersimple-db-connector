import knex from "knex";
import type { Knex } from "knex";

const dbUrl = process.env.DATABASE_URL || "postgresql://mcp_reader:veiligwachtwoord@127.0.0.1:5432/postgres";

if (!dbUrl) {
  console.error("FOUT: DATABASE_URL niet ingesteld");
  process.exit(1);
}

export function detectClient(url: string): "pg" | "mysql2" | "better-sqlite3" {
  if (url.startsWith("postgres") || url.startsWith("postgresql")) return "pg";
  if (url.startsWith("mysql")) return "mysql2";
  if (url.startsWith("sqlite") || url.endsWith(".db")) return "better-sqlite3";
  throw new Error(`Onbekend databasetype: "${url.split(":")[0]}"`);
}

export const dbClient = detectClient(dbUrl);

export const db: Knex = knex({
  client: dbClient,
  connection:
    dbClient === "better-sqlite3"
      ? { filename: dbUrl.replace("sqlite://", "") }
      : dbUrl,
  useNullAsDefault: dbClient === "better-sqlite3",
  ...(dbClient === "pg" && {
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn: any, done: Function) => {
        conn.query("SET statement_timeout = 5000", (err: any) => done(err, conn));
      },
    },
  }),
});

export { dbUrl };