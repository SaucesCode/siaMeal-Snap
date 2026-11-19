import { fetch as streamingFetch } from 'expo/fetch';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';

import type { AnalyzeMealResponse } from '../types';
export type { AnalyzeMealResponse };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface UserNutritionContext {
  displayName?: string;
  goal?: string;
  dietType?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFat?: number;
  remainingCalories?: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
  todayMeals?: string[];
}

/**
 * Compresses an image to max 512px dimension using WebP (30% smaller payload)
 * with graceful JPEG fallback, returning { uri, base64, mimeType }.
 */
export async function compressImage(
  uri: string
): Promise<{ uri: string; base64: string; mimeType: string }> {
  try {
    // Attempt modern WebP format first (30% smaller bandwidth, faster network upload)
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.WEBP, base64: true }
    );
    return {
      uri: manipResult.uri,
      base64: manipResult.base64 ? `data:image/webp;base64,${manipResult.base64}` : '',
      mimeType: 'image/webp',
    };
  } catch (webpErr) {
    console.warn('WebP compression fallback to JPEG:', webpErr);
    try {
      const fallbackResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return {
        uri: fallbackResult.uri,
        base64: fallbackResult.base64 ? `data:image/jpeg;base64,${fallbackResult.base64}` : '',
        mimeType: 'image/jpeg',
      };
    } catch (jpegErr) {
      console.error('Error compressing image:', jpegErr);
      throw new Error('Failed to process meal image. Please try again.');
    }
  }
}

/** The photo or description isn't food. An expected outcome, shown to the user as Sia being puzzled. */
export class NotFoodError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'NotFoodError';
  }
}

const NOT_FOOD_DEFAULT = "Sia inspected your scan, but that doesn't look like edible food. Try snapping your meal or drink.";

/**
 * Turns a supabase-js Edge Function error into the error the UI should show: NotFoodError for a
 * non-food result (HTTP 422 / is_food: false), otherwise an Error with the server's message.
 */
async function toAnalysisError(error: any): Promise<Error> {
  let body: any = null;
  const response = error?.context;
  if (response && typeof response.json === 'function') {
    body = await response.json().catch(() => null);
  }
  if (response?.status === 422 || body?.is_food === false) {
    return new NotFoodError(body?.non_food_reason || body?.error || NOT_FOOD_DEFAULT);
  }
  return new Error(body?.error || body?.message || error?.message || 'Could not analyze that meal. Please try again.');
}

import { aiCircuitBreaker } from '../lib/circuitBreaker';

/**
 * Sends compressed base64 image to Supabase Edge Function 'analyze-meal'.
 * Strict food verification ensures non-food scans (laptops, pets, gadgets) are rejected
 * rather than mocked with hallucinated ingredients.
 */
export async function analyzeMealPhoto(imageBase64: string): Promise<AnalyzeMealResponse> {
  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: { imageBase64 },
  });

  if (error) throw await toAnalysisError(error);
  if (data && data.is_food === false) throw new NotFoodError(data.non_food_reason || NOT_FOOD_DEFAULT);

  return {
    ...data,
    fiber_g: data.fiber_g != null ? Number(data.fiber_g) : 0,
    sugar_g: data.sugar_g != null ? Number(data.sugar_g) : 0,
    sodium_mg: data.sodium_mg != null ? Number(data.sodium_mg) : 0,
    potassium_mg: data.potassium_mg != null ? Number(data.potassium_mg) : 0,
  } as AnalyzeMealResponse;
}

/**
 * Sends a text meal description to Supabase Edge Function 'analyze-meal'
 * with circuit breaker protection. Failures surface to the caller so the user
 * never logs invented macros.
 */
export async function analyzeMealText(textDescription: string): Promise<AnalyzeMealResponse> {
  return aiCircuitBreaker.execute(async () => {
    const { data, error } = await supabase.functions.invoke('analyze-meal', {
      body: { textDescription },
    });

    if (error) throw await toAnalysisError(error);
    if (data && data.is_food === false) throw new NotFoodError(data.non_food_reason || NOT_FOOD_DEFAULT);

    return {
      ...data,
      fiber_g: data.fiber_g != null ? Number(data.fiber_g) : 0,
      sugar_g: data.sugar_g != null ? Number(data.sugar_g) : 0,
      sodium_mg: data.sodium_mg != null ? Number(data.sodium_mg) : 0,
      potassium_mg: data.potassium_mg != null ? Number(data.potassium_mg) : 0,
    } as AnalyzeMealResponse;
  });
}

/**
 * Aggressively sanitizes AI Coach responses on the client side,
 * completely stripping any echoed metadata, telemetry dumps, thoughts,
 * role prefixes, and emojis.
 */
