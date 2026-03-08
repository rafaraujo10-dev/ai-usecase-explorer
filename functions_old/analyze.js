export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const description = body.description;

    if (!description || !description.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing company description." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const prompt = `
You are an AI consultant specializing in customer support operations.

A company described their business below.

Estimate their support operation and AI automation opportunity using reasonable business assumptions.

Company description:
${description}

Return ONLY valid JSON with this exact shape:

{
  "tickets_per_day": number,
  "annual_support_cost": number,
  "automation_percentage": number,
  "annual_savings": number
}
`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You estimate customer support operations for businesses and always return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: "OpenAI API error", details: errorText }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content returned by OpenAI." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "OpenAI returned invalid JSON.", raw: content }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unexpected server error.",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}