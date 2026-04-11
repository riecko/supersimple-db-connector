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
  try {
    await db.raw("SELECT 1");
    console.error(`Database verbinding OK (${dbClient})`);
  } catch (err: any) {
    console.error(`Database niet beschikbaar: ${err.message}`);
  }

  const port = parseInt(process.env.PORT || "8080");
  const isCloud = !!process.env.PORT;

  if (isCloud) {
    console.error(`Starting HTTP MCP server on port ${port}`);

    const httpServer = http.createServer(async (req, res) => {

      // Health check
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", version: "4.0.0", db: dbClient }));
        return;
      }

      // Root info endpoint
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ name: "supersimple-db-connector", version: "4.0.0" }));
        return;
      }

      // Alleen POST naar /mcp
      if (req.url !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      // FIX 1: Accept header validatie
      const accept = req.headers["accept"] ?? "";
      if (!accept.includes("application/json") && !accept.includes("text/event-stream")) {
        res.writeHead(406, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Accept header moet application/json of text/event-stream bevatten" }));
        return;
      }

      // FIX 2: Request body inlezen
      const body = await new Promise<string>((resolve, reject) => {
        let data = "";
        req.on("data", chunk => { data += chunk; });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });

      let parsedBody: unknown;
      try {
        parsedBody = body ? JSON.parse(body) : {};
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Ongeldige JSON in request body" }));
        return;
      }

      // FIX 3: Server per request — geen gedeelde state
      const server = createServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      res.on("close", () => transport.close());

      try {
        await server.connect(transport);
        // FIX 1: parsedBody meegeven aan handleRequest
        await transport.handleRequest(req, res, parsedBody);
      } catch (err: any) {
        console.error("Request fout:", err.message);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });

    httpServer.listen(port, () => {
      console.error(`MCP HTTP server luistert op poort ${port}`);
    });

  } else {
    // Stdio modus voor Claude Desktop — ongewijzigd
    console.error("Starting stdio MCP server");
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
    process.stdin.resume();
  }
}

run();