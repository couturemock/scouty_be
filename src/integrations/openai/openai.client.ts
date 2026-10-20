import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/** Bare `fetch` client (no SDK), same style as `pipiads.client.ts`. */
@Injectable()
export class OpenAiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
    this.baseUrl = (this.config.get<string>('OPENAI_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.model = this.config.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL;
  }

  enabled() {
    return Boolean(this.apiKey);
  }

  /** Chat Completions with a forced JSON object response. */
  async completeJson<T = unknown>(input: {
    system: string;
    user: string;
    maxOutputTokens?: number;
  }): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: input.maxOutputTokens ?? 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI: respuesta sin contenido');

    try {
      return JSON.parse(content) as T;
    } catch (err) {
      throw new Error(`OpenAI: JSON inválido (${err})`);
    }
  }
}
