import type { Env } from "./env";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowList = env.CORS_ORIGINS.split(",").map((s) => s.trim());
  const allowed = allowList.includes(origin) ? origin : allowList[0] ?? "*";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-proofhold-sig",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);

    let response: Response;
    try {
      response = await route(req, env, url);
    } catch (err) {
      console.error("[ProofHold] unhandled:", err);
      response = json(
        { error: { type: "internal", message: errorMessage(err) } },
        { status: 500 }
      );
    }

    // Merge CORS into whatever response we got.
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log("[ProofHold] cron: watcher tick (not yet implemented)");
  },
};

async function route(req: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === "/health") {
    return json({
      ok: true,
      network: env.NIMIQ_NETWORK,
      now: new Date().toISOString(),
    });
  }

  if (url.pathname === "/config") {
    // Public config the frontend can read without auth.
    return json({
      nimiq: {
        network: env.NIMIQ_NETWORK,
        custodyAddress: env.PROOFHOLD_CUSTODY_NIM_ADDR,
      },
      evm: {
        chainId: Number(env.EVM_CHAIN_ID),
        usdtContract: env.USDT_CONTRACT_ADDR,
        usdtDecimals: Number(env.USDT_DECIMALS),
        custodyAddress: env.PROOFHOLD_CUSTODY_EVM_ADDR,
      },
    });
  }

  return json(
    { error: { type: "not_found", message: `No route: ${req.method} ${url.pathname}` } },
    { status: 404 }
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "unknown error";
  }
}
