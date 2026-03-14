import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logAdminEvent } from "@/lib/admin/events";

export type AIProvider = "openai" | "anthropic";

interface CompletionOptions {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

interface CompletionResult {
  text: string;
  provider: AIProvider;
  model: string;
  durationMs: number;
}

// --- OpenAI ---

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// --- Anthropic ---

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// --- Unified completion ---

export async function completion(opts: CompletionOptions): Promise<CompletionResult> {
  const startTime = Date.now();

  if (opts.provider === "openai") {
    const model = "gpt-4o-mini";
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userMessage },
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    const durationMs = Date.now() - startTime;
    logAdminEvent("api_call", { service: "openai", model, endpoint: "chat.completions", durationMs });
    return { text, provider: "openai", model, durationMs };
  }

  // Anthropic
  const model = "claude-sonnet-4-20250514";
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2000,
    messages: [
      { role: "user", content: opts.systemPrompt + "\n\n" + opts.userMessage },
    ],
  });
  const content = message.content[0];
  const text = content.type === "text" ? content.text : "";
  const durationMs = Date.now() - startTime;
  logAdminEvent("api_call", { service: "anthropic", model, endpoint: "messages", durationMs });
  return { text, provider: "anthropic", model, durationMs };
}

/**
 * Get the preferred AI provider based on env config.
 * Defaults to "openai" for cost efficiency; set AI_PROVIDER=anthropic to override.
 */
export function getDefaultProvider(): AIProvider {
  const env = process.env.AI_PROVIDER?.toLowerCase();
  if (env === "anthropic") return "anthropic";
  return "openai";
}
