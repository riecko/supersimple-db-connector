import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListTables } from "./tools/listTables.js";
import { registerReadOnlyQuery } from "./tools/readOnlyQuery.js";
import { registerDescribeTable } from "./tools/describeTable.js";
import { registerQueryData } from "./tools/queryData.js";
import { registerWriteData } from "./tools/writeData.js";
import { registerCountRows } from "./tools/countRows.js";
import { registerExplainQuery } from "./tools/explainQuery.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "supersimple-db-connector",
    version: "4.0.0",
  });

  registerListTables(server);
  registerReadOnlyQuery(server);
  registerDescribeTable(server);
  registerQueryData(server);
  registerWriteData(server);
  registerCountRows(server);
  registerExplainQuery(server);
  
  return server;
}