import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * Telegram data centres (pluto/venus/aurora/vesta/flora = DC1–5). HTTP probes 403
 * here, so we measure the DC's WebSocket endpoint instead — the probe layer
 * dispatches on the wss:// scheme and times the handshake.
 */
export const TELEGRAM_TARGETS: NetworkTarget[] = (
  [
    ["1", "pluto"],
    ["2", "venus"],
    ["3", "aurora"],
    ["4", "vesta"],
    ["5", "flora"],
  ] as const
).map<NetworkTarget>(([dc, host]) => ({
  id: `tg-dc${dc}`,
  name: `Telegram DC${dc}`,
  icon: iconFor("telegram.org"),
  latencyUrl: `wss://${host}.web.telegram.org/apiws`,
  tags: ["Telegram", "Social"],
  builtIn: true,
}));
