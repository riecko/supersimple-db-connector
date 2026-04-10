import fs from "fs";
import path from "path";
import { db } from "./config.js";

const LOG_FILE = path.join(process.cwd(), "audit.log");

const SENSITIVE_KEYS = ["password", "token", "secret", "key", "auth", "credential"];

export function maskSensitiveData(args: unknown): unknown {
  if (typeof args !== "object" || args === null) return args;
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).map(([k, v]) => {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)))
        return [k, "*****"];
      if (typeof v === "string" && k === "sql")
        return [k, v.replace(/('.*?')/g, "'***'")];
      return [k, v];
    })
  );
}

export async function logAction(
  tool: string,
  args: unknown,
  status: string
): Promise<void> {
  const safeArgs = maskSensitiveData(args);
  const entry = { ts: new Date().toISOString(), tool, args: safeArgs, status };
  try {
    await db("audit_logs").insert({
      tool_name: tool,
      arguments: JSON.stringify(safeArgs),
      status,
      created_at: new Date(),
    });
  } catch {
    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
    } catch (err) {
      console.error("Audit logging volledig mislukt:", err);
    }
  }
}