export function cleanCoachReply(
  raw: string,
  fallback = 'I am ready to help with your meals and daily macronutrient targets.'
): string {
  if (!raw) return '';
  let text = raw.trim();

  // 1. Remove XML/HTML style thought / reasoning tags
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

  // 2. If response was split by a template marker, extract text after the last marker
  const responseMarkers = [
    /Direct Spoken Response(?: from Sia)?\s*:/i,
    /Direct Response(?: from Sia)?\s*:/i,
    /Response from Sia\s*:/i,
    /Sia's Response\s*:/i,
    /Spoken Response\s*:/i,
  ];

  for (const marker of responseMarkers) {
    if (marker.test(text)) {
      const parts = text.split(marker);
      const after = parts[parts.length - 1]?.trim();
      if (after && after.length > 0) {
        text = after;
        break;
      }
    }
  }

  // 3. Remove metadata / telemetry lines (prefixed with bullets -, *, numbers, or bold **Label:**)
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let skippingHeaderBlock = true;

  const metadataPattern = /^(?:[-*•#>|]+\s*)?(?:\*\*)?(?:User(?:\s*Name|\s*Message|\s*Profile|\s*Goal)?|Athlete(?:\s*Name|\s*Message|\s*Stats|\s*Goal)?|Fitness\s*Objective|Diet\s*Style|Diet\s*Type|Daily\s*Calorie\s*Target|Protein\s*Target|Carbs\s*Target|Fat\s*Target|Meals\s*Logged\s*Today|Tone(?:\s*Summary)?|Persona|Thinking\s*Process|Reasoning|Internal\s*Context|Current\s*Status|Telemetry|Objective|Scope|Context|Direct\s*Spoken\s*Response|Response|Output|Sia)(?:\*\*)?\s*[:#-]/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!skippingHeaderBlock) {
        cleanedLines.push('');
      }
      continue;
    }

    // Check if line is a metadata header line
    if (metadataPattern.test(trimmed)) {
      continue;
    }

    // Check if line is a section title like "ATHLETE'S CURRENT STATS" or markdown headers
    if (/^(?:#{1,6}\s*(?:ATHLETE|INTERNAL CONTEXT|OUTPUT RULES|CONVERSATIONAL|TELEMETRY|LIVE STATS|SIA|RESPONSE|ADVICE))/i.test(trimmed)) {
      continue;
    }
    if (/^(?:ATHLETE['’]?S\s*CURRENT\s*STATS|INTERNAL\s*CONTEXT|OUTPUT\s*RULES|CONVERSATIONAL\s*DYNAMICS|LIVE\s*USER\s*TELEMETRY|CURRENT\s*STATUS)/i.test(trimmed)) {
      continue;
    }

    // First real conversational line found
    skippingHeaderBlock = false;
    cleanedLines.push(line);
  }

  text = cleanedLines.join('\n').trim();

  // 4. Strip any leading role prefixes like "Sia:" or "Assistant:" or markdown headers
  text = text.replace(/^(?:#{1,6}\s*)?(?:Sia\s*\([^)]*\)|Sia|Assistant|Coach|Model)\s*:\s*/i, '').trim();

  // 5. Remove any unicode emojis
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();

  return text || fallback;
}

const NEWLINE_BYTE = 10;

/**
 * Yields one parsed JSON object per line of an NDJSON byte stream. Lines are split on raw
 * bytes: a newline byte never occurs inside a multi-byte UTF-8 sequence, so every complete
 * line decodes safely without a streaming decoder.
 */
async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = new Uint8Array(0);
  while (true) {
    const { value, done } = await reader.read();
    if (value && value.length > 0) {
      const merged = new Uint8Array(pending.length + value.length);
      merged.set(pending);
      merged.set(value, pending.length);
      pending = merged;
    }
    let newline: number;
    while ((newline = pending.indexOf(NEWLINE_BYTE)) !== -1) {
      const line = decoder.decode(pending.subarray(0, newline)).trim();
      pending = pending.slice(newline + 1);
      if (line) yield JSON.parse(line);
    }
    if (done) return;
  }
}

/**
 * Sends the conversation and live nutrition context to the coach and streams the reply.
 * `onText` receives the cleaned reply-so-far each time new words arrive; the promise
 * resolves with the final cleaned reply. Server errors (sign-in, hourly limit, outage)
 * are thrown with their user-facing message.
 */
export async function streamNutritionCoachMessage(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  userContext: UserNutritionContext,
  onText: (textSoFar: string) => void
): Promise<string> {
  return aiCircuitBreaker.execute(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again to chat with Sia.');

    const res = await streamingFetch(`${SUPABASE_URL}/functions/v1/analyze-meal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'chat', stream: true, messages, userContext }),
    });

    // Errors, and instant replies such as the off-topic guardrail, come back as plain JSON.
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
    if (!res.ok || isJson || !res.body) {
      const body = (await res.json().catch(() => null)) as { reply?: string; error?: string } | null;
      if (!res.ok || !body?.reply) {
        throw new Error(body?.error || "Sia couldn't reach the AI coach right now. Please try again.");
      }
      const reply = cleanCoachReply(body.reply);
      onText(reply);
      return reply;
    }

    let raw = '';
    for await (const line of readNdjson(res.body)) {
      if (typeof line.delta === 'string') {
        raw += line.delta;
        const visible = cleanCoachReply(raw, '');
        if (visible) onText(visible);
      } else if (typeof line.error === 'string') {
        // Keep whatever Sia already said; only fail if nothing arrived.
        if (!raw) throw new Error(line.error);
        console.warn('Coach stream ended early:', line.error);
        break;
      }
    }
    if (!raw) throw new Error("Sia couldn't reach the AI coach right now. Please try again.");
    return cleanCoachReply(raw);
  });
}
