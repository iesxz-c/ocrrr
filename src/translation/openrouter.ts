async function getSettings(): Promise<{ apiKey: string; model: string }> {
  const result = await browser.storage.local.get(['openrouter_api_key', 'openrouter_model']);
  return {
    apiKey: (result.openrouter_api_key as string) ?? '',
    model: (result.openrouter_model as string) ?? 'openrouter/free',
  };
}

const SYSTEM_PROMPT =
  'You are translating dialogue from a webtoon/manhwa. Preserve tone, character voice, slang, and implied meaning — this is not literal dictionary translation. Return ONLY a JSON array of translated strings, same length and order as the input array, no other text.';

function parseTranslationResponse(content: string, expectedLength: number): string[] {
  console.log('[manhwa-translator] raw response text:', content);

  let cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const match = cleaned.match(/\[[\s\S]*?\]/);
  if (!match) {
    throw new Error(`No JSON array found in translation response: ${content.slice(0, 200)}`);
  }

  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('Translation response is not an array');
  }
  if (parsed.length !== expectedLength) {
    console.warn(
      `[manhwa-translator] expected ${expectedLength} translations, got ${parsed.length}`,
    );
  }
  return parsed.map((item) => String(item));
}

export async function translateViaOpenRouter(
  groupedText: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error('OpenRouter API key not set in storage');

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Source language: ${sourceLang}\nTarget language: ${targetLang}\n\n${JSON.stringify(groupedText)}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenRouter API error: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content ?? '';
  return parseTranslationResponse(content, groupedText.length);
}
