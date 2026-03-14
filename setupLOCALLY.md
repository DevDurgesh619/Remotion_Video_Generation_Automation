# Shape Motion Lab - Local Setup Guide

---

## Important: Branch Info

This repo has two branches:

| Branch | Purpose |
|--------|---------|
| `main` | Legacy / base branch |
| **`phase1-restore`** | **Active working branch — use this one** |

The full working app (web UI + scripts + pipeline) lives on `phase1-restore`. Always make sure you're on this branch:

```bash
git clone <your-repo-url> shape-motion-lab
cd shape-motion-lab
git checkout phase1-restore
```

If you already cloned the repo:

```bash
git checkout phase1-restore
git pull origin phase1-restore
```

---
# Full Web App Setup (Production Pipeline)

The sections below cover the full web app with Next.js UI, database, and cloud storage.

---

## What is this project?

Shape Motion Lab is a **deterministic motion graphics video generation platform**. You type a simple prompt like _"a red circle scales up and fades in"_, and the system automatically generates a polished MP4 video.

### How the pipeline works

```
User Prompt
    |
    v
Step 1: Prompt Received
    |
Step 2: Prompt Expansion (GPT-4o)
    |   Simple prompt -> detailed motion description
    |
Step 3: Spec Generation (GPT-4o)
    |   Detailed prompt -> Motion Spec JSON (objects, timeline, easing)
    |
Step 4: Spec Ready
    |
Step 5: Code Generation (GPT-5-mini)
    |   Spec JSON -> React/Remotion JSX animation code
    |
Step 6: Code Ready (TypeScript validation + auto-fix if needed)
    |
Step 7: Render (Remotion + Chromium headless + FFmpeg)
    |   JSX code -> MP4 video file
    |
Step 8: Done - video uploaded to R2 cloud storage
```

**Key components:**

| Component | Role |
|-----------|------|
| **Next.js** | Web UI + API server |
| **OpenAI** | LLM for prompt expansion, spec generation, and code generation |
| **Remotion** | React-based video renderer (uses Chromium + FFmpeg under the hood) |
| **Neon DB** | PostgreSQL database for job state |
| **Cloudflare R2** | Cloud storage for videos, code, and specs |

Jobs are processed one at a time via an in-memory serial queue. The frontend receives real-time progress updates via Server-Sent Events (SSE).

---

## Prerequisites

- **Node.js 20+** (recommended: v20.x LTS)
- **npm 10+**
- **Git**

### External accounts needed

| Service | What for | Sign up |
|---------|----------|---------|
| **OpenAI** | GPT-4o + GPT-5-mini API access | https://platform.openai.com |
| **Neon** | Serverless PostgreSQL | https://neon.tech |
| **Cloudflare R2** | Video/file storage (S3-compatible) | https://dash.cloudflare.com |

---

## Step 1: Clone the repository

```bash
git clone <your-repo-url> shape-motion-lab
cd shape-motion-lab
```

## Step 2: Install dependencies

```bash
npm install
```

This installs Next.js, Remotion, OpenAI SDK, Neon client, AWS SDK (for R2), and all other dependencies.

## Step 3: Install Remotion's headless browser

Remotion needs a bundled Chromium to render videos:

```bash
npx remotion browser ensure
```

This downloads and caches the correct Chromium version. Takes a few minutes on first run.

## Step 4: Set up environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if .env.example exists, otherwise create manually
```

Add the following variables to `.env`:

```env
# OpenAI - for prompt expansion, spec generation, and code generation
OPENAI_API_KEY=sk-proj-your-key-here

