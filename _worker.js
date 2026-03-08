export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/analyze") {
      return handleAnalyze(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAnalyze(request, env) {
  try {
    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OPENAI_API_KEY is missing in Cloudflare secrets." },
        500
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const description = (body.description || "").trim();

    if (!description) {
      return jsonResponse(
        { error: "Please describe your company first." },
        400
      );
    }

    const systemPrompt = `
You are a customer support operations consultant creating a directional benchmark-style estimate.

The user provides a short description of a business. You must infer likely support operations metrics using practical, conservative, industry-style reasoning commonly applied to ecommerce and customer service teams.

Important:
- Do NOT claim that you researched the internet or looked up real-time market data.
- Do NOT say "based on internet research" or "market research found".
- Frame the answer as a directional estimate based on common support benchmarks, operating patterns, and the description provided.
- Be professional, concise, and useful.
- Avoid generic filler language.

Return ONLY valid JSON with this exact structure:

{
  "tickets_per_day": number,
  "annual_support_cost": number,
  "automation_percentage": number,
  "annual_savings": number,
  "summary": "string",
  "benchmark_note": "string",
  "opportunity_level": "string",
  "recommended_next_step": "string",
  "assumptions": ["string", "string", "string"]
}

Rules:
- annual_support_cost must be in USD.
- annual_savings must be in USD.
- automation_percentage must be between 0 and 100.
- summary should read like a short executive summary for a prospect.
- benchmark_note should explain that this is a directional estimate based on common support patterns for similar businesses.
- opportunity_level should be one of: "Low", "Moderate", "High", "Very High".
- recommended_next_step should sound like a practical consulting recommendation.
- assumptions should be 3 short, concrete assumptions.
- Return JSON only.
`.trim();

    const userPrompt = `Business description: ${description}`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return jsonResponse(
        {
          error: "OpenAI API request failed.",
          details: errorText
        },
        500
      );
    }

    const openAiData = await openAiResponse.json();
    const content = openAiData?.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse(
        { error: "OpenAI returned an empty response." },
        500
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonResponse(
        {
          error: "Could not parse OpenAI JSON response.",
          raw: content
        },
        500
      );
    }

    const result = {
      tickets_per_day: numberOrZero(parsed.tickets_per_day),
      annual_support_cost: numberOrZero(parsed.annual_support_cost),
      automation_percentage: numberOrZero(parsed.automation_percentage),
      annual_savings: numberOrZero(parsed.annual_savings),
      summary: safeText(parsed.summary),
      benchmark_note: safeText(parsed.benchmark_note),
      opportunity_level: safeText(parsed.opportunity_level),
      recommended_next_step: safeText(parsed.recommended_next_step),
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions.slice(0, 3).map(safeText)
        : []
    };

    return jsonResponse(result, 200);
  } catch (error) {
    return jsonResponse(
      {
        error: "Unexpected server error.",
        details: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}