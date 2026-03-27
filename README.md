# PR Bot

A local assistant bot for the Revelo PR Writer workflow.

## Architecture

- **Backend** (Windows host): Node.js + Express + MongoDB — port 3001
- **Frontend** (Ubuntu VM): Next.js + Electron — port 3000

---

## Setup

### 1. Install MongoDB on Windows

Download and install MongoDB Community Edition from the official site.
Make sure the MongoDB service is running (it starts automatically after install).

### 2. Backend (Windows)

Open a terminal in the `backend/` folder and run:

```
npm install
```

Copy `.env.example` to `.env`:

```
copy .env.example .env
```

Start the backend:

```
npm start
```

The backend listens on `0.0.0.0:3001` so the Ubuntu VM can reach it.

### 3. Find your Windows local IP

In PowerShell:

```
ipconfig
```

Look for the IPv4 address of your network adapter (e.g. `192.168.1.100`).

### 4. Frontend (Ubuntu VM)

Open a terminal in the `frontend/` folder.

Copy the env example:

```
cp .env.local.example .env.local
```

Edit `.env.local` and set the Windows IP:

```
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

Install dependencies:

```
npm install
```

Run in browser (Next.js only, no Electron):

```
npm run dev
```

Open http://localhost:3000 in the browser.

**Or** run as Electron desktop app:

```
npm run electron:dev
```

---

## Usage

1. **Issue Checker tab** — paste a GitHub issue URL, click Check Issue.
   - The bot fetches the repo and issue from GitHub's public API.
   - It evaluates against the built-in criteria and shows a Good/Bad/Warning verdict.
   - The generated first prompt appears below — copy it into Claude.

2. **Prompts tab** — generate follow-up PR review prompts or the final "please commit" prompt.

3. **Setup Commands tab** — enter repo URL, base SHA, and folder name to get the shell commands you need to run.

4. **Standards tab** — view and customise the evaluation criteria.

5. **History tab** — past issue checks.

### Backend URL

The backend URL input in the header overrides the env variable at runtime (saved in localStorage).
If you change it, the page reloads to apply the new base URL.

---

## Notes

- No Claude API key required — the bot generates prompts for you to paste manually.
- No GitHub token required — uses the public GitHub REST API (60 req/hr unauthenticated).
- The bot never executes shell commands — it only displays them for you to copy and run.
