/**
 * WebWaka Production Suite — Vendor-Neutral AI Abstraction
 * Blueprint Reference: Part 7.1 — AI Integration Strategy
 *
 * Invariant 7: Vendor Neutral AI
 * ALL AI calls go through OpenRouter. NEVER import from openai, anthropic,
 * google-generativeai, or any other provider SDK directly.
 * This ensures the platform can switch AI providers without code changes.
 *
 * OpenRouter provides a unified API compatible with the OpenAI SDK format.
 * Models available: GPT-4.1, Claude 3.5, Gemini 2.5, Llama 3, etc.
 */

// ─── AI Request/Response Types ────────────────────────────────────────────────
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string; // Defaults to a cost-effective model via OpenRouter
  maxTokens?: number;
  temperature?: number;
  stream?: false; // Streaming not supported in Workers without special handling
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Production-Specific AI Use Cases ────────────────────────────────────────
export type ProductionAIUseCase =
  | 'production_schedule_optimization'
  | 'quality_defect_analysis'
  | 'bom_suggestions'
  | 'demand_forecasting'
  | 'maintenance_prediction';

// ─── OpenRouter Client ────────────────────────────────────────────────────────
/**
 * Vendor-neutral AI client using OpenRouter.
 * Blueprint Reference: Part 7.1.1 — OpenRouter Integration
 */
export class AIClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  // Default model: cost-effective for production management use cases
  private readonly defaultModel = 'meta-llama/llama-3.1-8b-instruct:free';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a chat completion request via OpenRouter.
   * Invariant 7: Vendor Neutral AI — NEVER call provider APIs directly.
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    // TODO (Replit Agent): Implement full OpenRouter API call
    // Reference: https://openrouter.ai/docs/requests
    throw new Error(
      'AIClient.chat() — stub not yet implemented. ' +
      'Replit Agent: implement using fetch() to POST to https://openrouter.ai/api/v1/chat/completions'
    );
  }

  /**
   * Analyze production data and suggest schedule optimizations.
   * Use case: PROD-AI-1 — Production Schedule Optimization
   */
  async optimizeProductionSchedule(
    orders: Array<{ id: string; productName: string; quantity: number; deadline: string }>
  ): Promise<string> {
    return this.chat({
      messages: [
        {
          role: 'system',
          content:
            'You are a production scheduling expert for Nigerian manufacturing companies. ' +
            'Optimize production schedules to minimize waste and meet deadlines. ' +
            'Consider Nigerian public holidays and typical supply chain delays.',
        },
        {
          role: 'user',
          content: `Optimize the following production orders: ${JSON.stringify(orders)}`,
        },
      ],
    }).then((r) => r.content);
  }
}
