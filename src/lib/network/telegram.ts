/**
 * Telegram DC latency over MTProto.
 *
 * Telegram's web DCs (`wss://<dc>.web.telegram.org/apiws`) reject plain HTTP
 * (403) and a vanilla WebSocket (close 1006). But we can open ONE obfuscated
 * MTProto connection and time repeated `req_pq` round-trips — `req_pq` is the
 * unauthenticated start of the MTProto handshake, so the server answers `resPQ`
 * without any auth key. That gives the real in-connection RTT (like an app-level
 * ping), reusing a single socket instead of reconnecting per sample.
 *
 * We never need to *decrypt* responses — the RTT is send→first-reply. We only
 * encrypt outgoing frames, continuing the obfuscation AES-CTR stream across
 * pings (the browser has no streaming AES-CTR, so `CtrStream` tracks the byte
 * offset and computes the counter per chunk — verified to match a continuous
 * cipher).
 */

import type { ProbeNote } from "@/types";

interface ProbeResult {
  rtt: number | null;
  note: ProbeNote | null;
}

/** MTProto "intermediate" transport tag, written into the obfuscation header. */
const PROTO_INTERMEDIATE = 0xeeeeeeee;
/** First-int32 values the obfuscation header must avoid (look like HTTP, etc.). */
const FORBIDDEN_FIRST = new Set([
  0x44414548, 0x54534f50, 0x20544547, 0x4954504f, 0xeeeeeeee, 0xdddddddd,
]);
/** req_pq_multi TL constructor id. */
const REQ_PQ_MULTI = 0xbe7e8ef1;

/** Random 64-byte MTProto obfuscation header (intermediate protocol). */
function makeObfuscationHeader(): Uint8Array {
  const n = new Uint8Array(64);
  const dv = new DataView(n.buffer);
  for (;;) {
    crypto.getRandomValues(n);
    if (n[0] === 0xef) continue;
    if (FORBIDDEN_FIRST.has(dv.getUint32(0, true))) continue;
    if (dv.getUint32(4, true) === 0) continue;
    dv.setUint32(56, PROTO_INTERMEDIATE, true);
    return n;
  }
}

/** Big-endian 128-bit counter = `iv + blocks`, as 16 bytes. */
function counterAt(iv: Uint8Array, blocks: number): Uint8Array {
  let v = 0n;
  for (const b of iv) v = (v << 8n) | BigInt(b);
  v = (v + BigInt(blocks)) & ((1n << 128n) - 1n);
  const out = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * AES-CTR keystream as a continuous stream over Web Crypto. Each `xor` continues
 * where the last left off: it pads to the current 16-byte block boundary, runs a
 * one-shot encrypt from the right counter, then drops the pad — equivalent to a
 * streaming cipher even across non-block-aligned chunks.
 */
class CtrStream {
  private offset = 0;
  constructor(
    private readonly key: CryptoKey,
    private readonly iv: Uint8Array,
  ) {}
  async xor(data: Uint8Array): Promise<Uint8Array> {
    const blockOffset = this.offset % 16;
    const counter = counterAt(this.iv, Math.floor(this.offset / 16));
    const padded = new Uint8Array(blockOffset + data.length);
    padded.set(data, blockOffset);
    const out = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-CTR", counter: counter as BufferSource, length: 128 },
        this.key,
        padded as BufferSource,
      ),
    );
    this.offset += data.length;
    return out.subarray(blockOffset);
  }
}

/** A `req_pq_multi` wrapped in an unauthenticated MTProto + intermediate frame. */
function buildReqPqFrame(): Uint8Array {
  const body = new Uint8Array(20); // constructor(4) + nonce(16)
  const bdv = new DataView(body.buffer);
  bdv.setUint32(0, REQ_PQ_MULTI, true);
  crypto.getRandomValues(body.subarray(4));

  const msg = new Uint8Array(8 + 8 + 4 + body.length); // auth_key_id + msg_id + len + body
  const mdv = new DataView(msg.buffer);
  // auth_key_id = 0 (unauthenticated) — leave the first 8 bytes zero.
  mdv.setBigUint64(8, BigInt(Math.floor(Date.now() / 1000)) << 32n, true); // msg_id
  mdv.setUint32(16, body.length, true);
  msg.set(body, 20);

  const frame = new Uint8Array(4 + msg.length); // intermediate: LE length prefix
  new DataView(frame.buffer).setUint32(0, msg.length, true);
  frame.set(msg, 4);
  return frame;
}

