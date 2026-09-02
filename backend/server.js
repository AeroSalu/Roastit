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
// COMMON HELPERS
// ============================================================

function decodeHtmlEntities(str) {
    if (!str) return "";

    return String(str)
        .replace(/&#(\d+);/g, (match, dec) => {
            try {
                return String.fromCodePoint(parseInt(dec, 10));
            } catch {
                return match;
            }
        })
        .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            try {
                return String.fromCodePoint(parseInt(hex, 16));
            } catch {
                return match;
            }
        })
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&bull;/g, "•")
        .replace(/&nbsp;/g, " ");
}

function parseCount(str) {
    if (!str) return 0;

    const cleaned = String(str)
        .replace(/,/g, "")
        .trim()
        .toUpperCase();

    if (cleaned.endsWith("B")) {
        return Math.round(
            parseFloat(cleaned.slice(0, -1)) * 1000000000
        ) || 0;
    }

    if (cleaned.endsWith("M")) {
        return Math.round(
            parseFloat(cleaned.slice(0, -1)) * 1000000
        ) || 0;
    }

    if (cleaned.endsWith("K")) {
        return Math.round(
            parseFloat(cleaned.slice(0, -1)) * 1000
        ) || 0;
    }

    return parseInt(cleaned, 10) || 0;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ============================================================
// INSTAGRAM SCRAPER
// ============================================================

async function scrapeInstagramProfile(username) {

    const cleanUsername = (username || "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    if (!cleanUsername) {
        throw new Error("Instagram username is required.");
    }

    const userAgents = [
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Twitterbot/1.0",
        "WhatsApp/2.21.12.21 A",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
    ];

    let html = null;

    for (const userAgent of userAgents) {

        try {

            const url =
                `https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`;

            const response = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language":
                        "en-US,en;q=0.9"
                }
            });

            if (response.status === 404) {
                return {
                    success: false,
                    error: "Instagram profile not found."
                };
            }

            if (response.ok) {

                const text = await response.text();

                if (
                    text.includes("og:title") ||
                    text.includes("og:description") ||
                    text.includes('name="description"')
                ) {
                    html = text;
                    break;
                }
            }

        } catch (error) {

            console.warn(
                "Instagram request failed:",
                error.message
            );
        }
    }

    if (!html) {

        return {
            success: false,
            error:
                "Instagram profile could not be retrieved. Instagram may be blocking automated access."
        };
    }

    // ========================================================
    // META TAG READER
    // ========================================================

    function getMeta(attribute, value) {

        const escapedValue =
            value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const pattern1 = new RegExp(
            `<meta[^>]*${attribute}=["']${escapedValue}["'][^>]*content=["']([^"']*)["']`,
            "i"
        );

        const pattern2 = new RegExp(
            `<meta[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${escapedValue}["']`,
            "i"
        );

        const match =
            html.match(pattern1) ||
            html.match(pattern2);

        return match
            ? decodeHtmlEntities(match[1])
            : "";
    }

    const ogTitle =
        getMeta("property", "og:title") ||
        getMeta("name", "og:title");

    const ogDescription =
        getMeta("property", "og:description") ||
        getMeta("name", "og:description");

    const metaDescription =
        getMeta("name", "description") ||
        getMeta("property", "description");

    let profileImage =
        getMeta("property", "og:image") ||
        getMeta("name", "og:image");

    if (!ogTitle && !ogDescription && !metaDescription) {

        return {
            success: false,
            error:
                "Instagram profile not found or unavailable."
        };
    }

    if (profileImage) {
        profileImage =
            profileImage.replace(/&amp;/g, "&");
    }

    // ========================================================
    // NAME
    // ========================================================

    let fullName = cleanUsername;

    if (ogTitle) {

        const titleMatch =
            ogTitle.match(
                /^(.*?)\s*\(@([a-zA-Z0-9._]+)\)/i
            );

        if (titleMatch && titleMatch[1]) {
            fullName =
                titleMatch[1].trim();
        }
    }

    // ========================================================
    // INSTAGRAM COUNTS
    // ========================================================

    let followers = 0;
    let following = 0;
    let posts = 0;

    const description =
        ogDescription ||
        metaDescription ||
        "";

    const followersMatch =
        description.match(
            /([0-9.,]+[KMBkmb]?)\s+Followers/i
        );

    const followingMatch =
        description.match(
            /([0-9.,]+[KMBkmb]?)\s+Following/i
        );

    const postsMatch =
        description.match(
            /([0-9.,]+[KMBkmb]?)\s+Posts/i
        );

    if (followersMatch) {
        followers =
            parseCount(followersMatch[1]);
    }

    if (followingMatch) {
        following =
            parseCount(followingMatch[1]);
    }

    if (postsMatch) {
        posts =
            parseCount(postsMatch[1]);
    }

    // ========================================================
    // BIO
    // ========================================================

    let bio = "";

    if (metaDescription) {

        const bioMatch =
            metaDescription.match(
                /on Instagram:\s*"([^"]*)"/is
            ) ||
            metaDescription.match(
                /on Instagram:\s*“(.*?)”/is
            );

        if (bioMatch) {
            bio =
                bioMatch[1].trim();
        }
    }

    // ========================================================
    // IMPORTANT:
    // ONLY RETURN INSTAGRAM DATA.
    //
    // NO:
    // GitHub repositories
    // GitHub languages
    // stars
    // forks
    // commits
    // README information
    // ========================================================

    return {

        success: true,

        sourceType: "instagram",

        username:
            cleanUsername,

        fullName:
            fullName || cleanUsername,

        bio:
            bio || null,

        profileImage:
            profileImage || null,

        followers,

        following,

        posts,

        profileUrl:
            `https://www.instagram.com/${cleanUsername}/`
    };
}

