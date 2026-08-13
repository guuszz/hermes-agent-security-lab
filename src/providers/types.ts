export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number;
  readonly totalTokens: number;
}

export interface ProviderResult {
  readonly content: string;
  readonly requestedModel: string;
  readonly resolvedModel: string;
  readonly usage: TokenUsage;
  readonly latencyMs: number;
  readonly estimatedCostUsd: number;
  readonly requestId?: string;
}

export interface GenerateOptions {
  readonly estimatedInputTokens: number;
  readonly signal?: AbortSignal;
}

export interface TextProvider {
  generate(
    messages: readonly ChatMessage[],
    options: GenerateOptions,
  ): Promise<ProviderResult>;
}
