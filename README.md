# AI Ecommerce Personalization Rules Engine

An AI-powered ecommerce SaaS dashboard that accepts user session event streams and classifies shoppers into intent segments (e.g., Browser, Comparer, Discount Seeker, Cart Abandoner, Loyal Customer, Impulse Buyer) using a hybrid rules engine combining deterministic pattern-matching and LLM-powered reasoning.

Developed for the **Helium Software Engineer Build Assignment**.

---

## 🚀 Live Demo & Visuals

* **Sleek Modern SaaS Theme**: Fully responsive dark mode dashboard with indigo, purple, and emerald color palettes.
* **Interactive Simulator**: Modify event streams click-by-click or type custom events and see the engine stream thoughts and re-evaluate shopper behaviors in real time.
* **RAG & A/B Testing**: Pulls past shopper history to guide the AI decisions, and provides visual call-to-actions to test conversions on variant nudges.
* **Analytics Board**: Custom, responsive SVG graphs comparing Variant A vs Variant B performance and segment breakdowns.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript (Strict typing)
* **Styling**: Tailwind CSS
* **Database**: SQLite (via Prisma 7, utilizing pure JS LibSQL client adapters for compiler compatibility)
* **Auth**: Secure httpOnly cookie JWT sessions (via zero-dependency `jose`)
* **AI Orchestration**: OpenAI API (`gpt-4o-mini` model)

---

## 📂 Simplified File Mapping

To make the codebase easy to navigate and understand, the files are structured into clear architectural layers:

### 🎨 1. Frontend (User Interface & Client Views)
*   [app/page.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/page.tsx): The main dashboard layout and brand introduction.
*   [app/login/page.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/login/page.tsx): Premium glassmorphic sign-in panel for administrators.
*   [app/analytics/page.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/analytics/page.tsx): Analytics dashboard compiling metric cards and custom SVG charts.
*   [components/RulesEngineDemo.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/components/RulesEngineDemo.tsx): Core tab orchestrator managing sessions and live AI streaming logs.
*   [components/SessionSimulator.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/components/SessionSimulator.tsx): Interactive sandbox to trigger custom customer clicks.
*   [components/ShopperCard.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/components/ShopperCard.tsx): Displays classification segment metrics and offers claimant buttons.
*   [components/MonitoringPanel.tsx](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/components/MonitoringPanel.tsx): Deployment performance, CPU, memory, and database metrics.
*   [app/globals.css](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/globals.css): Custom CSS glow components, scrollbars, and Tailwind configuration.

### ⚙️ 2. Backend (Orchestration, Rules, & APIs)
*   [app/actions.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/actions.ts): Next.js Server Actions handling shopper evaluation, admin authentication, and conversions.
*   [app/api/analyze/stream/route.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/app/api/analyze/stream/route.ts): Node.js route streaming step-by-step AI thoughts and persisting metadata logs.
*   [lib/openai.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/lib/openai.ts): OpenAI system prompt building, RAG injection, and rate-limit fallbacks.
*   [lib/rules.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/lib/rules.ts): Deterministic offline rule matching engine for rapid shopper analysis.
*   [lib/auth.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/lib/auth.ts): Signs and verifies JWT tokens securely.
*   [middleware.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/middleware.ts): Edge-compatible router checking cookies and guarding admin paths.

### 🗄️ 3. Database (Schema, Seeds, & Client)
*   [prisma/schema.prisma](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/prisma/schema.prisma): Database models defining `User`, `ShopperSession`, and `ABTestStats`.
*   [prisma/seed.js](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/prisma/seed.js): Seeds the database with default admin credentials, historical sessions, and chart baselines.
*   [lib/db.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/lib/db.ts): Global cached connection to the SQLite instance using LibSQL.
*   [dev.db](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/prisma/dev.db): Local SQLite binary file storing application data.

### 🔧 4. Configuration (Settings & Builders)
*   [prisma.config.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/prisma.config.ts): Handles variables for the Prisma CLI.
*   [next.config.ts](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/next.config.ts): Next.js settings, overriding ESLint blocker scripts.
*   [.env](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/.env) & [.env.local](file:///d:/A%20Personal/College/Projects/Ecommerce%20Engine/.env.local): Connection strings and OpenAI credentials.

---

## 🧠 Hybrid Engine Architecture

To build a robust engineering solution rather than a simple API wrapper, this project uses a **hybrid classification flow**:

```
[User Session Event Stream]
            │
            ▼
┌───────────────────────────────┐
│  Deterministic Rules Engine   │ ◄─── Matches standard regex-based patterns
└───────────────┬───────────────┘      (e.g., Add to Cart without Purchase)
                │
                │ RuleMatchResult (Triggered Rules, Suggested State)
                ▼
┌───────────────────────────────┐
│     AI reasoning Wrapper      │ ◄─── LLM (gpt-4o-mini) evaluates raw events
└───────────────┬───────────────┘      and rule suggestion to output finalized JSON
                │
                ▼
[ShopperPersonalizationCard] ─── Displays Classification, Confidence, Evidence,
                                 Recommended Action, and reasoning.
```

1. **Deterministic Rule Engine (`lib/rules.ts`)**: Runs locally on the server. Inspects events for explicit patterns (such as repeat purchases for `Loyal Customer`, adding to cart but not purchasing for `Cart Abandoner`, applying a coupon for `Discount Seeker`). It produces a list of matched rule IDs and a preliminary state suggestion.
2. **AI Reasoning Wrapper (`lib/openai.ts`)**: Sends the raw event stream along with the rule suggestions to the OpenAI API. The LLM acts as the reasoning layers to confirm the rule or refine it if nuanced activity suggests another segment (e.g. an *Impulse Buyer* checking out in 3 steps who also happened to apply a coupon). It outputs structured JSON containing the classification, confidence, evidence bullets, personalized marketing action, and reasoning text.
3. **Graceful Fallbacks**: If the AI model fails due to network, API limit, or key issues, the application automatically catches the error and surfaces it cleanly on the shopper's card, displaying the offline deterministic rules prediction in the UI so the application remains functional.

---

## ⚙️ Installation & Running Locally

### Prerequisites

Ensure you have **Node.js** (v18.0.0 or higher) and **npm** installed.

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Setup Environment Variables
Verify `.env` has:
```env
DATABASE_URL="file:prisma/dev.db"
```
And add your OpenAI key in `.env.local`:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Initialize Database Tables & Seed
Synchronize the local SQLite database schema and run the seed script:
```bash
npx prisma db push
node prisma/seed.js
```

### 4. Run the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Log in using `admin` / `password123`.
