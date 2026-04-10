import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "../config.js";
import { FORBIDDEN_TABLES, validateTableName } from "../security.js";
import { logAction } from "../audit.js";

export function registerDescribeTable(server: McpServer): void {
  server.tool(
    "describe_table",
    "Toon de kolomstructuur van een tabel. Gebruik dit voor je een query uitvoert.",
    { table_name: z.string().describe("De naam van de tabel om te inspecteren") },
    async ({ table_name }) => {
      validateTableName(table_name);
      if (FORBIDDEN_TABLES.includes(table_name.toLowerCase())) {
        throw new Error(`Toegang tot tabel '${table_name}' is strikt verboden.`);
      }
      const info = await db(table_name).columnInfo();
      await logAction("describe_table", { table_name }, "SUCCESS");
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    }
  );
}