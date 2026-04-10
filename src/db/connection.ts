import knex from "knex";
import type { Knex } from "knex";

// 1. Haal de URL op en check of deze bestaat
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ontbreekt in de omgevingsvariabelen (.env)");
}

// 2. Automatische client-detectie (Postgres of MySQL)
const getClient = (url: string): "pg" | "mysql2" => {
  if (url.startsWith("postgres") || url.startsWith("postgresql")) return "pg";
  if (url.startsWith("mysql")) return "mysql2";
  throw new Error("Database type niet ondersteund. Gebruik postgres:// of mysql://");
};

// 3. De Knex instantie configureren
// We exporteren 'db' zodat je tools deze direct kunnen importeren
export const db: Knex = knex({
  client: getClient(connectionString),
  connection: {
    connectionString: connectionString,
    // Tip: Voor sommige cloud-providers (zoals Render/Neon/AWS) 
    // heb je soms SSL nodig. Voeg dit dan toe:
    // ssl: { rejectUnauthorized: false }
  },
  pool: {
    min: 2,
    max: 10,
    // Enterprise tip: check of connecties nog leven voor gebruik
    afterCreate: (conn: any, cb: any) => {
      conn.query("SELECT 1", (err: any) => cb(err, conn));
    }
  }
});

/**
 * Utility om de verbinding te testen bij het opstarten van de server
 */
export async function testDbConnection() {
  try {
    await db.raw("SELECT 1");
    console.error("🟢 Database verbinding succesvol geïnitialiseerd.");
  } catch (err: any) {
    console.error("🔴 Database verbindingsfout:", err.message);
    process.exit(1);
  }
}