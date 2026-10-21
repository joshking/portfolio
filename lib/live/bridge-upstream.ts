import http from "node:http";
import { Readable } from "node:stream";

// ---------------------------------------------------------------------------
// Server-only upstream client for the oracle node's loopback operator API.
//
// PRIVACY BOUNDARY (DESIGN.md §5): the bridge is OFF unless BRIDGE_ENABLED=1
// (server env; set only in the local compose stack). Enabling it exposes the
// node's loopback operator API — including real tweet text — to anyone who
// can reach the landing's port. Acceptable on a loopback-published dev
// stack, never a default. Handlers 404 when disabled.
//
// Transport: raw node:http, NOT global fetch. Node's fetch (undici) silently
// strips a `Host` header override — a fetch probe appears to succeed against
// a lenient server while actually sending the URL's host. The node UI
// enforces a loopback Host (400 "invalid Host header" otherwise), so in the
// compose topology (http://oracle-ui:8398) fetch could never authenticate as
// loopback. http.request carries the override correctly (verified 2026-08).
//
// No request headers are forwarded upstream except the explicit Host
// override + Accept; no auth material exists to leak. Responses pass through
// body-only (content-type aside).
// ---------------------------------------------------------------------------

const HOST_OVERRIDE = "127.0.0.1:8399"; // the loopback identity the node expects
const HEADER_TIMEOUT_MS = 3_000; // header acquisition only — never the body

export function bridgeEnabled(): boolean {
  return process.env.BRIDGE_ENABLED === "1";
}

export function bridgeDisabledResponse(): Response {
  return new Response(null, { status: 404 });
}

export function bridgeDownResponse(): Response {
  return Response.json(
    { bridge: "down" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function upstreamBase(): URL {
  return new URL(process.env.BRIDGE_NODE_UI_URL ?? "http://127.0.0.1:8399");
}

interface UpstreamResponse {
  status: number;
  contentType: string | null;
  body: ReadableStream<Uint8Array>;
}

/**
 * Issue an upstream GET. Resolves once response headers arrive (bounded by a
 * 3s header-acquisition timeout); the body streams through untouched.
 * Aborting `signal` destroys the upstream socket (both directions of
 * cancellation propagate).
 */
export function upstreamGet(
  path: string,
  accept: string,
  signal?: AbortSignal,
): Promise<UpstreamResponse> {
  const base = upstreamBase();
  if (base.protocol !== "http:") {
    // Both supported topologies (compose + host dev) are plain http on a
    // private network; anything else is a misconfiguration, not a fallback.
    return Promise.reject(
      new Error(`unsupported upstream protocol ${base.protocol}`),
    );
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: base.hostname,
        port: base.port || 80,
        path,
        method: "GET",
        headers: { Host: HOST_OVERRIDE, Accept: accept },
      },
      (res) => {
        clearTimeout(headerTimer);
        resolve({
          status: res.statusCode ?? 502,
          contentType: res.headers["content-type"] ?? null,
          body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
        });
      },
    );
    const headerTimer = setTimeout(() => {
      req.destroy(new Error("upstream header timeout"));
    }, HEADER_TIMEOUT_MS);
    if (signal) {
      if (signal.aborted) req.destroy();
      else
        signal.addEventListener("abort", () => req.destroy(), { once: true });
    }
    req.on("error", (err) => {
      clearTimeout(headerTimer);
      reject(err);
    });
    req.end();
  });
}

/** JSON endpoint proxy: body-only passthrough, no-store, 503 within 3s when down. */
export async function proxyJson(path: string): Promise<Response> {
  if (!bridgeEnabled()) return bridgeDisabledResponse();
  try {
    const upstream = await upstreamGet(path, "application/json");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.contentType ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return bridgeDownResponse();
  }
}
