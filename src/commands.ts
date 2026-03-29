import { cliExists, colocationSubtitle, getStatus, isConnected } from "./warp";

export interface FlowResult {
  Title: string;
  SubTitle: string;
  IcoPath: string;
  JsonRPCAction: { method: string; parameters: unknown[] };
}

const IMG_APP = "Images\\app.png";
const IMG_ON = "Images\\connected.png";
const IMG_OFF = "Images\\disconnected.png";

function notInstalledResult(): FlowResult[] {
  return [
    {
      Title: "WARP not installed",
      SubTitle: "Check path in plugin settings or install Cloudflare WARP for Windows",
      IcoPath: IMG_APP,
      JsonRPCAction: { method: "noop", parameters: [] },
    },
  ];
}

function matchesCmd(query: string, keyword: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const k = keyword.toLowerCase();
  return k.startsWith(q) || q.startsWith(k);
}

/** Queries that should surface the colocation result. */
function matchesColoQuery(q: string): boolean {
  if (!q) return true;
  return (
    matchesCmd(q, "colo") ||
    matchesCmd(q, "colocation") ||
    matchesCmd(q, "location") ||
    matchesCmd(q, "datacenter") ||
    matchesCmd(q, "pop") ||
    matchesCmd(q, "edge") ||
    matchesCmd(q, "where")
  );
}

export async function resolveCommands(
  query: string,
  cliPath: string
): Promise<FlowResult[]> {
  if (!cliExists(cliPath)) return notInstalledResult();

  const q = query.trim().toLowerCase();
  const statusText = getStatus(cliPath);
  const connected = isConnected(statusText);
  const icon = connected ? IMG_ON : IMG_OFF;

  const coloSub = connected
    ? await colocationSubtitle(cliPath)
    : "Not connected — connect WARP to see colocation";

  const buildColo = (): FlowResult => ({
    Title: "WARP colocation",
    SubTitle: coloSub,
    IcoPath: icon,
    JsonRPCAction: { method: "noop", parameters: [] },
  });

  const buildConnect = (): FlowResult => ({
    Title: "Connect to WARP",
    SubTitle: connected ? "Already connected" : "Turn WARP on",
    IcoPath: IMG_OFF,
    JsonRPCAction: { method: "connect", parameters: [] },
  });

  const buildDisconnect = (): FlowResult => ({
    Title: "Disconnect from WARP",
    SubTitle: connected ? "Turn WARP off" : "Already disconnected",
    IcoPath: IMG_ON,
    JsonRPCAction: { method: "disconnect", parameters: [] },
  });

  const all: FlowResult[] = [
    buildConnect(),
    buildDisconnect(),
    buildColo(),
  ];

  if (q === "") return all;

  const out: FlowResult[] = [];
  if (matchesCmd(q, "connect")) out.push(buildConnect());
  if (matchesCmd(q, "disconnect")) out.push(buildDisconnect());
  if (matchesColoQuery(q)) out.push(buildColo());

  if (out.length > 0) return dedupeResults(out);
  return all;
}

function dedupeResults(items: FlowResult[]): FlowResult[] {
  const seen = new Set<string>();
  const out: FlowResult[] = [];
  for (const r of items) {
    const key = `${r.Title}|${r.JsonRPCAction.method}|${JSON.stringify(r.JsonRPCAction.parameters)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
