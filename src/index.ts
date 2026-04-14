import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db, dbClient } from "./config.js";
import { createServer } from "./server.js";
import http from "http";
import { randomUUID } from "crypto";

// Session store: one transport per client session
const sessions = new Map<string, StreamableHTTPServerTransport>();

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
  const isCloud = !!process.env.PORT || process.env.NODE_ENV === "production";

  if (isCloud) {
    const httpServer = http.createServer(async (req, res) => {
      // 1. Health check & Root
      if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok", db: dbClient }));
      }

      // 2. MCP Endpoint
      if (req.url === "/mcp") {
        // Log elke binnenkomend MCP-verzoek voor debugging
        const incomingSessionId = req.headers["mcp-session-id"] as string | undefined;
        console.error(
          `MCP ${req.method} | session: ${incomingSessionId ?? "nieuw"} | agent: ${req.headers["user-agent"] ?? "onbekend"}`
        );

        try {
          // DELETE: sluit en verwijder de sessie
          if (req.method === "DELETE" && incomingSessionId) {
            const transport = sessions.get(incomingSessionId);
            if (transport) {
              await transport.close();
              sessions.delete(incomingSessionId);
              console.error(`Sessie gesloten: ${incomingSessionId}`);
            }
            res.writeHead(200);
            return res.end();
          }

          // POST (initialize) of GET (SSE stream): zoek of maak sessie
          let sessionId = incomingSessionId;
          let transport = sessionId ? sessions.get(sessionId) : undefined;

          if (!transport) {
            // Nieuwe sessie aanmaken
            sessionId = randomUUID();
            console.error(`Nieuwe sessie aangemaakt: ${sessionId}`);

            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => sessionId!,
              onsessioninitialized: (id) => {
                console.error(`Sessie geïnitialiseerd: ${id}`);
              },
            });

            // Koppel een verse MCP server instantie aan deze sessie
            const mcpServer = createServer();
            await mcpServer.connect(transport);

            sessions.set(sessionId, transport);

            // Ruim sessie op als transport sluit
            transport.onclose = () => {
              console.error(`Transport gesloten, sessie verwijderd: ${sessionId}`);
              sessions.delete(sessionId!);
            };
          }

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

    // Periodiek verlopen sessies opschonen (elke 5 minuten)
    setInterval(() => {
      console.error(`Actieve sessies: ${sessions.size}`);
    }, 5 * 60 * 1000);

  } else {
    console.error("⌨️  Starting stdio MCP server");
    const transport = new StdioServerTransport();
    const mcpServer = createServer();
    await mcpServer.connect(transport);
  }
}

run().catch((err) => {
  console.error("Fatale fout bij opstarten:", err);
  process.exit(1);
});