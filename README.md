🚀 Supersimple DB Connector (MCP)

An advanced, modular Model Context Protocol (MCP) server that acts as a bridge between LLMs (like Gemini, Claude, or Cursor) and your data infrastructure. This connector provides a unified interface for both structured relational data (SQL) and unstructured vector data (Qdrant).

✨ Features

Modular Architecture: Clean separation of concerns between server lifecycle, database configuration, and tool definitions.

Dual Database Support:

SQL (PostgreSQL/MySQL): High-performance access to structured data and complex relational queries.

Qdrant Vector Store: Built-in support for vector search and RAG (Retrieval-Augmented Generation) workflows.

Stdio Transport: Optimized for local integration with IDEs like Cursor, Windsurf, and the Claude Desktop app.

Cloud-Ready: Fully compatible with deployment platforms like MCPize for managed gateway access.

🛠 Installation

Clone the repository:

Bash
git clone git@github.com:riecko/supersimple-db-connector.git
cd supersimple-db-connector
Install dependencies:

Bash
npm install
Configure Environment Variables:
Create a .env file in the root directory:

Codefragment
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
QDRANT_URL=https://your-qdrant-cluster-url
QDRANT_API_KEY=your-qdrant-api-key

🚀 Usage

Running Locally
To build the project and start the server using Stdio transport:

Bash
npm run build
node dist/index.js
Integration with IDEs (Cursor/VS Code/Gemini)
Add the following configuration to your MCP settings file:

JSON

{

  "mcpServers": {
  
    "supersimple-db": {
    
      "command": "node",
      
      "args": ["/absolute/path/to/project/dist/index.js"],
      
      "env": {
      
        "DATABASE_URL": "your-db-url",
        
        "QDRANT_URL": "your-qdrant-url",
        
        "QDRANT_API_KEY": "your-key"
        
      }
      
    }
    
  }
  
}


📁 Project Structure

src/index.ts: Application entry point, handles process signals and database connectivity checks.

src/server.ts: MCP server initialization, tool registrations, and capability definitions.

src/config.ts: Centralized database client management (Knex.js and QdrantClient).

☁️ Deployment (MCPize)

When deploying to MCPize, ensure you add the following Service Variables in the dashboard under the 'Secrets' or 'Config' section:

DATABASE_URL

QDRANT_URL

QDRANT_API_KEY

🔒 Security

This server is designed to provide controlled access to your data. To ensure security:

Use database users with Read-Only permissions in production.

Never commit your .env file to version control.

When deploying via MCPize, use the Secrets management dashboard.

📄 License

MIT
