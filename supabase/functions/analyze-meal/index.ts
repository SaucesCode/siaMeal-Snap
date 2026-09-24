import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestPayload {
  mode?: "analyze" | "chat";
  // Meal analysis params
  imageBase64?: string;
  textDescription?: string;
  // Chat Coach params
  messages?: Message[];
  userContext?: {
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
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY HELPERS (1M CONCURRENCY & RESILIENCE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch wrapper with AbortController timeout to prevent stuck connections
 * from holding open Edge Function worker slots during upstream latency spikes.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Parses comma-separated API keys to allow key rotation and pool balancing.
 */
function getApiKeys(envName: string): string[] {
  const raw = Deno.env.get(envName) || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * In-memory model discovery cache.
 * Avoids making an external HTTP GET to Google's /models endpoint on EVERY request,
 * which causes 429 quota exhaustion and adds 400ms unnecessary latency per call.
 */
let cachedGeminiModels: { models: string[]; timestamp: number } | null = null;
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getCandidateGeminiModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGeminiModels && (now - cachedGeminiModels.timestamp) < MODEL_CACHE_TTL_MS) {
    return cachedGeminiModels.models;
  }

  const defaultModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  try {
    const listResp = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
      {},
      4000
    );

    if (listResp.ok) {
      const listData = await listResp.json();
      const discovered = (listData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""))
        .filter((name: string) => /flash|pro/.test(name));

      if (discovered.length > 0) {
        discovered.sort((a: string, b: string) => {
          const aFlash = a.includes("flash");
          const bFlash = b.includes("flash");
          if (aFlash && !bFlash) return -1;
          if (!aFlash && bFlash) return 1;
          return b.localeCompare(a);
        });

        cachedGeminiModels = { models: discovered, timestamp: now };
        return discovered;
      }
    }
  } catch (e: any) {
    console.warn("Gemini model discovery cached fallback:", e.message);
  }

  // Cache defaults for 15 minutes to prevent hammering on network failure
  cachedGeminiModels = { models: defaultModels, timestamp: now - MODEL_CACHE_TTL_MS + (15 * 60 * 1000) };
  return defaultModels;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP SERVER HANDLER
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKeys = getApiKeys("GEMINI_API_KEY");
    const openAiKeys = getApiKeys("OPENAI_API_KEY");

    if (geminiKeys.length === 0 && openAiKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "Neither GEMINI_API_KEY nor OPENAI_API_KEY secret is configured in Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestPayload = await req.json().catch(() => ({}));

    // =========================================================================
    // HANDLER 1: AI NUTRITION COACH (CHAT MODE)
    // =========================================================================
    if (body.mode === "chat" || (body.messages && body.messages.length > 0)) {
      const messages = body.messages || [];
      const userContext = body.userContext;

      if (messages.length === 0) {
        return new Response(
          JSON.stringify({ error: "Messages array must not be empty." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Zero-Token Guardrail (Instant refusal for off-topic or prompt injection) ──
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";
      const offTopicPattern = /(?:write (?:a )?(?:code|python|javascript|script|essay|poem|story)|solve (?:math|equation)|who (?:was|is) (?:president|king|queen|actor)|ignore (?:all )?(?:previous )?instructions|system prompt|jailbreak|DAN mode|translate to|write an exploit)/i;

      if (offTopicPattern.test(lastUserMsg)) {
        return new Response(
          JSON.stringify({
            reply: "My paws are strictly tuned for macros, meals, and sports nutrition! Let's get back to fueling your day — what are you planning to eat next?",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Sliding Window: Take only the 4 most recent messages to keep tokens lean ──
      const recentMessages = messages.slice(-4);

      // ── Compact Context block injected into every request ──────────────────────
      let contextBlock = "No athlete profile provided.";
      if (userContext) {
        const uc = userContext;
        const mealsStr = uc.todayMeals?.length
          ? uc.todayMeals.slice(-4).join(", ")
          : "Nothing logged yet";

        contextBlock = [
          `ATHLETE: ${uc.displayName || "Athlete"} | GOAL: ${uc.goal || "Fat Loss"} | DIET: ${uc.dietType || "Balanced"}`,
          `TARGETS TODAY: ${uc.targetCalories ?? "?"}kcal | ${uc.targetProtein ?? "?"}g Protein | ${uc.targetCarbs ?? "?"}g Carbs | ${uc.targetFat ?? "?"}g Fat`,
          `CONSUMED    : ${uc.consumedCalories ?? 0}kcal | ${uc.consumedProtein ?? 0}g Protein | ${uc.consumedCarbs ?? 0}g Carbs | ${uc.consumedFat ?? 0}g Fat`,
          `REMAINING   : ${uc.remainingCalories ?? uc.targetCalories ?? "?"}kcal | ${uc.remainingProtein ?? uc.targetProtein ?? "?"}g Protein | ${uc.remainingCarbs ?? uc.targetCarbs ?? "?"}g Carbs | ${uc.remainingFat ?? uc.targetFat ?? "?"}g Fat`,
          `TODAY'S LOG : ${mealsStr}`,
        ].join("\n");
      }

      const coachSystemPrompt = `You are Sia — a warm, encouraging, and witty Siamese cat nutrition coach inside the SiaMeal app.
You combine the scientific knowledge of a certified sports dietitian with the relatable, caring energy of a personal friend in the athlete's corner (with charming, subtle feline personality!).

━━ ATHLETE'S LIVE TELEMETRY ━━
${contextBlock}

━━ YOUR PERSONA & VOICE ━━
- Speak like a friendly, supportive coach texting an athlete — conversational, authentic, empathetic, and never robotic.
- Naturally weave in charming Siamese cat personality (e.g., purring when protein goals are hit, playfully urging them to pounce on their remaining calories, keen feline curiosity about tasty wholesome foods), but keep it natural and grounded in real nutrition.
- Celebrate their daily wins warmly. If they overate or missed protein, be supportive, zero-judgment, and give them an easy, realistic next step.
- Keep responses punchy and focused: 2–4 natural sentences for advice, or 2–3 appetizing options when asked for meal suggestions.
- Always sound like a real person, not an AI template. No robotic filler ("As an AI...", "According to guidelines...").

━━ FORMATTING & BOLDING (CRITICAL) ━━
- ALWAYS bold key numerical metrics, quantities, and targets so they stand out immediately on the athlete's screen:
  • Specific grams & calories: e.g., **45g protein**, **520 kcal**, **35g carbs**, **14g fat**, **500ml water**.
  • Specific daily needs or remaining targets: e.g., **remaining 38g protein**, **daily caloric budget**, **within your deficit**.
  • Dish names when suggesting food: e.g., **Grilled Salmon with Quinoa**.
- Keep non-essential filler words unbolded.

━━ MEAL SUGGESTION FORMAT (CRITICAL) ━━
- When asked for meal or snack ideas, ALWAYS format each dish as a bullet point with the dish name in bold followed by a colon and estimated macros in bold, e.g.:
• **Grilled Salmon with Quinoa**: ~**420 kcal**, ~**38g protein**, ~**25g carbs**, ~**12g fat**
• **Greek Yogurt & Berry Crunch**: ~**220 kcal**, ~**24g protein**, ~**18g carbs**, ~**4g fat**
- Give 2–3 realistic, delicious options that fit their remaining calories and protein.

━━ OUTPUT RULES ━━
- Speak directly in first-person as Sia.
- Never output headers, metadata tags, role labels, or prompt echoes.
- Only discuss food, meals, hydration, body composition, and nutrition.`;

      function sanitizeCoachOutput(raw: string): string {
        if (!raw) return "";
        let text = raw.trim();

        text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
        text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");

        // If output contains a role split marker, take the text after the last one
        const markers = [
          /(?:Direct Spoken Response(?: from Sia)?|Response from Sia|Sia's Response|Sia:\s*)/i,
          /(?:Assistant:\s*|Model:\s*|Response:\s*|Output:\s*)/i,
        ];
        for (const m of markers) {
          if (m.test(text)) {
            const parts = text.split(m);
            const tail = parts[parts.length - 1]?.trim();
            if (tail) text = tail;
          }
        }

        // Filter out any metadata lines
        text = text
          .split("\n")
          .filter((line) => !/^(?:[-*•]\s*)?(?:\*\*)?(?:User|Athlete|Tone|Status|Telemetry|Context|Goal|Calories|Protein|Carbs|Fat|Meals|Scope|Sia)(?:\*\*)?\s*:/i.test(line.trim()))
          .filter((line) => !/^(?:ATHLETE|INTERNAL CONTEXT|OUTPUT RULES|CONVERSATIONAL)/i.test(line.trim()))
          .join("\n")
          .trim();

        text = text.replace(/^(?:Sia\s*\([^)]*\)|Sia|Assistant|Coach|Model)\s*:\s*/i, "").trim();
        return text;
      }

      let replyText = "";
      const debugErrors: string[] = [];

      // 1. Google Gemini Provider — Key rotation & in-memory cached model resolution
      if (geminiKeys.length > 0) {
        // Sanitize multi-turn contents for Google Gemini API
        const geminiContents: { role: string; parts: { text: string }[] }[] = [];

        for (const m of recentMessages) {
          const role = m.role === "assistant" ? "model" : "user";
          const text = m.content?.trim();
          if (!text) continue;

          // Skip assistant greeting at the very beginning of Gemini contents
          if (geminiContents.length === 0 && role === "model") {
            continue;
          }

          // Merge consecutive turns with the same role
          if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
            geminiContents[geminiContents.length - 1].parts[0].text += `\n\n${text}`;
          } else {
            geminiContents.push({
              role,
              parts: [{ text }],
            });
          }
        }

        if (geminiContents.length === 0) {
          const lastUserText = [...recentMessages].reverse().find((m) => m.role === "user")?.content?.trim() || "Hello coach!";
          geminiContents.push({
            role: "user",
            parts: [{ text: lastUserText }],
          });
        }

        // Key loop
        for (const geminiKey of geminiKeys) {
          if (replyText) break;
          const candidateModels = await getCandidateGeminiModels(geminiKey);

          for (const modelName of candidateModels) {
            try {
              // Attempt 1: Multi-turn format with system_instruction
              let resp = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey.trim()}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    system_instruction: { parts: [{ text: coachSystemPrompt }] },
                    contents: geminiContents,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 450 },
                  }),
                },
                14000
              );

              // Attempt 2: Single-turn fallback if multi-turn rejected
              if (!resp.ok) {
                const lastUserText = [...recentMessages].reverse().find((m) => m.role === "user")?.content?.trim() || "Hi Sia!";
                const singlePrompt = `${coachSystemPrompt}\n\nAthlete says: "${lastUserText}"\n\nRespond directly as Sia:`;

                resp = await fetchWithTimeout(
                  `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey.trim()}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: singlePrompt }] }],
                      generationConfig: { temperature: 0.7, maxOutputTokens: 450 },
                    }),
                  },
                  14000
                );
              }

              if (resp.ok) {
                const data = await resp.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const sanitized = sanitizeCoachOutput(rawText);

                if (sanitized) {
                  replyText = sanitized;
                  break;
                }
              } else {
                const errBody = await resp.text().catch(() => "");
                debugErrors.push(`${modelName} (${resp.status}): ${errBody.slice(0, 80)}`);
                console.warn(`Gemini ${modelName} returned status ${resp.status}:`, errBody);
              }
            } catch (err: any) {
              debugErrors.push(`${modelName} exception: ${err.message}`);
              console.warn(`Gemini ${modelName} chat error:`, err.message);
            }
          }
        }
      }

      // 2. OpenAI GPT-4o-mini Fallback for Chat
      if (!replyText && openAiKeys.length > 0) {
        const openAiMessages = [
          { role: "system", content: coachSystemPrompt },
          ...recentMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content || "",
          })),
        ];

        for (const openAiKey of openAiKeys) {
          if (replyText) break;
          try {
            const resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openAiKey.trim()}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: openAiMessages,
                temperature: 0.7,
                max_tokens: 450,
              }),
            }, 14000);

            if (resp.ok) {
              const data = await resp.json();
              const rawContent = data.choices?.[0]?.message?.content || "";
              replyText = sanitizeCoachOutput(rawContent);
              break;
            } else {
              const errBody = await resp.text().catch(() => "");
              debugErrors.push(`OpenAI (${resp.status}): ${errBody.slice(0, 120)}`);
              console.warn(`OpenAI chat returned status ${resp.status}:`, errBody);
            }
          } catch (err: any) {
            debugErrors.push(`OpenAI exception: ${err.message}`);
          }
        }
      }

      if (!replyText) {
        return new Response(
          JSON.stringify({
            error: `AI Coach was unable to generate a response. [Details: ${debugErrors.join(" | ") || "No API response candidates"}]`,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ reply: replyText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // HANDLER 2: MEAL PHOTO & TEXT ANALYSIS
    // =========================================================================
    const { imageBase64, textDescription } = body;

    if (!imageBase64 && !textDescription) {
      return new Response(
        JSON.stringify({ error: "Either imageBase64 or textDescription must be provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert nutritional AI analyzer.
Analyze the provided meal photo or text description and estimate the nutritional content.
You MUST output ONLY a valid JSON object matching this exact schema:
{
  "meal_name": "A concise title of the dish",
  "calories": number (total kcal),
  "protein_g": number (grams of protein),
  "carbs_g": number (grams of carbohydrates),
  "fat_g": number (grams of fat),
  "ingredients": ["ingredient 1 with estimated portion", "ingredient 2 with estimated portion"],
  "confidence_score": number (0.0 to 1.0 estimate of food recognition certainty),
  "portion_notes": "A concise 1-sentence note explaining portion estimation basis, e.g. ~180g grilled chicken breast with 1 cup brown rice",
  "dietary_tags": ["e.g. High Protein", "Lean", "Complex Carbs"],
  "feline_verdict": "A brief 1-sentence encouraging nutritional comment from Sia the Siamese cat coach"
}
Be realistic, accurate, and concise. Return ONLY raw JSON without markdown code blocks.`;

    let parsedData: any = null;

    // Resolve dynamic image MIME type and clean Base64 payload
    let detectedMime = "image/jpeg";
    let cleanImageBase64 = "";

    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
      if (mimeMatch) {
        detectedMime = mimeMatch[1];
        cleanImageBase64 = imageBase64.slice(mimeMatch[0].length);
      } else {
        if (imageBase64.startsWith("UklGR")) {
          detectedMime = "image/webp";
        }
        cleanImageBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      }
    }

    if (geminiKeys.length > 0) {
      const parts: any[] = [];
      parts.push({
        text: textDescription
          ? `Analyze this meal: "${textDescription}". Estimate calories, protein, carbs, fat, and ingredients.`
          : "Analyze this meal photo. Identify all foods, portion sizes, calories, macronutrients (protein, carbs, fat), and individual ingredients.",
      });

      if (cleanImageBase64) {
        parts.push({
          inline_data: {
            mime_type: detectedMime,
            data: cleanImageBase64,
          },
        });
      }

      let lastError = "";

      for (const geminiKey of geminiKeys) {
        if (parsedData) break;
        const candidateModels = await getCandidateGeminiModels(geminiKey);

        for (const modelName of candidateModels) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey.trim()}`;
            const geminiResponse = await fetchWithTimeout(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                system_instruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                  response_mime_type: "application/json",
                  temperature: 0.2,
                },
              }),
            }, 14000);

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              parsedData = JSON.parse(rawText || "{}");
              break;
            } else {
              lastError = await geminiResponse.text();
            }
          } catch (e: any) {
            lastError = e.message;
          }
        }
      }

      if (!parsedData && openAiKeys.length === 0) {
        return new Response(
          JSON.stringify({ error: `Gemini Error: ${lastError}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!parsedData && openAiKeys.length > 0) {
      const userContent: any[] = [];
      userContent.push({
        type: "text",
        text: textDescription
          ? `Analyze this meal description: "${textDescription}" and return the estimated nutrients and ingredients.`
          : "Analyze this meal photo and return the estimated calories, protein, carbs, fat, and ingredients.",
      });

      if (cleanImageBase64) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${detectedMime};base64,${cleanImageBase64}`,
            detail: "low",
          },
        });
      }

      for (const openAiKey of openAiKeys) {
        if (parsedData) break;
        try {
          const openAiResponse = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey.trim()}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
              temperature: 0.2,
            }),
          }, 14000);

          if (openAiResponse.ok) {
            const openAiData = await openAiResponse.json();
            const rawContent = openAiData.choices?.[0]?.message?.content;
            parsedData = JSON.parse(rawContent || "{}");
            break;
          } else {
            const errorText = await openAiResponse.text();
            console.warn(`OpenAI analyze returned status ${openAiResponse.status}:`, errorText);
          }
        } catch (err: any) {
          console.warn("OpenAI analyze error:", err.message);
        }
      }
    }

    const sanitizedResult = {
      meal_name: String(parsedData?.meal_name || "Logged Meal"),
      calories: Math.max(0, Math.round(Number(parsedData?.calories) || 0)),
      protein_g: Math.max(0, Math.round(Number(parsedData?.protein_g) || 0)),
      carbs_g: Math.max(0, Math.round(Number(parsedData?.carbs_g) || 0)),
      fat_g: Math.max(0, Math.round(Number(parsedData?.fat_g) || 0)),
      ingredients: Array.isArray(parsedData?.ingredients)
        ? parsedData.ingredients.map(String)
        : [],
      confidence_score: typeof parsedData?.confidence_score === "number"
        ? Math.min(1, Math.max(0.1, Number(parsedData.confidence_score)))
        : 0.92,
      portion_notes: String(parsedData?.portion_notes || "Estimated standard athlete serving based on visual frame"),
      dietary_tags: Array.isArray(parsedData?.dietary_tags) && parsedData.dietary_tags.length > 0
        ? parsedData.dietary_tags.map(String).slice(0, 4)
        : ["Balanced Catch"],
      feline_verdict: String(parsedData?.feline_verdict || "A wholesome catch to fuel your daily targets!"),
    };

    return new Response(JSON.stringify(sanitizedResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
