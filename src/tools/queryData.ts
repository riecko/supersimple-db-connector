import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, dbClient } from "../config.js";
import { parseSql, checkForbiddenTables } from "../security.js";
import { enforcePagination } from "../pagination.js";
import { logAction } from "../audit.js";

export function registerQueryData(server: McpServer): void {
  server.tool(
    "query_data",
    "Voer een SELECT query uit. Gebruik describe_table eerst. Max 100 rijen.",
    { sql: z.string().describe("Een SQL SELECT query") },
    async ({ sql }) => {
      const { type, tables } = parseSql(sql);
      if (type !== "select") {
        throw new Error("Alleen SELECT queries zijn toegestaan.");
      }
      checkForbiddenTables(tables);

      const finalSql = enforcePagination(sql);
      const res = await db.raw(finalSql);
      const rows = dbClient === "pg" ? res.rows : res[0];

      await logAction("query_data", { sql }, "SUCCESS");
      return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
    }
  );
}