// ============================================================
// INSTAGRAM API
// ============================================================

app.get(
    "/api/instagram/:username",
    async (req, res) => {

        try {

            const username =
                req.params.username;

            if (!username) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Instagram username is required."
                });
            }

            const profile =
                await scrapeInstagramProfile(
                    username
                );

            if (!profile.success) {

                return res.status(404).json({
                    success: false,
                    error:
                        profile.error
                });
            }

            return res.json(profile);

        } catch (error) {

            console.error(
                "Instagram error:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Failed to fetch Instagram profile."
            });
        }
    }
);

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
"even Instagram"
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

Do NOT treat this as Instagram.

Do NOT mention:

- Instagram posts
- Instagram reels
- Instagram followers
- Instagram bio
- Instagram engagement

unless they actually exist in PROFILE_DATA.

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
// INSTAGRAM PROMPT
// ============================================================

function buildInstagramPrompt(
    data,
    isHinglish
) {

    const languageRules =
        isHinglish
            ? getHinglishRules()
            : getEnglishRules();

    return `

You are RoastIt's Instagram roast engine.

IMPORTANT:
THIS IS AN INSTAGRAM PROFILE.

Do NOT treat this as GitHub.

Do NOT mention:

- repositories
- programming languages
- commits
- GitHub stars
- GitHub forks
- README files
- GitHub contribution graphs

unless they actually exist in PROFILE_DATA.

${languageRules}

========================================================
📸 INSTAGRAM ANALYSIS
========================================================

Analyze ONLY:

- username
- name
- bio
- profile image
- followers
- following
- posts
- follower/following ratio
- profile presentation
- public persona

========================================================
🚨 CRITICAL DATA RULE
========================================================

The backend has supplied ONLY the Instagram data
shown in PROFILE_DATA.

If a field does NOT exist:

DO NOT mention it.

For example:

If "likes" does not exist:
DO NOT mention likes.

If "comments" does not exist:
DO NOT mention comments.

If "posts array" does not exist:
DO NOT say that individual posts are empty.

If only "posts: 66" exists:
You may say the profile has 66 posts.

You MAY NOT claim you saw those posts.

You MAY NOT invent:

- photos
- reels
- captions
- likes
- comments
- engagement
- content quality
- visual aesthetic

unless those exact fields exist.

========================================================
😂 INSTAGRAM HUMOR
========================================================

Use the ACTUAL Instagram data.

For example:

If bio exists:
Roast the actual wording.

If followers are available:
Use the actual follower count.

If following is available:
You can discuss the ratio.

If posts are available:
Use the actual post count.

If information is missing:
Say that information is unavailable.

Do not invent content.

Do not repeat the same joke.

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
Short memorable Instagram roast.

roast:
Main funny Instagram roast.

technicalAnalysis:
Profile, bio and presentation analysis.

projectAnalysis:
Instagram content/post-count analysis.
ONLY discuss actual supplied fields.

activityAnalysis:
Followers, following and available activity data.

strengths:
3-5 genuine strengths.

weaknesses:
3-5 genuine weaknesses.

recommendations:
3-5 useful improvements.

finalVerdict:
Short memorable Instagram ending.

PROFILE_DATA:

${JSON.stringify(data, null, 2)}

`;
}

// ============================================================
// RESUME PROMPT
// ============================================================

function buildResumePrompt(
    data,
    isHinglish
) {

    const languageRules =
        isHinglish
            ? getHinglishRules()
            : getEnglishRules();

    return `

You are RoastIt's resume roast engine.

${languageRules}

Analyze ONLY the supplied resume data.

Do NOT invent:

- companies
- experience
- projects
- technologies
- education
- certifications
- achievements

Return ONLY valid JSON:

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

            // =================================================
            // SOURCE TYPE
            // =================================================

            const sourceType =
                String(
                    profileData.sourceType ||
                    "github"
                ).toLowerCase();

            const isGithub =
                sourceType === "github";

            const isInstagram =
                sourceType === "instagram";

            const isResume =
                sourceType === "resume";

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
            // BUILD SOURCE-SPECIFIC PROMPT
            // =================================================

            let prompt;

            if (isGithub) {

                prompt =
                    buildGithubPrompt(
                        roastData,
                        isHinglish
                    );

            } else if (isInstagram) {

                prompt =
                    buildInstagramPrompt(
                        roastData,
                        isHinglish
                    );

            } else if (isResume) {

                prompt =
                    buildResumePrompt(
                        roastData,
                        isHinglish
                    );

            } else {

                return res.status(400).json({

                    success: false,

                    error:
                        `Unsupported source type: ${sourceType}`
                });
            }

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
            "📸 Instagram: ENABLED"
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