/** Open the obfuscated WS and resolve once connected (rejects on error/abort). */
function openSocket(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // apiws rejects a vanilla socket (close 1006); it needs the `binary` subprotocol.
    const ws = new WebSocket(url, "binary");
    ws.binaryType = "arraybuffer";
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const fail = () => {
      cleanup();
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error("ws"));
    };
    const timer = setTimeout(fail, timeoutMs);
    const onAbort = () => fail();
    signal?.addEventListener("abort", onAbort, { once: true });
    ws.onopen = () => {
      cleanup();
      resolve(ws);
    };
    ws.onerror = fail;
  });
}

/** Send one pre-encrypted req_pq frame and time the reply (RTT). */
function pingOnce(
  ws: WebSocket,
  frame: Uint8Array,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const start = performance.now();
    const finish = (rtt: number | null, note: ProbeNote | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      ws.onmessage = null;
      resolve({ rtt, note });
    };
    const timer = setTimeout(() => finish(null, { reason: "超时" }), timeoutMs);
    const onAbort = () => finish(null, { reason: "请求失败" });
    signal?.addEventListener("abort", onAbort, { once: true });
    ws.onmessage = () => finish(performance.now() - start, null);
    ws.onerror = () => finish(null, { reason: "请求失败" });
    try {
      ws.send(frame);
    } catch {
      finish(null, { reason: "请求失败" });
    }
  });
}

export interface TelegramRttOptions {
  count: number;
  timeoutMs: number;
  onSample?: (rtt: number | null, note: ProbeNote | null, index: number) => void;
  signal?: AbortSignal;
}

/**
 * Measure `count` in-connection RTT samples to a Telegram DC over a single
 * reused MTProto connection. Returns aligned `samples`/`notes` arrays (a lost
 * sample is `null`); a connection that never opens reports all samples lost.
 */
export async function measureTelegramRtt(
  url: string,
  { count, timeoutMs, onSample, signal }: TelegramRttOptions,
): Promise<{ samples: (number | null)[]; notes: (ProbeNote | null)[] }> {
  const samples: (number | null)[] = [];
  const notes: (ProbeNote | null)[] = [];
  const push = (r: ProbeResult, i: number) => {
    samples.push(r.rtt);
    notes.push(r.note);
    onSample?.(r.rtt, r.note, i);
  };

  if (typeof WebSocket === "undefined" || !crypto.subtle) {
    for (let i = 0; i < count; i++) push({ rtt: null, note: { reason: "请求失败" } }, i);
    return { samples, notes };
  }

  let ws: WebSocket | null = null;
  try {
    ws = await openSocket(url, timeoutMs, signal);

    // Obfuscation handshake: derive the AES-CTR stream from the header, send
    // `header[0..56] + encrypted[56..64]`, then continue the stream for pings.
    const header = makeObfuscationHeader();
    const key = await crypto.subtle.importKey(
      "raw",
      header.slice(8, 40),
      { name: "AES-CTR" },
      false,
      ["encrypt"],
    );
    const enc = new CtrStream(key, header.slice(40, 56));
    const encHeader = await enc.xor(header);
    const frame = new Uint8Array(64);
    frame.set(header.subarray(0, 56));
    frame.set(encHeader.subarray(56, 64), 56);
    ws.send(frame);

    for (let i = 0; i < count; i++) {
      if (signal?.aborted) break;
      const packet = await enc.xor(buildReqPqFrame());
      push(await pingOnce(ws, packet, timeoutMs, signal), i);
    }
  } catch {
    /* connection failed — fall through and pad the rest as lost */
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  }

  while (samples.length < count) {
    push({ rtt: null, note: { reason: "请求失败" } }, samples.length);
  }
  return { samples, notes };
}