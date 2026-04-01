import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RoleHoursRequest {
  roles: Array<{
    name: string;
    role: string;
  }>;
  totalBudget: number;
  scheduleWeeks: number;
}

interface RoleHoursResponse {
  hoursPerWeek: Record<string, number>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { roles, totalBudget, scheduleWeeks } = (await req.json()) as RoleHoursRequest;

    if (!roles || !totalBudget || !scheduleWeeks) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const roleNames = roles.map((r) => `${r.name} (${r.role})`).join(", ");

    const prompt = `You are a project management expert. Given the following team members, total budget, and project schedule, provide weekly working hours recommendations for each team member.

Team Members: ${roleNames}
Total Budget: $${totalBudget}
Project Duration: ${scheduleWeeks} weeks
Number of team members: ${roles.length}

For each team member, calculate reasonable weekly working hours based on:
1. Their role and seniority implied by the role name
2. Even distribution of work across the team
3. Typical availability (40-50 hours per week maximum)
4. Budget constraints (higher budget = more hours possible)

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "hoursPerWeek": {
    "Name1": 40,
    "Name2": 35,
    "Name3": 40
  }
}

Use the exact same person identifiers as provided (Name and Role).`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    let responseText = data.candidates[0].content.parts[0].text.trim();

    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(responseText) as RoleHoursResponse;

    return new Response(JSON.stringify(parsed), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        hoursPerWeek: {},
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
