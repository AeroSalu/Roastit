const express = require("express");
const cors = require("cors");
const { Ollama } = require("ollama");

const app = express();

const ollama = new Ollama({
    host: "http://127.0.0.1:11434"
});

app.use(cors());
app.use(express.json());


// Health check
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "RoastIt AI backend is running"
    });
});


// Roast Engine
app.post("/api/roast", async (req, res) => {
    try {

        const profileData = req.body;

        // Check if data was received
        if (
            !profileData ||
            Object.keys(profileData).length === 0
        ) {
            return res.status(400).json({
                success: false,
                error: "No profile data provided"
            });
        }


        // -----------------------------------------
        // Extract normalized GitHub data
        // -----------------------------------------

        let roastData = profileData;

        if (profileData.notes) {
            try {
                roastData =
                    typeof profileData.notes === "string"
                        ? JSON.parse(profileData.notes)
                        : profileData.notes;

            } catch (error) {

                return res.status(400).json({
                    success: false,
                    error: "Invalid GitHub profile data"
                });

            }
        }


        // -----------------------------------------
        // Prompt for Qwen
        // -----------------------------------------

        const prompt = `
You are RoastIt's AI roast engine.

You are analyzing a developer's GitHub profile.

Your job is to produce a detailed, funny, sarcastic,
technically informed, and constructive roast.

IMPORTANT RULES:

1. ONLY use information provided in PROFILE_DATA.
2. NEVER invent statistics.
3. NEVER invent projects.
4. NEVER invent programming languages.
5. NEVER invent followers.
6. NEVER invent achievements.
7. NEVER invent experience.
8. NEVER claim something exists if it is not in the data.
9. Keep the humor sharp but not hateful.
10. Recommendations must be practical.

Analyze the developer across these areas:

1. Overall profile
2. Technical ability
3. Project quality
4. GitHub activity
5. Programming languages
6. Repository quality
7. Documentation
8. Professional presentation
9. Strengths
10. Weaknesses
11. Most roastable aspect
12. Recommendations
13. Final verdict


PROFILE_DATA:

${JSON.stringify(roastData, null, 2)}


Return ONLY valid JSON.

Use exactly this structure:

{
    "score": 0,
    "headline": "",
    "roast": "",
    "technicalAnalysis": "",
    "projectAnalysis": "",
    "activityAnalysis": "",
    "strengths": [],
    "weaknesses": [],
    "recommendations": [],
    "finalVerdict": ""
}

FIELD REQUIREMENTS:

score:
A number from 0 to 10.

headline:
A short funny headline for the developer.

roast:
The main overall roast.

technicalAnalysis:
Detailed analysis of their technical profile.

projectAnalysis:
Analysis of their repositories and projects.

activityAnalysis:
Analysis of their GitHub activity and repository activity.

strengths:
An array of useful strengths.

weaknesses:
An array of weaknesses.

recommendations:
An array of practical improvements.

finalVerdict:
A short final humorous verdict.
`;


        // -----------------------------------------
        // Send request to Qwen
        // -----------------------------------------

        console.log("Sending profile to Qwen...");

        const response = await ollama.chat({
            model: "qwen3:8b",

            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });


        // -----------------------------------------
        // Get Qwen response
        // -----------------------------------------

        const roastText =
            response?.message?.content || "";


        if (!roastText) {
            throw new Error(
                "Qwen returned an empty response"
            );
        }


        // -----------------------------------------
        // Try to parse JSON returned by Qwen
        // -----------------------------------------

        let roastResult;

        try {

            roastResult =
                JSON.parse(roastText);

        } catch (error) {

            console.warn(
                "Qwen did not return valid JSON."
            );

            // Fallback if Qwen returns plain text
            roastResult = {
                score: 0,
                headline: "🔥 Roast Generated",
                roast: roastText,
                technicalAnalysis: "",
                projectAnalysis: "",
                activityAnalysis: "",
                strengths: [],
                weaknesses: [],
                recommendations: [],
                finalVerdict: ""
            };
        }


        // -----------------------------------------
        // Send response to frontend
        // -----------------------------------------

        res.json({
            success: true,
            result: roastResult
        });


    } catch (error) {

        console.error(
            "Ollama error:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Roast engine failed"
        });
    }
});


// -----------------------------------------
// Start server
// -----------------------------------------

const PORT = 3000;

app.listen(PORT, () => {
    console.log(
        `RoastIt backend running on http://localhost:${PORT}`
    );
});