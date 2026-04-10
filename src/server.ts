import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListTables } from "./tools/listTables.js";
import { registerDescribeTable } from "./tools/describeTable.js";
import { registerQueryData } from "./tools/queryData.js";
import { registerWriteData } from "./tools/writeData.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "supersimple-db-connector",
    version: "4.0.0",
  });

  registerListTables(server);
  registerDescribeTable(server);
  registerQueryData(server);
  registerWriteData(server);

  return server;
}