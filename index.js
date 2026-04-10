"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const pg_1 = __importDefault(require("pg"));
// 1. Database Connectie (Enterprise: gebruik omgevingsvariabelen!)
const pool = new pg_1.default.Pool({
    connectionString: process.env.DATABASE_URL,
});
// 2. Initialiseer de MCP Server
const server = new index_js_1.Server({
    name: "enterprise-db-connector",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 3. Definieer de beschikbare tools voor de AI
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "query_inventory",
                description: "Haal actuele voorraadcijfers op uit de database. Gebruik dit voor vragen over productbeschikbaarheid.",
                inputSchema: {
                    type: "object",
                    properties: {
                        category: { type: "string", description: "Filter op productcategorie (optioneel)" },
                    },
                },
            },
        ],
    };
});
// 4. Handel de verzoeken van de AI af
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name === "query_inventory") {
        const category = request.params.arguments?.category;
        // Enterprise Security: Gebruik geparametriseerde queries tegen SQL-injectie!
        const sql = category
            ? "SELECT id, name, stock FROM products WHERE category = $1"
            : "SELECT id, name, stock FROM products";
        const values = category ? [category] : [];
        try {
            const res = await pool.query(sql, values);
            return {
                content: [{ type: "text", text: JSON.stringify(res.rows) }],
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: `Database error: ${error}` }],
                isError: true,
            };
        }
    }
    throw new Error("Tool niet gevonden");
});
// 5. Start de server via Stdio (Standaard voor Claude Desktop)
const transport = new stdio_js_1.StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map