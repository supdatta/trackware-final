import { Router } from "express";

const router = Router();

router.post("/role-hours", async (req, res) => {
  const { roles, totalBudget, scheduleWeeks } = req.body;

  if (!roles || !totalBudget || !scheduleWeeks) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback: Record<string, number> = {};
    roles.forEach((r: { name: string }) => {
      fallback[r.name] = 40;
    });
    return res.json({ hoursPerWeek: fallback });
  }

  try {
    const roleNames = roles.map((r: { name: string; role: string }) => `${r.name} (${r.role})`).join(", ");

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    let responseText: string = data.candidates[0].content.parts[0].text.trim();
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini error:", error);
    const fallback: Record<string, number> = {};
    roles.forEach((r: { name: string }) => {
      fallback[r.name] = 40;
    });
    return res.json({ hoursPerWeek: fallback });
  }
});

export default router;
