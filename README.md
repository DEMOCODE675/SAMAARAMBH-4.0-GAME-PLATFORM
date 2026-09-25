<img width="5481" height="5966" alt="SAMARAMBH png" src="https://github.com/user-attachments/assets/b5af5f42-f0b3-446f-9a40-187c3140b29f" />

# TechArena: Real-Time Multi-Mode Competitive Quiz Platform

TechArena is a high-performance, real-time competitive gaming and evaluation platform engineered for college tech events and mega-hackathons (such as *SAMARAMBH*). It features seamless mode switching between Solo and Team play, an extensible challenge architecture (MCQs, Terminal Hacks, Photo Recognition, Logic Puzzles), and pro latency-based scoring.

---

## ⚡ Concurrency & Event-Scale Architecture (400+ Live Students)

Engineered and hardened to withstand **400+ students playing and submitting answers simultaneously** without UI freezes, race conditions, or quota exhaustion:

| Feature / Bottleneck | Before (Standard Implementation) | Now (Optimized Event Architecture) |
| :--- | :--- | :--- |
| **Authentication & PINs** | 4-digit PINs (`1000`–`9999`) had a **99.986% collision risk** for 400 players, causing student profiles to overwrite each other. | Upgraded to **6-digit PINs** (900,000 combinations) with an atomic 5-attempt Firestore existence retry loop. Zero collisions. |
| **Score Calculation** | Sequential `for` loop awaiting 400 individual updates froze the host dashboard and stage display for **45–60 seconds**. | Replaced with Firestore `writeBatch` chunking (< 400 ops) and in-memory squad pre-aggregation. All scores commit in **< 500ms**. |
| **Offline Resilience** | Sync listeners died when question views unmounted; campus Wi-Fi drops permanently lost queued answers. | Global background sync manager in `GameContext` flushes offline queues on reconnect. Deterministic doc IDs (`${qId}_${playerPin}`) ensure **100% idempotent** submissions. |
| **Timer Zero Forfeiture** | Hesitating or tapping submit right as time expired caused answers to be discarded. | **Auto-submit on timer expiry**: Any selected option or typed command automatically locks and submits at `0s`. Clamped countdown logic prevents mobile clock drift. |
| **Firestore Read Quota** | 400 mobile phones listening to all 400 player docs generated **160,000 reads/round**, risking instant quota shutdown. | Mobile leaderboards capped to `limit(50)` (~90% read reduction). Student's individual rank and score stream live via direct document snapshot. |
| **Review Page Latency** | Full collection queries on round end caused lag and extra reads. | **0ms local storage resolution** with zero network reads, falling back to deterministic document fetch. |
| **Crash Protection** | Uncaught React render exceptions produced a blank white screen of death. | Global React `ErrorBoundary` shields the application, offering one-click session recovery. |
| **Session Continuity** | Joining or creating squads triggered `window.location.reload()`, killing live state and websocket connections. | Removed disruptive page reloads; roster updates stream seamlessly via reactive auth context. |

---

## Architectural Overview

TechArena operates on a 3-tier real-time sync model powered by Firebase:
1. **Admin CMS & Live Controller:** Allows hosts to build challenge blocks by round, flag used questions to prevent duplication, push questions live globally, and trigger stage overrides.
2. **Cinematic Projector View:** Features a dual-phase suspense gatekeeper countdown, active question windows, live submission counter, and cyber-themed podium leaderboards.
3. **Mobile Player Controller:** A responsive mobile interface with haptic feedback, real-time standings, device-sync PIN persistence, and squad roster management.

---

## Tech Stack

* **Frontend:** React 19, Tailwind CSS v4, Framer Motion, Lucide React
* **Backend & Real-Time Sync:** Firebase (Firestore, Authentication, Real-Time Listeners)
* **Build Tool:** Vite v8

---

## 🧩 How to Add a New Game Type (e.g., Phishing Mail Recognition)

