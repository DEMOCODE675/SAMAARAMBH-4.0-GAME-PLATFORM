<img width="5481" height="5966" alt="SAMARAMBH png" src="https://github.com/user-attachments/assets/b5af5f42-f0b3-446f-9a40-187c3140b29f" />

#  TechArena: Real-Time Multi-Mode Competitive Quiz Platform

TechArena is a high-performance, real-time competitive gaming and evaluation platform built for college tech events (such as *SAMARAMBH*). It features seamless mode switching between Solo and Team play, an extensible challenge architecture (MCQs, Terminal Hacks, Photo Recognition, Logic Puzzles), and pro latency-based scoring.

---

##  Architectural Overview

TechArena operates on a 3-tier real-time sync model powered by Firebase:
1. **Admin CMS & Live Controller:** Allows hosts to build challenge blocks by round, flag used questions to prevent duplication, push questions live globally, and trigger stage overrides.
2. **Cinematic Projector View:** Features a dual-phase suspense gatekeeper countdown, active question windows, and cyber-themed podium leaderboards.
3. **Mobile Player Controller:** A responsive mobile interface with haptic feedback, real-time standings, device-sync PIN persistence, and squad roster management.

---

##  Tech Stack

* **Frontend:** React, Tailwind CSS, Framer Motion
* **Backend & Real-Time Sync:** Firebase (Firestore, Authentication, Real-Time Listeners)
* **Build Tool:** Vite

---

##  Getting Started on Your Local Machine

Follow these steps to clone and run TechArena locally for development or testing:

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone [https://github.com/DEMOCODE675/TechArena.git](https://github.com/DEMOCODE675/TechArena.git)
cd TechArena


2. Install Dependencies

npm install

3. Configure Environment Variables
Create a file named .env in the root directory of the project and add your Firebase project credentials

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here


4. Run the Development Server

npm run dev


- How to Test Locally

Open three separate browser windows (or use split view):

Window 1 ( http://localhost../admin ): Navigate to your admin route to build challenges and control live states.

Window 2 ( http://localhost../projector ): Display the stage view for the audience.

Window 3 ( http://localhost../play ): Register as a player (/play) using a Device Sync PIN to test answering questions, joining squads, and viewing real-time latency scoring.


** TechArena Project Folder Architecture **

techarena/
│
├── public/                     # Static assets (favicons, public images)
│
├── src/                        # Main source code directory
│   ├── config/                 
│   │   └── firebase.js         # Firebase initialization, Firestore DB, & Auth config
│   │
│   ├── context/                
│   │   ├── AuthContext.jsx     # Global authentication, anonymous Firebase login, and PIN session persistence
│   │   └── GameContext.js      # Global real-time listener for event state (playing, waiting, activeQuestion)
│   │
│   ├── pages/                  
│   │   ├── admin/              
│   │   │   └── AdminDashboard.jsx # Admin CMS & Live Controller (Round sorting, challenge builder, question used flagging, latency score calc)
│   │   │
│   │   ├── projector/          
│   │   │   └── ProjectorView.jsx  # Stage display view with 5s countdown gate, active question screen, & podium leaderboards
│   │   │
│   │   └── mobile/             
│   │       ├── MobileController.jsx # Master router for mobile players (handles game interceptors, team views, and solo mode switching)
│   │       ├── PlayerLogin.jsx     # Student onboarding screen via name entry and auto-generated Device Sync PIN
│   │       ├── PlayerDashboard.jsx # Solo/Team standings toggle, rank tracking cards, and conditional session controls
│   │       ├── TeamLobby.jsx       # Squad creation, join code input, and live teammate roster view
│   │       │
│   │       └── components/     
│   │           ├── QuizUI.jsx        # Standard MCQ answering grid for students with haptic feedback
│   │           ├── TerminalUI.jsx    # Terminal console shell challenge view for coding missions
│   │           ├── PhotoQuizUI.jsx   # Visual image identification challenge interface
│   │           └── PuzzleUI.jsx      # Logic puzzle and riddle text submission interface
│   │
│   ├── App.jsx                 # Main application component / route switchboard
│   ├── main.jsx                # React entry point wrapping app with Auth & Game contexts
│   └── index.css               # Global Tailwind CSS styles and custom animations
│
├── .env                        # Local environment variables (Firebase API keys - excluded from git)
├── .gitignore                  # Git ignore rules (node_modules, dist, .env)
├── package.json                # Project dependencies (React, Firebase, Framer Motion, Tailwind)
├── README.md                   # Project documentation & collaborator local setup guide
└── vite.config.js              # Vite bundler configuration