import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "../config.js";
import { FORBIDDEN_TABLES, validateTableName } from "../security.js";
import { logAction } from "../audit.js";

export function registerDescribeTable(server: McpServer): void {
  server.tool(
    "describe_table",
    "Toon diepgaande details van een tabel inclusief kolommen en Foreign Key relaties.",
    { table_name: z.string().describe("De naam van de tabel om te inspecteren") },
    async ({ table_name }) => {
      validateTableName(table_name);
      
      // VEILIGHEID: Altijd checken of de tabel verboden is!
      if (FORBIDDEN_TABLES.includes(table_name.toLowerCase())) {
        throw new Error(`Toegang tot tabel '${table_name}' is strikt verboden.`);
      }
      
      // Query voor Foreign Keys (Postgres specifiek)
      const fkQuery = `
        SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column 
        FROM information_schema.key_column_usage AS kcu 
        JOIN information_schema.constraint_column_usage AS ccu ON kcu.constraint_name = ccu.constraint_name 
        WHERE kcu.table_name = ?`;
      
      const [columns, foreignKeys] = await Promise.all([
        db(table_name).columnInfo(),
        db.raw(fkQuery, [table_name])
      ]);

      await logAction("describe_table", { table_name }, "SUCCESS");
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            columns, 
            foreign_keys: foreignKeys.rows 
          }, null, 2) 
        }] 
      };
    }
  );
}