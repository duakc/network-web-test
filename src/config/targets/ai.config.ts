import { iconFor } from "@/lib/network/site";
import { cloudflarePop } from "@/config/cdn-probes";
import type { NetworkTarget } from "@/types";

export const AI_TARGETS: NetworkTarget[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: iconFor("openai.com"),
    // Cloudflare-fronted — the trace endpoint gives both latency + PoP.
    latencyUrl: "https://openai.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["AI"],
    cdn: { popBody: true, popInfo: cloudflarePop },
    builtIn: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: iconFor("deepseek.com"),
    latencyUrl: "https://www.deepseek.com",
    tags: ["AI", "CN"],
    builtIn: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: iconFor("gemini.google.com"),
    // The Gemini app 403s favicon/root cross-origin; generate_204 is a clean 204.
    latencyUrl: "https://gemini.google.com/generate_204",
    latency: { method: "GET" },
    tags: ["AI", "Google"],
    builtIn: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: iconFor("perplexity.ai"),
    latencyUrl: "https://www.perplexity.ai/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["AI"],
    builtIn: true,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    icon: iconFor("huggingface.co"),
    latencyUrl: "https://huggingface.co/",
    tags: ["AI", "Dev"],
    builtIn: true,
  },
];
