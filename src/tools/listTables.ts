import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db, dbClient } from "../config.js";
import { FORBIDDEN_TABLES } from "../security.js";
import { logAction } from "../audit.js";

export function registerListTables(server: McpServer): void {
  server.tool(
    "list_tables",
    "Lijst alle toegestane tabellen op in de database voor inspectie.",
    {},
    async () => {
      // 1. Bepaal de SQL op basis van de gebruikte database client
      const sql =
        dbClient === "pg"
          ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
          : dbClient === "mysql2"
          ? "SHOW TABLES"
          : "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";

      const res = await db.raw(sql);
      
      // 2. Normaliseer de rows (verschilt per database driver)
      const rows = dbClient === "pg" ? res.rows : res[0];
      
      // 3. Filter op FORBIDDEN_TABLES en schoon de data op
      const tableNames = rows
        .map((r: Record<string, any>) => Object.values(r)[0] as string)
        .filter((tName: string) => !FORBIDDEN_TABLES.includes(tName.toLowerCase()));

      await logAction("list_tables", {}, "SUCCESS");

      // 4. Return een simpele leesbare lijst voor de AI
      return { 
        content: [{ 
          type: "text", 
          text: `Toegestane tabellen: ${tableNames.join(", ")}` 
        }] 
      };
    }
  );
}