# Neon PostgreSQL - for storing job state
NEON_DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Cloudflare R2 - for storing rendered videos, specs, and code
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=remotion
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com/remotion
```

### How to get each value

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Ensure your account has access to `gpt-4o` and `gpt-5-mini` models

**Neon Database URL:**
1. Go to https://console.neon.tech
2. Create a new project
3. Copy the connection string from the dashboard
4. The `jobs` table is auto-created on first run (no manual migration needed)

**Cloudflare R2:**
1. Go to Cloudflare Dashboard > R2
2. Create a bucket named `remotion` (or your preferred name)
3. Go to R2 > Manage R2 API Tokens > Create API token
4. Copy the Account ID, Access Key ID, and Secret Access Key
5. The endpoint format is: `https://<account-id>.r2.cloudflarestorage.com/<bucket-name>`

## Step 5: Start the development server

```bash
npm run dev
```

This starts the Next.js dev server at **http://localhost:3000**.

Open your browser and go to `http://localhost:3000`. You should see the Shape Motion Lab homepage with a prompt input form.

## Step 6: (Optional) Start Remotion Studio

To preview and debug Remotion compositions visually:

```bash
npm run dev:remotion
```

This opens Remotion Studio in your browser, where you can see the `GeneratedMotion` composition and preview animations frame-by-frame.

---

## How to generate a video

### Via the Web UI

1. Open `http://localhost:3000`
2. Type a prompt in the text area (see prompt examples below)
3. Click submit
4. You'll be redirected to the job detail page
5. Watch the 8-step progress bar update in real-time
6. When done, the video player appears with your rendered MP4

### Via the API (curl)

