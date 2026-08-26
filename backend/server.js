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


// -----------------------------------------
// Helper: Decode HTML Entities
// -----------------------------------------
function decodeHtmlEntities(str) {
    if (!str) return "";
    return str
        .replace(/&#(\d+);/g, (match, dec) => {
            try {
                return String.fromCodePoint(parseInt(dec, 10));
            } catch (e) {
                return match;
            }
        })
        .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            try {
                return String.fromCodePoint(parseInt(hex, 16));
            } catch (e) {
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


// -----------------------------------------
// Helper: Parse K/M/B Count Strings
// -----------------------------------------
function parseCount(str) {
    if (!str) return 0;
    const cleaned = str.replace(/,/g, "").trim().toUpperCase();
    if (cleaned.endsWith("B")) {
        return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000000) || 0;
    }
    if (cleaned.endsWith("M")) {
        return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000) || 0;
    }
    if (cleaned.endsWith("K")) {
        return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000) || 0;
    }
    return parseInt(cleaned, 10) || 0;
}


// -----------------------------------------
// Helper: Scrape Public Instagram Profile Data
// -----------------------------------------
async function scrapeInstagramProfile(username) {
    const cleanUsername = (username || "").trim().replace(/^@/, "").toLowerCase();
    if (!cleanUsername) {
        throw new Error("Username is required");
    }

    const userAgents = [
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Twitterbot/1.0",
        "WhatsApp/2.21.12.21 A"
    ];

    let html = null;

    for (const ua of userAgents) {
        try {
            const url = `https://www.instagram.com/${encodeURIComponent(cleanUsername)}/`;
            const res = await fetch(url, {
                headers: {
                    "User-Agent": ua,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            });

            if (res.status === 404) {
                return {
                    success: false,
                    error: "Instagram profile not found."
                };
            }

            if (res.ok) {
                const text = await res.text();
                if (text.includes("og:title") || text.includes("og:description") || text.includes('name="description"')) {
                    html = text;
                    break;
                }
            }
        } catch (e) {
            // Try next user agent
        }
    }

    if (!html) {
        return {
            success: false,
            error: "Instagram profile data could not be retrieved. Instagram may be blocking automated access."
        };
    }

    // Extract meta tags
    const getMeta = (propOrName, value) => {
        const r1 = new RegExp(`<meta[^>]*${propOrName}=["']${value}["'][^>]*content=["']([^"']*)["']`, "i");
        const r2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${propOrName}=["']${value}["']`, "i");
        const m = html.match(r1) || html.match(r2);
        return m ? decodeHtmlEntities(m[1]) : "";
    };

    const ogTitle = getMeta("property", "og:title") || getMeta("name", "og:title");
    const ogDesc = getMeta("property", "og:description") || getMeta("name", "og:description");
    const metaDesc = getMeta("name", "description") || getMeta("property", "description");
    let ogImage = getMeta("property", "og:image") || getMeta("name", "og:image");

    if (!ogTitle && !ogDesc && !metaDesc) {
        return {
            success: false,
            error: "Instagram profile not found or unavailable."
        };
    }

    // Decode ampersands in image url if encoded
    if (ogImage) {
        ogImage = ogImage.replace(/&amp;/g, "&");
    }

    // Parse fullName and username from og:title (e.g., "NASA (@nasa) • Instagram photos and videos")
    let fullName = cleanUsername;
    if (ogTitle) {
        const titleMatch = ogTitle.match(/^(.*?)\s*\(@([a-zA-Z0-9._]+)\)/i);
        if (titleMatch && titleMatch[1]) {
            fullName = titleMatch[1].trim();
        }
    }

    // Parse followers, following, posts from ogDesc or metaDesc
    // Example: "104M Followers, 96 Following, 4,891 Posts - See Instagram photos and videos..."
    let followers = 0;
    let following = 0;
    let posts = 0;

    const descText = ogDesc || metaDesc || "";
    const followersMatch = descText.match(/([0-9.,]+[KMBkmb]?)\s+Followers/i);
    const followingMatch = descText.match(/([0-9.,]+[KMBkmb]?)\s+Following/i);
    const postsMatch = descText.match(/([0-9.,]+[KMBkmb]?)\s+Posts/i);

    if (followersMatch) followers = parseCount(followersMatch[1]);
    if (followingMatch) following = parseCount(followingMatch[1]);
    if (postsMatch) posts = parseCount(postsMatch[1]);

    // Parse Bio from metaDesc
    // Example: '... on Instagram: "Discover what\'s new on Instagram 🔎✨"'
    let bio = "";
    if (metaDesc) {
        const bioMatch = metaDesc.match(/on Instagram:\s*"(.*?)"/s) ||
                         metaDesc.match(/on Instagram:\s*“(.*?)”/s);
        if (bioMatch) {
            bio = bioMatch[1].trim();
        }
    }

    return {
        success: true,
        username: cleanUsername,
        fullName: fullName || cleanUsername,
        bio: bio || null,
        profileImage: ogImage || null,
        followers: followers,
        following: following,
        posts: posts,
        profileUrl: `https://www.instagram.com/${cleanUsername}/`
    };
}


// -----------------------------------------
// GET /api/instagram/:username
// -----------------------------------------
app.get("/api/instagram/:username", async (req, res) => {
    try {
        const rawUsername = req.params.username;
        if (!rawUsername) {
            return res.status(400).json({
                success: false,
                error: "Username is required"
            });
        }

        const cleanUsername = rawUsername.trim().replace(/^@/, "").toLowerCase();
        const profile = await scrapeInstagramProfile(cleanUsername);

        if (!profile || !profile.success) {
            return res.status(404).json({
                success: false,
                error: (profile && profile.error) || "Instagram profile not found or unavailable."
            });
        }

        res.json(profile);
    } catch (error) {
        console.error("Instagram fetch error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch Instagram profile"
        });
    }
});


// -----------------------------------------
// Roast Engine
// -----------------------------------------
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
        // Extract normalized profile data
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
                    error: "Invalid profile data format"
                });

            }
        }


        // -----------------------------------------
        // Prompt for Qwen (Source-Specific)
        // -----------------------------------------

        const isInstagram = profileData.sourceType === "instagram";

        let prompt;

        if (isInstagram) {
            prompt = `
You are RoastIt's AI roast engine.

You are analyzing an Instagram profile.

Your job is to produce a detailed, funny, sarcastic,
culturally sharp, and constructive roast.

IMPORTANT RULES:

1. ONLY use information provided in PROFILE_DATA.
2. NEVER invent statistics.
3. NEVER invent followers, following, or post counts.
4. NEVER invent bio information or claim something exists if it is not in the data.
5. Keep the humor sharp, witty, and roasting their bio, aesthetic, clout/ratio, and post count, but not hateful.
6. Recommendations must be practical and humorous.

Analyze the profile across these areas:

1. Overall profile & aesthetic
2. Bio & persona
3. Follower to following ratio & clout dynamics
4. Post count & grid habits
5. Strengths
6. Weaknesses
7. Most roastable aspect
8. Recommendations / What they should fix
9. Final verdict


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
A number from 0 to 10 (higher means more roastable/burned).

headline:
A short funny headline for this Instagram user.

roast:
The main overall roast of their Instagram presence.

technicalAnalysis:
Analysis of their bio, branding, aesthetic, and persona presentation.

projectAnalysis:
Analysis of their content, grid presence, and post volume.

activityAnalysis:
Analysis of their followers/following ratio, clout, and Instagram activity.

strengths:
An array of humorous but real strengths.

weaknesses:
An array of roastable weaknesses.

recommendations:
An array of practical/funny improvements.

finalVerdict:
A short final humorous verdict.
`;
        } else {
            prompt = `
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
        }


        // -----------------------------------------
        // Send request to Qwen
        // -----------------------------------------

        console.log(`Sending ${isInstagram ? "Instagram" : "GitHub"} profile to Qwen...`);

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
                "Qwen did not return valid JSON, trying regex extraction..."
            );

            // Attempt to extract JSON block if wrapped in markdown
            const jsonMatch = roastText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    roastResult = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    // Fallback below
                }
            }

            if (!roastResult) {
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