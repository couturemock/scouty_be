import { ConfigService } from '@nestjs/config';
import { SupplierMatchValidatorProvider } from './supplier-match-validator.provider';
import { OpenAiClient } from './openai.client';

function client(opts: { enabled?: boolean; completeJson?: jest.Mock }): OpenAiClient {
  return {
    enabled: jest.fn().mockReturnValue(opts.enabled ?? true),
    completeJson: opts.completeJson ?? jest.fn(),
  } as unknown as OpenAiClient;
}

function config(values: Record<string, string> = {}): ConfigService {
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

const offers = [
  { name: 'Posture Corrector Brace Adjustable', listingUrl: 'a' },
  { name: 'Outdoor Anti-slip Rafting Swimming Shoes', listingUrl: 'b' },
];

describe('SupplierMatchValidatorProvider', () => {
  it('is disabled when the client has no API key', async () => {
    const provider = new SupplierMatchValidatorProvider(client({ enabled: false }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual(offers);
  });

  it('is disabled when AI_SUPPLIER_MATCH_VALIDATION_ENABLED=false', async () => {
    const completeJson = jest.fn();
    const provider = new SupplierMatchValidatorProvider(
      client({ completeJson }),
      config({ AI_SUPPLIER_MATCH_VALIDATION_ENABLED: 'false' }),
    );
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual(offers);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it('returns the input untouched when there are no offers', async () => {
    const completeJson = jest.fn();
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', []);
    expect(result).toEqual([]);
    expect(completeJson).not.toHaveBeenCalled();
  });

  it('drops only the offer the model says is a different product', async () => {
    const completeJson = jest.fn().mockResolvedValue({
      items: [
        { id: 0, same: true },
        { id: 1, same: false, motivo: 'zapatos de natación, no para gatos' },
      ],
    });
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual([offers[0]]);
  });

  it('keeps an offer the model gave no verdict for (never blocks on a partial response)', async () => {
    const completeJson = jest.fn().mockResolvedValue({ items: [{ id: 0, same: true }] });
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual(offers);
  });

  it('keeps every offer when the model call fails (never blocks discovery on an outage)', async () => {
    const completeJson = jest.fn().mockRejectedValue(new Error('network down'));
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual(offers);
  });

  it('keeps every offer when the response has no items at all', async () => {
    const completeJson = jest.fn().mockResolvedValue({});
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    const result = await provider.filterSameProduct('Posture Corrector Brace', offers);
    expect(result).toEqual(offers);
  });

  it('sends aiTags as extra context when provided', async () => {
    // Real bug found live: "THE DAILY" (a dog supplement per its PipiAds
    // tags) got matched to "Silicone Daily Necessitiesr" — same generic
    // word "Daily", nothing else in common — because the bare title gave
    // the model nothing to tell them apart. Tags should reach the prompt.
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    await provider.filterSameProduct('THE DAILY', offers, ['#dogsupplement', '#petmultivitamin']);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload.tags).toEqual(['#dogsupplement', '#petmultivitamin']);
  });

  it('omits tags from the payload when none are given', async () => {
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const provider = new SupplierMatchValidatorProvider(client({ completeJson }), config());
    await provider.filterSameProduct('Posture Corrector Brace', offers);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload.tags).toBeUndefined();
  });
});
