import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db, dbClient } from "./config.js";
import { createServer } from "./server.js";
import http from "http";

// Initialiseer de server één keer (Singleton pattern)
const mcpServer = createServer();

async function shutdown(): Promise<void> {
  console.error("Server wordt afgesloten...");
  await db.destroy();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function run(): Promise<void> {
  // Database check bij opstarten
  try {
    await db.raw("SELECT 1");
    console.error(`🚀 Database verbinding OK (${dbClient})`);
  } catch (err: any) {
    console.error(`❌ Database niet beschikbaar: ${err.message}`);
    // We gaan wel door, want de server moet health checks kunnen beantwoorden
  }

  const port = parseInt(process.env.PORT || "8080");
  const isCloud = !!process.env.PORT || process.env.NODE_ENV === 'production';

  if (isCloud) {
    const transport = new StreamableHTTPServerTransport();

    // Verbind de transport één keer met de server
    await mcpServer.connect(transport);

    const httpServer = http.createServer(async (req, res) => {
      // 1. Health check & Root (Houd deze simpel)
      if (req.method === "GET") {
        if (req.url === "/health" || req.url === "/") {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ status: "ok", db: dbClient }));
        }
      }

      // 2. MCP Endpoint
      if (req.url === "/mcp") {
        try {
          await transport.handleRequest(req, res);
        } catch (err: any) {
          console.error("MCP Request fout:", err.message);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end("Internal Server Error");
          }
        }
        return;
      }

      // 3. Fallback
      res.writeHead(404);
      res.end("Not Found");
    });

    httpServer.listen(port, "0.0.0.0", () => {
      console.error(`✅ MCP HTTP server draait op poort ${port}`);
    });

  } else {
    console.error("⌨️  Starting stdio MCP server");
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }
}

run().catch((err) => {
  console.error("Fatale fout bij opstarten:", err);
  process.exit(1);
});