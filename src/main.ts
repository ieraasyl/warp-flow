import { resolveCommands, type FlowResult } from "./commands";
import { getCliPath, run } from "./warp";

interface JsonRPCRequest {
  method: string;
  parameters: unknown[];
  settings?: Record<string, string | boolean>;
}

function readRequest(): JsonRPCRequest {
  const raw = process.argv[2];
  if (!raw) {
    return { method: "query", parameters: [""] };
  }
  try {
    return JSON.parse(raw) as JsonRPCRequest;
  } catch {
    return { method: "query", parameters: [""] };
  }
}

function executeAction(method: string, cliPath: string): void {
  switch (method) {
    case "noop":
      break;
    case "connect":
      run("connect", cliPath);
      break;
    case "disconnect":
      run("disconnect", cliPath);
      break;
    default:
      break;
  }
}

const request = readRequest();
const cliPath = getCliPath(request.settings);
const method = String(request.method ?? "").toLowerCase();

let results: FlowResult[] = [];

if (method === "query") {
  const query = String(request.parameters[0] ?? "").trim();
  results = resolveCommands(query, cliPath);
} else {
  executeAction(method, cliPath);
}

console.log(JSON.stringify({ result: results }));
