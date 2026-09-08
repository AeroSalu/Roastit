const express = require("express");
const cors = require("cors");
const { Ollama } = require("ollama");

const app = express();

const ollama = new Ollama({
    host: "http://127.0.0.1:11434"
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "RoastIt AI backend is running"
    });
});






// ============================================================
// EXTRACT NOTES / PROFILE DATA
// ============================================================

function extractRoastData(profileData) {

    if (
        profileData &&
        profileData.notes
    ) {

        if (
            typeof profileData.notes ===
            "string"
        ) {

            try {

                return JSON.parse(
                    profileData.notes
                );

            } catch {

                return profileData;
            }
        }

        if (
            typeof profileData.notes ===
            "object"
        ) {
            return profileData.notes;
        }
    }

    return profileData;
}


// ============================================================
// HINGLISH RULES
// ============================================================

function getHinglishRules() {

    return `

========================================================
🇮🇳 NATURAL INDIAN HINGLISH
========================================================

Write natural Roman Hinglish.

Sound like an Indian friend who is genuinely funny,
not like Google Translate.

Mix Hindi and English naturally.

Use words such as:

bhai
bro
tera
tu
scene
sahi
solid
mast
yaar
kaafi
thoda
seedha
full
jugaad

But don't force these words into every sentence.

Do NOT write formal Hindi.

Do NOT translate English sentences word-for-word.

========================================================
🚫 REPETITION IS NOT ALLOWED
========================================================

Do NOT repeatedly use:

"kya hi bolu"
"lagta hai"
"lakin"
"even GitHub"
"repo itna khaali hai"
"profile toh"
"toh tera"
"least itna kuch hai"
"like a"

Especially avoid:

"X hai, lakin Y hai"

over and over again.

Use different sentence structures.

Every section should have different jokes.

Do not repeat the same observation five times.

========================================================
😂 HUMOR
========================================================

Use:

- sarcasm
- exaggeration
- clever comparisons
- Indian meme humor
- developer jokes
- unexpected punchlines
- wordplay

The roast should feel spontaneous.

Do not make every sentence a punchline.

========================================================
💡 CONSTRUCTIVE
========================================================

The user should actually learn something.

For every major weakness,
give a practical recommendation.

Roast the PROFILE.

Never attack:

- race
- religion
- gender
- sexuality
- disability
- protected characteristics
- sensitive personal traits

`;
}

// ============================================================
// ENGLISH RULES
// ============================================================

function getEnglishRules() {

    return `

========================================================
🇺🇸 ENGLISH STYLE
========================================================

Write natural modern conversational English.

Be witty, sarcastic and specific.

Use developer/social-media humor when appropriate.

Avoid generic AI language.

Avoid repeating the same joke.

Do not sound like a corporate report.

`;
}

// ============================================================
// GITHUB PROMPT
// ============================================================

function buildGithubPrompt(
    data,
    isHinglish
) {

    const languageRules =
        isHinglish
            ? getHinglishRules()
            : getEnglishRules();

    return `

You are RoastIt's GitHub roast engine.

IMPORTANT:
THIS IS A GITHUB PROFILE.

${languageRules}

========================================================
💻 GITHUB ANALYSIS
========================================================

Analyze ONLY:

- GitHub profile
- repositories
- repository descriptions
- programming languages
- stars
- forks
- repository activity
- profile followers/following
- project presentation

Do NOT pretend that you inspected source code.

Do NOT claim to have read README files unless
README information exists in PROFILE_DATA.

Do NOT invent commits.

Do NOT invent contribution graph information.

Do NOT invent technologies.

Do NOT invent project functionality.

========================================================
😂 ROAST
========================================================

Make the roast specific.

Use actual repository names when available.

Use actual numbers when available.

If a description is missing,
you may joke about the missing description.

If stars are zero,
you may joke about zero stars.

But do not repeat that same joke everywhere.

Do not invent missing information.

========================================================
OUTPUT
========================================================

Return ONLY valid JSON.

No markdown.

No code fences.

No explanation.

Use EXACTLY:

{
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

Rules:

headline:
Short memorable GitHub roast.

roast:
The main funny roast.

technicalAnalysis:
Technical profile analysis.

projectAnalysis:
Repository/project analysis.

activityAnalysis:
GitHub activity and community analysis.

strengths:
3-5 genuine strengths.

weaknesses:
3-5 genuine weaknesses.

recommendations:
3-5 useful improvements.

finalVerdict:
Short memorable ending.

PROFILE_DATA:

${JSON.stringify(data, null, 2)}

`;
}







// ============================================================
// JSON EXTRACTION
// ============================================================

function extractJson(text) {

    if (!text) {
        return null;
    }

    let cleaned =
        String(text)
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        // Continue
    }

    const firstBrace =
        cleaned.indexOf("{");

    const lastBrace =
        cleaned.lastIndexOf("}");

    if (
        firstBrace === -1 ||
        lastBrace === -1 ||
        lastBrace <= firstBrace
    ) {
        return null;
    }

    const jsonString =
        cleaned.substring(
            firstBrace,
            lastBrace + 1
        );

    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

// ============================================================
// NORMALIZE QWEN RESULT
// ============================================================