**Submit a job:**

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A red circle fades in and scales up"}'
```

Response:

```json
{ "id": "abc123-uuid-here" }
```

**Check job status:**

```bash
curl http://localhost:3000/api/jobs/<job-id>
```

**Stream real-time progress (SSE):**

```bash
curl -N http://localhost:3000/api/jobs/<job-id>/stream
```

**Download the video:**

```bash
curl http://localhost:3000/api/assets?key=videos/video_<job-id>.mp4
```

---

## Prompt format guide

### Simple prompts (recommended for getting started)

Just describe what you want to see in plain English:

```
"A red circle fades in and scales up"
"A blue square slides in from the left and rotates 360 degrees"
"Three circles bounce in one by one"
"A bar chart showing monthly sales data"
"Text that types out letter by letter"
```

The system automatically expands simple prompts into detailed motion descriptions. You don't need to specify colors, timing, or coordinates unless you want to.

### JSON prompt format (advanced)

The API accepts a simple JSON body:

```json
{
  "prompt": "Your animation description here (1-3000 characters)"
}
```

That's it - just a `prompt` string field. The pipeline handles everything else.

### Tips for good prompts

| Do | Don't |
|----|-------|
| Describe what objects look like | Specify pixel coordinates |
| Describe motion/behavior | Write code or JSON specs |
| Keep it to 3-5 objects for best results | Request 15+ objects (may exceed memory) |
| Use common shapes (circle, square, triangle) | Use overly abstract descriptions |
| Specify colors if you care about them | Leave everything vague |

### Example prompts by complexity

**Level 1.0 - Basic shapes:**
- `"A green circle appears in the center and pulses"`
- `"A red square rotates slowly"`

**Level 1.1 - Physics/complex single shape:**
- `"A ball drops from the top and bounces three times"`
- `"A pendulum swings back and forth"`

**Level 1.2 - Multi-object coordination:**
- `"Three circles orbit around a central point"`
- `"A loading spinner animation with dots"`
- `"A simple bar chart with 5 bars that grow from zero"`

---

## Understanding the Motion Spec

The pipeline generates an intermediate **Motion Spec JSON** that defines the animation deterministically. Here's an annotated example:

```json
{
  "scene": "circle_fade_in",       // Unique scene name (snake_case)
  "duration": 5,                    // Total duration in seconds
  "fps": 30,                       // Frames per second (always 30)
  "canvas": { "w": 1920, "h": 1080 }, // Canvas resolution
  "bg": "#FFFFFF",                  // Background color (hex)
  "objects": [
    {
      "id": "circle_1",            // Unique object ID
      "shape": "circle",           // Shape type
      "diameter": 120,             // Size in pixels
      "color": "#E53935",          // Fill color
      "pos": [0, 0],               // Position [x, y] from CENTER
      "opacity": 0,                // Initial opacity (0-1)
      "scale": 1                   // Initial scale
    }
  ],
  "timeline": [
    {
      "target": "circle_1",        // Which object to animate
      "time": [0, 0.5],            // Start and end time in seconds
      "easing": "ease-out",        // Easing function
      "opacity": [0, 1]            // Animate opacity from 0 to 1
    },
    {
      "target": "circle_1",
      "time": [0.5, 3.5],
      "easing": "ease-out",
      "scale": [1, 2]              // Animate scale from 1x to 2x
    }
  ]
}
```

### Coordinate system

- **Origin (0, 0) = center of the canvas** (not top-left!)
- X range: -960 to +960 (for 1920px width)
- Y range: -540 to +540 (for 1080px height)
- Positive X = right, Positive Y = down
- Objects positioned beyond these ranges are off-screen

### Available shape types

`circle`, `rectangle`, `triangle`, `polygon`, `polyline`, `text`, `pie`, `donut`, `asset`

### Available easing functions

`linear`, `ease-in`, `ease-out`, `ease-in-out`, `bounce`, `spring`

### Animatable properties

`x`, `y`, `opacity`, `scale`, `rotation`, `color`, `width`, `height`, `diameter`

---

## Batch scripts (advanced)

The `/scripts` directory contains standalone Node.js scripts for batch operations:

### Convert prompts to specs

```bash
node scripts/convertToSpec.js
```

Reads prompts and generates Motion Spec JSON files in `machine_specs_v2/`.

### Batch render specs to videos

```bash
node scripts/batchRunner.js
```

Renders multiple specs to MP4 videos and uploads to R2.

### Expand a single prompt

```bash
node scripts/expandPrompt.js
```

Takes a simple prompt and outputs the expanded version.

---

## Available npm scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (http://localhost:3000) |
| `npm run dev:remotion` | Start Remotion Studio for visual preview |
| `npm run build` | Build Next.js for production |
| `npm run start` | Start production Next.js server |
| `npm run build:remotion` | Bundle Remotion for production |
| `npm run lint` | Run ESLint + TypeScript type checking |
| `npm run upgrade` | Upgrade Remotion to latest version |

---

## Project structure

```
shape-motion-lab/
├── app/                      # Next.js app router
│   ├── page.tsx              # Homepage (prompt form + job list)
│   ├── api/
│   │   ├── jobs/             # Job CRUD + SSE streaming endpoints
│   │   └── assets/           # R2 asset download endpoint
│   └── jobs/[id]/            # Job detail page + components
├── components/               # React UI components
│   ├── PromptForm.tsx        # Prompt input form
│   ├── JobList.tsx           # Recent jobs list
│   ├── VideoPlayer.tsx       # Video preview player
│   ├── ProgressIndicator.tsx # 8-step progress bar
│   └── LiveUpdater.tsx       # SSE real-time updates
├── lib/                      # Backend logic
│   ├── queue.ts              # Serial job queue + SSE broadcaster
│   ├── db.ts                 # Neon PostgreSQL client
│   ├── r2.ts                 # Cloudflare R2 upload/download
│   └── pipeline/             # Core generation pipeline
│       ├── promptExpander.ts # Step 2: Simple -> detailed prompt
│       ├── specGenerator.ts  # Step 3: Prompt -> Motion Spec JSON
│       ├── codeGenerator.ts  # Step 5: Spec -> Remotion JSX code
│       └── renderer.ts       # Step 7: JSX -> MP4 video + upload
├── src/                      # Remotion source
│   ├── index.ts              # Remotion entry point
│   ├── Root.tsx              # Remotion composition config
│   ├── GeneratedMotion.tsx   # Auto-generated animation (overwritten per job)
│   └── assets/               # SVG asset registry
├── scripts/                  # Standalone batch scripts
├── machine_specs_v2/         # Generated spec examples
├── prompts/                  # Prompt datasets by difficulty level
├── remotion.config.ts        # Remotion rendering config
├── next.config.ts            # Next.js config
├── Dockerfile                # Production Docker image
└── railway.json              # Railway deployment config
```

---

## Troubleshooting

**"Cannot find module" errors after install:**
```bash
rm -rf node_modules package-lock.json && npm install
```

**Remotion browser not found:**
```bash
npx remotion browser ensure
```

**TypeScript errors on render:**
The pipeline auto-checks TypeScript before rendering and attempts to fix code if it fails. Check the terminal logs for details.

**Render fails with SIGKILL / OOM:**
Remotion rendering needs significant RAM (Chromium + FFmpeg). Ensure your machine has at least 2GB free RAM. For Docker/cloud deployments, allocate at least 2GB to the container.

**Database connection errors:**
- Verify your `NEON_DATABASE_URL` is correct
- Ensure the Neon project is not paused (free tier pauses after inactivity)
- The `jobs` table auto-creates on first connection

**R2 upload errors:**
- Verify all `R2_*` environment variables are set correctly
- Ensure the R2 bucket exists and the API token has read/write permissions

## Quick Start: Run the Pipeline Manually Using Scripts

If you don't want to run the full web app (Next.js + database + R2), you can use the standalone scripts in `/scripts` to run each pipeline step manually. These scripts are independent of the production `lib/` pipeline and write outputs to local files.

### What you need

- Node.js 20+
- An OpenAI API key (set in `.env`)
- That's it. No database, no R2, no Docker needed.

Create a minimal `.env` in the project root:

```env
OPENAI_API_KEY=sk-proj-your-key-here
```

Install dependencies:

```bash
npm install
npx remotion browser ensure
```

---

### Pipeline overview (scripts mode)

```
scripts/simplePrompts.json       (your simple prompts)
         |
         v
  [Step A] expandPrompt.js       (simple -> detailed prompt)
         |
         v
     prompts.json                (expanded detailed prompts)
         |
         v
  [Step B] convertToSpec.js      (detailed prompt -> motion spec JSON)
         |
         v
  machine_specs_v2/spec_NNN.json (one spec file per prompt)
         |
         v
  [Step C] batchRunner.js        (spec -> code -> render -> MP4)
         |
         v
  outputs/video_NNN.mp4          (final rendered videos)
  outputs/code_NNN.tsx           (generated animation code)
  results.csv                    (summary log)
