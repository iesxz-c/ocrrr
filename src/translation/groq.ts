async function getSettings(): Promise<{ apiKey: string; model: string }> {
  const result = await browser.storage.local.get(['groq_api_key', 'groq_model']);
  return {
    apiKey: (result.groq_api_key as string) ?? '',
    model: (result.groq_model as string) ?? 'llama-3.3-70b-versatile',
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

export async function translateViaGroq(
  groupedText: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error('Groq API key not set in storage');

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const resp = await fetch(url, {
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
    const body = await resp.text();
    console.error(`[manhwa-translator] Groq request failed:`, { url, status: resp.status, body });
    throw new Error(`Groq API error: ${resp.status} — ${body.slice(0, 300)}`);
  }

  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content ?? '';
  return parseTranslationResponse(content, groupedText.length);
}
