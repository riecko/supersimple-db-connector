import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db, dbClient } from "./config.js";
import { createServer } from "./server.js";
import http from "http";

async function shutdown(): Promise<void> {
  console.error("Server wordt afgesloten...");
  await db.destroy();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function run(): Promise<void> {
  // Database connectie — niet fataal
  try {
    await db.raw("SELECT 1");
    console.error(`Database verbinding OK (${dbClient})`);
  } catch (err: any) {
    console.error(`Database niet beschikbaar: ${err.message}`);
  }

  const server = createServer();
  const port = parseInt(process.env.PORT || "8080");
  const isCloud = !!process.env.PORT;

  if (isCloud) {
    // HTTP modus voor MCPize cloud
    console.error(`Starting HTTP MCP server on port ${port}`);

    const httpServer = http.createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });

      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res);
    });

    httpServer.listen(port, () => {
      console.error(`MCP HTTP server luistert op poort ${port}`);
    });
  } else {
    // Stdio modus voor Claude Desktop
    console.error("Starting stdio MCP server");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stdin.resume();
  }
}

run();