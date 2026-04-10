import pkg from "node-sql-parser";

const { Parser } = pkg;
const sqlParser = new Parser();

export const FORBIDDEN_TABLES = [
  "passwords",
  "salaries",
  "user_secrets",
  "credit_cards",
];

export function validateTableName(name: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(
      `Ongeldige tabelnaam '${name}'. Alleen letters, cijfers en _ toegestaan.`
    );
  }
}

export function parseSql(sql: string): { type: string; tables: string[] } {
  try {
    const ast = sqlParser.astify(sql);
    const node = Array.isArray(ast) ? ast[0] : ast;
    const type = (node as any).type?.toLowerCase() ?? "unknown";
    const tableList = sqlParser.tableList(sql);
    const tables = tableList.map((t: string) =>
      t.split("::").pop()?.toLowerCase() ?? ""
    );
    return { type, tables };
  } catch {
    throw new Error("Ongeldige SQL — kan de query niet parsen.");
  }
}

export function checkForbiddenTables(tables: string[]): void {
  for (const table of tables) {
    if (FORBIDDEN_TABLES.includes(table)) {
      throw new Error(`Toegang tot tabel '${table}' is strikt verboden.`);
    }
  }
}