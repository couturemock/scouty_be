import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
// $10/1k web_search tool calls either way (OpenAI's rate, same for every
// model) — the model only changes the content/output token cost, and
// gpt-4o-mini's is ~16x cheaper than gpt-4o's for the same search. This is a
// cheap lookup/verification task, not a reasoning one, so mini is enough.
const DEFAULT_WEB_SEARCH_MODEL = 'gpt-4o-mini';

export type WebSearchResult = {
  text: string;
  /** Only URLs the model actually retrieved via the web_search tool — never a URL it merely typed. */
  citations: Array<{ url: string; title?: string }>;
};

/**
 * Compares URLs ignoring `utm_*` tracking params OpenAI appends to search
 * results (`?utm_source=openai`) — confirmed live: the model's JSON answer
 * omits that param even when it's citing a URL straight out of its own
 * search results, so a raw string `===` call it a non-match.
 */
export function sameUrl(a: string, b: string): boolean {
  const normalize = (url: string) => {
    try {
      const u = new URL(url);
      [...u.searchParams.keys()]
        .filter((k) => k.toLowerCase().startsWith('utm_'))
        .forEach((k) => u.searchParams.delete(k));
      return u.toString().replace(/\?$/, '').replace(/\/$/, '');
    } catch {
      return url;
    }
  };
  return normalize(a) === normalize(b);
}

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

  /**
   * Found live: a stalled OpenAI request with no timeout hangs the `await`
   * forever — no error, no progress, the whole ingestion job frozen. Every
   * request below carries this so a stall degrades to a normal
   * catch-and-continue failure (every caller already treats a thrown error
   * this way) instead of blocking the worker indefinitely. `searchWeb` gets
   * a longer budget since a real `web_search` tool call takes longer than a
   * plain chat completion.
   */
  private timeoutMs(key: string, fallback: number) {
    const n = Number(this.config.get(key) ?? fallback);
    return Number.isFinite(n) && n > 0 ? n : fallback;
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
      signal: AbortSignal.timeout(this.timeoutMs('OPENAI_TIMEOUT_MS', 20_000)),
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

  /**
   * Responses API with the real `web_search` tool: the model actually
   * searches the web, and any `url_citation` annotation it returns points to
   * a page it really retrieved — that's what makes a result "real" and not
   * a hallucination. Callers must only trust `citations`, never a URL the
   * model might also mention in `text`.
   */
  async searchWeb(input: {
    instructions: string;
    query: string;
    model?: string;
    contextSize?: 'low' | 'medium' | 'high';
  }): Promise<WebSearchResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    const model =
      input.model ?? this.config.get<string>('OPENAI_WEB_SEARCH_MODEL') ?? DEFAULT_WEB_SEARCH_MODEL;
    const contextSize =
      input.contextSize ??
      (this.config.get<string>('OPENAI_WEB_SEARCH_CONTEXT_SIZE') as 'low' | 'medium' | 'high' | undefined) ??
      'low';

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: input.instructions,
        input: input.query,
        tools: [{ type: 'web_search', search_context_size: contextSize }],
        // Without this, the model can just answer from its own training data
        // and skip the tool entirely — confirmed live: it sometimes did a
        // real search, then answered a DIFFERENT question from memory with a
        // plausible-looking but uncited URL. `required` forces at least one
        // real web_search call before it's allowed to respond at all.
        tool_choice: 'required',
        // Inline `url_citation` annotations only cover the handful of URLs
        // the model chose to cite in prose — confirmed live: a real search
        // with real results can still come back with zero annotations when
        // the model answers in JSON instead of cited prose. `sources` is the
        // full list of URLs the tool actually retrieved, which is what we
        // actually want to check a claimed URL against.
        include: ['web_search_call.action.sources'],
      }),
      signal: AbortSignal.timeout(this.timeoutMs('OPENAI_WEB_SEARCH_TIMEOUT_MS', 45_000)),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as {
      output?: Array<{
        type: string;
        content?: Array<{
          type: string;
          text?: string;
          annotations?: Array<{ type: string; url?: string; title?: string }>;
        }>;
        action?: { sources?: Array<{ type: string; url?: string }> };
      }>;
    };

    const message = result.output?.find((item) => item.type === 'message');
    const part = message?.content?.find((c) => c.type === 'output_text');
    const text = part?.text ?? '';

    const annotationCitations = (part?.annotations ?? [])
      .filter((a) => a.type === 'url_citation' && a.url)
      .map((a) => ({ url: a.url!, title: a.title }));
    const sourceCitations = (result.output ?? [])
      .filter((item) => item.type === 'web_search_call')
      .flatMap((item) => item.action?.sources ?? [])
      .filter((s) => s.type === 'url' && s.url)
      .map((s) => ({ url: s.url! }));
    const seen = new Set<string>();
    const citations = [...annotationCitations, ...sourceCitations].filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    return { text, citations };
  }
}
