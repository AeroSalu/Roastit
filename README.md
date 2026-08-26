# 🔥 RoastIt

### AI-Powered Profile Analysis & Roast Engine

RoastIt is an AI-powered platform that analyzes online developer profiles and transforms real profile data into **personalized, technically informed, and brutally honest feedback**.

Instead of simply displaying statistics, RoastIt uses AI to interpret a developer's projects, technical activity, programming languages, and overall online presence. It identifies **strengths, weaknesses, patterns, and areas for improvement** — while delivering the analysis with a unique touch of humor.

The goal is to make profile analysis both **useful and entertaining**, giving developers actionable feedback they are actually likely to remember.

---

## ✨ Features

- 💻 **GitHub Analysis** — Analyze GitHub profiles, repositories, programming languages, stars, forks, repository activity, and other profile statistics.

- 🤖 **AI-Powered Roasting** — Generate detailed, personalized, and technically informed feedback using **Qwen 3 8B** through Ollama.

- 🔥 **Developer Insights** — Identify strengths, weaknesses, development patterns, and the most roastable aspects of a developer's profile.

- 📊 **Structured Analysis** — Evaluate profiles across technical ability, project quality, activity, documentation, and overall presentation.

- 🎯 **Actionable Recommendations** — Go beyond the roast by providing practical suggestions for improving projects, activity, and professional presence.

- 🔐 **Google Authentication** — Secure user authentication using Firebase Authentication and Google Sign-In.

- 📚 **Roast History** — Save, search, filter, revisit, roast again, and delete previously generated roasts using Firebase Firestore.

- 👤 **User Profiles** — Display authenticated user information and profile pictures through Firebase Authentication.

- 📄 **Resume Support** — The application supports PDF and image resume uploads as part of the planned resume analysis pipeline.

- 🔮 **Multi-Platform Roadmap** — Designed to expand beyond GitHub with LinkedIn, Instagram, and resume-based analysis.

---

## 🛠️ Tech Stack

### Frontend

- **HTML5** — Application structure and UI
- **CSS3** — Responsive dashboard styling and components
- **JavaScript** — Frontend logic and application flow
- **Firebase Authentication** — Google-based user authentication
- **Firebase Firestore** — Persistent roast history and user data

### Backend

- **Node.js** — Backend runtime
- **Express.js** — REST API and AI roast engine
- **CORS** — Frontend-to-backend communication
- **Ollama** — Local AI model runtime

### AI

- **Qwen 3 8B** — Local large language model used to analyze profile data and generate personalized roasts

### Data

- **GitHub REST API** — Profile and repository information

---

## ⚙️ How It Works

RoastIt follows a simple pipeline that converts raw profile information into a structured AI analysis.

```text
Profile URL
    ↓
Platform API
    ↓
Profile & Repository Data
    ↓
Data Normalization
    ↓
RoastIt AI Engine
    ↓
Qwen 3 8B via Ollama
    ↓
Structured AI Analysis
    ↓
Personalized Roast
    ↓
Firebase Firestore
    ↓
Roast History
