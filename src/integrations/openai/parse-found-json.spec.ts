import { parseFirstFoundJson } from './parse-found-json';

type Parsed = { found: boolean; name?: string; url?: string };

describe('parseFirstFoundJson', () => {
  it('parses a single JSON object as before', () => {
    const result = parseFirstFoundJson<Parsed>('{"found": true, "name": "X", "url": "https://x.com"}');
    expect(result).toEqual({ found: true, name: 'X', url: 'https://x.com' });
  });

  it('returns null when there is no JSON at all', () => {
    expect(parseFirstFoundJson<Parsed>('no se encontró nada')).toBeNull();
  });

  it('picks the first found:true block when the model lists several candidates in separate blocks', () => {
    // Real bug found live: despite being told to answer with exactly one
    // JSON object, the model sometimes lists multiple alternatives, each in
    // its own ```json block. A single greedy regex used to span from the
    // first `{` to the last `}`, making the whole thing fail to parse.
    const text = `
Encontré varias opciones:

\`\`\`json
{"found": true, "name": "Option A", "url": "https://a.com"}
\`\`\`

\`\`\`json
{"found": true, "name": "Option B", "url": "https://b.com"}
\`\`\`
`;
    const result = parseFirstFoundJson<Parsed>(text);
    expect(result).toEqual({ found: true, name: 'Option A', url: 'https://a.com' });
  });

  it('falls back to a found:false block when nothing in the list was found', () => {
    const text = `
\`\`\`json
{"found": false}
\`\`\`
\`\`\`json
{"found": false}
\`\`\`
`;
    const result = parseFirstFoundJson<Parsed>(text);
    expect(result).toEqual({ found: false });
  });

  it('skips a malformed block and still parses a later valid one', () => {
    const text = '```json\n{not valid json}\n```\n```json\n{"found": true, "url": "https://x.com"}\n```';
    const result = parseFirstFoundJson<Parsed>(text);
    expect(result).toEqual({ found: true, url: 'https://x.com' });
  });
});
