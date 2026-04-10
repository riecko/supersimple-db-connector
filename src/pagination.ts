export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 50;

export function enforcePagination(sql: string): string {
  const limitMatch = sql.match(/\blimit\s+(\d+)/i);
  if (limitMatch && parseInt(limitMatch[1]) > MAX_LIMIT) {
    return sql.replace(/\blimit\s+\d+/i, `LIMIT ${MAX_LIMIT}`);
  }
  if (!limitMatch) {
    return `${sql.replace(/;$/, "")} LIMIT ${DEFAULT_LIMIT}`;
  }
  return sql.replace(/;$/, "");
}