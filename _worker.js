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
You are an AI customer support operations consultant.

Your job is to estimate support operations metrics for a company based on a short natural-language business description.

You must return ONLY valid JSON with this exact shape:

{
  "tickets_per_day": number,
  "annual_support_cost": number,
  "automation_percentage": number,
  "annual_savings": number,
  "summary": "string",
  "assumptions": ["string", "string", "string"]
}

Rules:
- Be realistic, practical, and conservative.
- Infer likely support volume from business type, order volume, channel mix, and common customer issues.
- annual_support_cost should be in USD.
- automation_percentage should be a number from 0 to 100.
- annual_savings should be in USD.
- summary should be a short consulting-style explanation in plain English.
- assumptions should be 3 short bullet-style strings.
- Return JSON only. No markdown. No extra text.
`.trim();

    const userPrompt = `Company description: ${description}`;

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
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.slice(0, 3) : []
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