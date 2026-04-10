import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, dbClient } from "../config.js";
import { parseSql, checkForbiddenTables } from "../security.js";
import { logAction } from "../audit.js";

export function registerWriteData(server: McpServer): void {
  server.tool(
    "write_data",
    "Voer INSERT, UPDATE of DELETE uit. Vraag ALTIJD toestemming aan de gebruiker vóór je dit aanroept.",
    {
      sql: z.string().describe("De SQL write query (INSERT, UPDATE of DELETE)"),
      explanation: z.string().describe("Beschrijf wat deze query doet en waarom"),
    },
    async ({ sql, explanation }) => {
      const { type, tables } = parseSql(sql);
      const allowed = ["insert", "update", "delete"];

      if (!allowed.includes(type)) {
        throw new Error(`Query type '${type}' is niet toegestaan.`);
      }
      checkForbiddenTables(tables);

      const lower = sql.toLowerCase();
      if (type === "update" && !lower.includes("where")) {
        throw new Error("UPDATE zonder WHERE clause is niet toegestaan.");
      }
      if (type === "delete" && !lower.includes("where")) {
        throw new Error("DELETE zonder WHERE clause is niet toegestaan.");
      }

      const res = await db.raw(sql);
      const affected = dbClient === "pg" ? res.rowCount : res[0].affectedRows;

      await logAction("write_data", { sql, explanation }, "SUCCESS");
      return {
        content: [{
          type: "text",
          text: `Uitgevoerd: ${explanation}\nRijen beïnvloed: ${affected}`,
        }],
      };
    }
  );
}