```

---

### Step A: Expand simple prompts into detailed prompts

**Input:** `scripts/simplePrompts.json`
**Output:** `prompts.json`

1. Edit `scripts/simplePrompts.json` with your prompts:

```json
[
  { "id": 501, "simplePrompt": "a circle appears in the center and slowly grows bigger" },
  { "id": 502, "simplePrompt": "a square moves from left to right" },
  { "id": 503, "simplePrompt": "three dots appear one by one in a horizontal line" }
]
```

- `id` — unique number ID (used to name output files like `spec_501.json`, `video_501.mp4`)
- `simplePrompt` — plain English description of what you want to see

2. Run the expander:

```bash
node scripts/expandPrompt.js
```

3. Check the output in `prompts.json`. Each prompt is now expanded with exact colors, sizes, timing, and positions:

```json
[
  {
    "id": 501,
    "category": "coordination",
    "prompt": "Centered Circle Scale-Up. White background (#FFFFFF). Canvas 1920x1080. A red circle (#E53935, diameter 120px) positioned at center. Animation (5s): 0-0.5s: Circle fades in..."
  }
]
```

> You can also write detailed prompts directly into `prompts.json` and skip this step entirely.

---

### Step B: Convert detailed prompts into Motion Spec JSON

**Input:** `prompts.json`
**Output:** `machine_specs_v2/spec_NNN.json` (one file per prompt)

```bash
node scripts/convertToSpec.js
```

This reads each prompt from `prompts.json` and generates a Motion Spec JSON file. Check the output:

```bash
cat machine_specs_v2/spec_501.json
```

Example output:

```json
{
  "scene": "circle_scale_up",
  "duration": 5,
  "fps": 30,
  "canvas": { "w": 1920, "h": 1080 },
  "bg": "#FFFFFF",
  "objects": [
    { "id": "circle_1", "shape": "circle", "diameter": 120, "color": "#E53935", "pos": [0, 0], "opacity": 0 }
  ],
  "timeline": [
    { "target": "circle_1", "time": [0, 0.5], "easing": "ease-out", "opacity": [0, 1] },
    { "target": "circle_1", "time": [0.5, 3.5], "easing": "ease-out", "scale": [1, 2] }
  ]
}
```

> If you want to hand-write specs, just create JSON files in `machine_specs_v2/` following this format and skip to Step C.

---

### Step C: Generate code and render videos

**Input:** `prompts.json` + `machine_specs_v2/spec_NNN.json`
**Output:** `outputs/video_NNN.mp4` + `outputs/code_NNN.tsx` + `results.csv`

```bash
mkdir -p outputs
node scripts/batchRunner.js
```

For each prompt, this script:
1. Reads the spec JSON from `machine_specs_v2/`
2. Generates Remotion JSX animation code via GPT-5-mini
3. Runs static validation (no loops, no template literals, no framer-motion)
4. Writes the code to `src/GeneratedMotion.tsx` and `outputs/code_NNN.tsx`
5. Runs TypeScript check (auto-retries with error feedback if it fails)
6. Renders the video using Remotion (Chromium + FFmpeg)
7. Saves the MP4 to `outputs/video_NNN.mp4`
8. Logs results to `results.csv`

Videos that already exist in `outputs/` are automatically skipped.

---

### Where to find your results

| Output | Location |
|--------|----------|
| Rendered videos | `outputs/video_501.mp4`, `outputs/video_502.mp4`, ... |
| Generated code | `outputs/code_501.tsx`, `outputs/code_502.tsx`, ... |
| Motion specs | `machine_specs_v2/spec_501.json`, ... |
| Results log | `results.csv` |
| Error log | `errors_tracing.json` (auto-created if any step fails) |

---

### Running a single prompt end-to-end (quick test)

If you just want to test one prompt without batch processing:

1. Create `scripts/simplePrompts.json` with a single entry:

```json
[
  { "id": 999, "simplePrompt": "a blue circle bounces across the screen" }
]
```

2. Run all three steps:

```bash
node scripts/expandPrompt.js
node scripts/convertToSpec.js
mkdir -p outputs && node scripts/batchRunner.js
```

3. Open your video:

```bash
open outputs/video_999.mp4
```

---

### Skipping steps (mix and match)

You can enter the pipeline at any point:

| Want to skip | What to do |
|-------------|------------|
| Skip prompt expansion | Write detailed prompts directly in `prompts.json`, then run Step B + C |
| Skip spec generation | Write spec JSON files directly in `machine_specs_v2/`, then run Step C only |
| Skip code generation | Place pre-written `.tsx` code in `outputs/code_NNN.tsx`, then run Step C (it reuses existing code) |

---

### Preview animations in Remotion Studio

After Step C generates code to `src/GeneratedMotion.tsx`, you can preview it visually:

```bash
npm run dev:remotion
```

This opens Remotion Studio in your browser where you can scrub through frames, inspect the animation, and debug visually before rendering to MP4.

---

### Troubleshooting (scripts mode)

**"Missing spec for NNN"** — The spec file doesn't exist yet. Run `node scripts/convertToSpec.js` first.

**"TypeScript error"** — The generated code has type issues. The script auto-retries with error feedback. If it still fails, check `outputs/code_NNN.tsx` and fix manually.

**"Render failed"** — Usually a memory issue or bad generated code. Check `errors_tracing.json` for details. Ensure your machine has 2GB+ free RAM.

**"Static issues: .map() loop detected"** — The LLM used a loop pattern. The script auto-retries. If it persists, the code still usually renders fine.

---
---