function normalizeResult(
    result,
    rawText
) {

    if (!result) {

        throw new Error(
            "Qwen did not return valid JSON."
        );
    }

    delete result.score;
    delete result.roastScore;

    result.headline =
        typeof result.headline === "string"
            ? result.headline.trim()
            : "🔥 Roast Generated";

    result.roast =
        typeof result.roast === "string"
            ? result.roast.trim()
            : rawText;

    result.technicalAnalysis =
        typeof result.technicalAnalysis === "string"
            ? result.technicalAnalysis.trim()
            : "";

    result.projectAnalysis =
        typeof result.projectAnalysis === "string"
            ? result.projectAnalysis.trim()
            : "";

    result.activityAnalysis =
        typeof result.activityAnalysis === "string"
            ? result.activityAnalysis.trim()
            : "";

    result.finalVerdict =
        typeof result.finalVerdict === "string"
            ? result.finalVerdict.trim()
            : "";

    if (!Array.isArray(result.strengths)) {
        result.strengths = [];
    }

    if (!Array.isArray(result.weaknesses)) {
        result.weaknesses = [];
    }

    if (!Array.isArray(result.recommendations)) {
        result.recommendations = [];
    }

    result.strengths =
        result.strengths
            .filter(Boolean)
            .map(String);

    result.weaknesses =
        result.weaknesses
            .filter(Boolean)
            .map(String);

    result.recommendations =
        result.recommendations
            .filter(Boolean)
            .map(String);

    return result;
}

// ============================================================
// MAIN ROAST API
// ============================================================

app.post(
    "/api/roast",
    async (req, res) => {

        try {

            const profileData =
                req.body;

            if (
                !profileData ||
                typeof profileData !== "object" ||
                Object.keys(profileData).length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "No profile data provided."
                });
            }

            const sourceType =
                String(
                    profileData.sourceType ||
                    "github"
                ).toLowerCase();

            if (sourceType !== "github") {
                return res.status(400).json({
                    success: false,
                    error: `Unsupported source type: ${sourceType}. Only GitHub is supported.`
                });
            }

            // =================================================
            // LANGUAGE
            // =================================================

            const isHinglish =
                profileData.language === "hinglish" ||
                profileData.roastLanguage === "hinglish";

            const language =
                isHinglish
                    ? "hinglish"
                    : "english";

            // =================================================
            // DATA
            // =================================================

            const roastData =
                extractRoastData(
                    profileData
                );

            console.log(
                "=============================================="
            );

            console.log(
                "🔥 ROAST REQUEST"
            );

            console.log(
                "Source:",
                sourceType
            );

            console.log(
                "Language:",
                language
            );

            console.log(
                "=============================================="
            );

            // =================================================
            // BUILD GITHUB PROMPT
            // =================================================

            const prompt =
                buildGithubPrompt(
                    roastData,
                    isHinglish
                );

            // =================================================
            // SEND TO QWEN
            // =================================================

            console.log(
                `🔥 Sending ${sourceType} profile to Qwen (${language})...`
            );

            const response =
                await ollama.chat({

                    model: "qwen3:8b",

                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    options: {

                        /*
                         * Lower temperature prevents
                         * wildly different output while
                         * still allowing humor.
                         */

                        temperature: 0.65,

                        top_p: 0.85,

                        repeat_penalty: 1.18,

                        num_predict: 2500
                    }
                });

            // =================================================
            // RESPONSE
            // =================================================

            const roastText =
                response?.message?.content ||
                "";

            if (!roastText) {

                throw new Error(
                    "Qwen returned an empty response."
                );
            }

            console.log(
                "🔥 Qwen response received."
            );

            // =================================================
            // PARSE
            // =================================================

            let roastResult =
                extractJson(
                    roastText
                );

            if (!roastResult) {

                console.error(
                    "❌ Invalid Qwen JSON:"
                );

                console.error(
                    roastText
                );

                throw new Error(
                    "Qwen did not return valid JSON."
                );
            }

            // =================================================
            // NORMALIZE
            // =================================================

            roastResult =
                normalizeResult(
                    roastResult,
                    roastText
                );

            // =================================================
            // FINAL RESPONSE
            // =================================================

            console.log(
                `🔥 Roast complete | Source: ${sourceType} | Language: ${language}`
            );

            return res.json({

                success: true,

                source:
                    sourceType,

                language:
                    language,

                result:
                    roastResult
            });

        } catch (error) {

            console.error(
                "❌ Roast engine error:"
            );

            console.error(
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Roast engine failed."
            });
        }
    }
);

// ============================================================
// START SERVER
// ============================================================

const PORT = 3000;

app.listen(
    PORT,
    () => {

        console.log(
            "=============================================="
        );

        console.log(
            "🔥 RoastIt AI backend running"
        );

        console.log(
            "🌐 http://localhost:3000"
        );

        console.log(
            "🤖 Ollama: http://127.0.0.1:11434"
        );

        console.log(
            "🧠 Model: qwen3:8b"
        );

        console.log(
            "💻 GitHub: ENABLED"
        );

        console.log(
            "🇮🇳 Hinglish: ENABLED"
        );

        console.log(
            "=============================================="
        );
    }
);