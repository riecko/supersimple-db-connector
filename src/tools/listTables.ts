import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db, dbClient } from "../config.js";
import { FORBIDDEN_TABLES } from "../security.js";
import { logAction } from "../audit.js";

export function registerListTables(server: McpServer): void {
  server.tool(
    "list_tables",
    "Lijst alle toegestane tabellen op in de database",
    {},
    async () => {
      const sql =
        dbClient === "pg"
          ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
          : dbClient === "mysql2"
          ? "SHOW TABLES"
          : "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";

      const res = await db.raw(sql);
      const rows = dbClient === "pg" ? res.rows : res[0];
      const filtered = rows.filter((r: Record<string, string>) => {
        const tName = Object.values(r)[0] as string;
        return !FORBIDDEN_TABLES.includes(tName.toLowerCase());
      });

      await logAction("list_tables", {}, "SUCCESS");
      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    }
  );
}