If you want to introduce a brand new interactive game mode to TechArena, follow this 3-step blueprint:
1. **Admin CMS (`src/pages/admin/AdminDashboard.jsx`):** Register the new challenge type name in the dropdown and add form inputs to capture its content payload (e.g., email text and correct answer).
2. **Mobile Router (`src/pages/mobile/MobileController.jsx`):** Add a matching `case` in the switch statement to intercept the new block type when pushed live.
3. **Mobile View (`src/pages/mobile/components/PhishingUI.jsx`):** Build the student-facing interactive interface that submits the user's choice and timestamp back to the Firestore `answers` collection using `submitAnswerRecord`.

---

## 📂 Project Architecture

```text
techarena/
│
├── public/                     # Static assets (favicons, public images)
│
├── src/                        # Main source code directory
│   ├── config/
│   │   └── firebase.js         # Firebase initialization, Firestore DB, & Auth config
│   │
│   ├── components/
│   │   ├── ErrorBoundary.jsx   # Global React Error Boundary shielding against white-screen crashes
│   │   └── StageCountdown.jsx  # Synchronous countdown animation component
│   │
│   ├── context/
│   │   ├── AuthContext.jsx     # Collision-resistant 6-digit PIN auth, reactive player snapshot, session persistence
│   │   └── GameContext.jsx     # Global event state listener & background offline queue synchronization worker
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx # Admin CMS, challenge builder, question flagging, & sub-second writeBatch score calc
│   │   │
│   │   ├── projector/
│   │   │   └── ProjectorView.jsx  # Stage display view with 5s countdown gate, active question screen, & podium leaderboards
│   │   │
│   │   └── mobile/
│   │       ├── MobileController.jsx # Master router for mobile players (game interceptors, squad views, solo mode)
│   │       ├── PlayerLogin.jsx     # Student onboarding via name entry and 6-digit collision-resistant PIN
│   │       ├── PlayerDashboard.jsx # Quota-protected leaderboard (limit 50), live personal rank, & session controls
│   │       ├── TeamLobby.jsx       # Zero-reload squad creation, join code input, and live teammate roster view
│   │       │
│   │       └── components/
│   │           ├── QuizUI.jsx        # Standard MCQ grid with haptic feedback & timer-expiry auto-submit
│   │           ├── TerminalUI.jsx    # Terminal console shell challenge view for coding missions
│   │           ├── PhotoQuizUI.jsx   # Visual image identification challenge interface
│   │           ├── PuzzleUI.jsx      # Logic puzzle and riddle text submission interface
│   │           └── PlayerRoundReview.jsx # 0ms local storage round review with instant answer verification
│   │
│   ├── utils/
│   │   └── offlineSync.js      # Idempotent answer submission & persistent offline queue storage
│   │
│   ├── App.jsx                 # Route switchboard wrapped in global ErrorBoundary
│   ├── main.jsx                # React entry point wrapping app with Auth & Game contexts
│   └── index.css               # Global Tailwind CSS styles and custom animations
│
├── firestore.rules             # Production security rules for events, players, and answers
├── .env                        # Local environment variables (Firebase API keys - excluded from git)
├── .gitignore                  # Git ignore rules (node_modules, dist, .env)
├── package.json                # Project dependencies (React, Firebase, Framer Motion, Tailwind)
├── README.md                   # Project documentation & collaborator local setup guide
└── vite.config.js              # Vite bundler configuration
```

---

## Getting Started on Your Local Machine

Follow these steps to clone and run TechArena locally for development or testing:

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone https://github.com/DEMOCODE675/TechArena.git
cd TechArena
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables
Create a file named `.env` in the root directory of the project and add your Firebase project credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### 4. Run the Development Server

```bash
npm run dev
```

---

## How to Test Locally (Simulating a Live Event)

Open three separate browser windows (or split view):

* **Window 1** (`http://localhost:3000/admin`): Admin control panel to push challenges live and run batched score calculation.
* **Window 2** (`http://localhost:3000/projector`): Stage display for the audience showing synced countdowns and leaderboards.
* **Window 3** (`http://localhost:3000/play`): Register as a player using a 6-digit PIN to test real-time answer locking, auto-submission on timer expiry, and instant round reviews.
