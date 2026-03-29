import { execSync } from "child_process";
import * as fs from "fs";

export const DEFAULT_CLI =
  "C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe";

export function getCliPath(
  settings?: Record<string, string | boolean>
): string {
  const p = settings?.WarpCliPath;
  if (typeof p === "string" && p.trim()) return p.trim();
  return DEFAULT_CLI;
}

export function cliExists(cliPath: string): boolean {
  try {
    return fs.existsSync(cliPath);
  } catch {
    return false;
  }
}

export function run(args: string, cliPath: string): string {
  if (!cliExists(cliPath)) {
    return "WARP CLI not found at configured path";
  }
  try {
    return execSync(`"${cliPath}" ${args}`, {
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    }).trim();
  } catch (e: unknown) {
    const err = e as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: string;
    };
    if (err.code === "ETIMEDOUT") return "WARP CLI timed out";
    const out = (err.stdout?.trim() || err.stderr?.trim() || err.message || "Error").trim();
    return out;
  }
}

export function getStatus(cliPath: string): string {
  return run("status", cliPath);
}

/** True when WARP reports an active connection (not disconnected / connecting). */
export function isConnected(statusText: string): boolean {
  const s = statusText.toLowerCase();
  if (s.includes("disconnected")) return false;
  if (s.includes("disconnecting")) return false;
  if (s.includes("connecting")) return false;
  if (s.includes("no network")) return false;
  return s.includes("connected");
}

export function formatStatusHint(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("not found") || s.includes("enoent")) {
    return "WARP not installed — check path in settings";
  }
  if (s.includes("timed out")) return raw;
  if (s.includes("no account registered") || s.includes("not registered")) {
    return `${raw} — Run: warp-cli registration new`;
  }
  if (s.includes("locked") && s.includes("warp")) {
    return "Admin lock active — contact your IT admin";
  }
  if (
    s.includes("warp-svc") ||
    (s.includes("service") &&
      (s.includes("not running") || s.includes("unavailable")))
  ) {
    return "WARP service not running — restart Cloudflare WARP";
  }
  return raw.replace(/\s+/g, " ").slice(0, 200);
}

/** Tunnel stats: tries `stats`, then `warp-stats` if the CLI rejects the first. */
export function tunnelStats(cliPath: string): string {
  const primary = run("stats", cliPath);
  const u = primary.toLowerCase();
  const looksMissing =
    u.includes("unknown") ||
    u.includes("unrecognized") ||
    (u.includes("invalid") && u.includes("command"));
  if (looksMissing) {
    return run("warp-stats", cliPath);
  }
  return primary;
}

/** True when `warp-cli stats` returned internal histogram/metrics (no human colo line). */
export function isWarpCliMetricsDump(raw: string): boolean {
  const t = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (!t) return false;
  if (t.startsWith("{") && t.includes('"alternate_network"')) return true;
  if (t.includes("alternate_network:") && t.includes("updates_recv")) return true;
  if (t.includes("message_bus (type=")) return true;
  return false;
}

function isPlausibleColoLabel(v: string): boolean {
  const s = v.trim();
  if (s.length < 2 || s.length > 80) return false;
  if (/updates_recv|api_actor|request=|message_bus|\(count/i.test(s)) return false;
  return true;
}

/** IPv4 tunnel endpoint from `warp-cli -j tunnel stats` (consumer builds omit POP in `stats`). */
export function getTunnelV4Endpoint(cliPath: string): string | null {
  if (!cliExists(cliPath)) return null;
  try {
    const out = execSync(`"${cliPath}" -j tunnel stats`, {
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    }).trim();
    const j = JSON.parse(out) as { v4_endpoint?: unknown };
    const ep = j.v4_endpoint;
    return typeof ep === "string" && ep.length > 0 ? ep : null;
  } catch {
    return null;
  }
}

/** Best-effort colocation / POP label from `stats` / `warp-stats` text or JSON-ish blob. */
export function extractColoCode(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const patterns: RegExp[] = [
    /colocation\s+center\s*:\s*([A-Za-z0-9-]+)/i,
    /"colo"\s*:\s*"([^"]+)"/i,
    /colo(?:cation)?\s*[:#]\s*([A-Za-z0-9][A-Za-z0-9().\s-]{0,48})/i,
    /\bcolo(?:cation)?\s+([A-Z]{3})\b/i,
    /pop\s*[:#]\s*([A-Za-z0-9-]+)/i,
    /data\s*center\s*[:#]\s*(.{1,60}?)(?=\s{2,}|$)/i,
    /edge\s*[:#]\s*([A-Za-z0-9][A-Za-z0-9().\s-]{0,40})/i,
  ];
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v && isPlausibleColoLabel(v)) {
        return v.length > 80 ? `${v.slice(0, 77)}...` : v;
      }
    }
  }

  return null;
}

/**
 * Subtitle line for Flow Launcher colocation result: real POP when CLI exposes it,
 * otherwise a short hint plus tunnel IP (current Windows `stats` is metrics-only).
 */
export function colocationSubtitle(cliPath: string): string {
  const raw = tunnelStats(cliPath);
  const code = extractColoCode(raw);
  if (code) return `Colocation: ${code}`;

  if (isWarpCliMetricsDump(raw)) {
    const ep = getTunnelV4Endpoint(cliPath);
    return ep
      ? `Colocation: POP code in WARP app only · tunnel ${ep}`
      : "Colocation: POP code in WARP app only (not in warp-cli stats)";
  }

  const hint = formatStatusHint(raw).slice(0, 200);
  return hint ? `Colocation: ${hint}` : "Colocation: (no stats)";
}
