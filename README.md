# 🤖 AI Accountability Bot

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

An intelligent, autonomous AI accountability coach designed to track your daily progress across multiple platforms and actively push you towards your goals.

Rather than just passively recording data, this bot utilizes adaptive coaching strategies, self-editing memory structures, and contextual bandits to learn *how* to motivate you best. It runs entirely on free-tier infrastructure (GitHub Actions, Supabase, and Google Gemini).

## 🌟 Key Features

- **Multi-Platform Tracking**: Automatically gathers activity metrics via GitHub API and Playwright scrapers for X (Twitter) and LinkedIn.
- **Cognitive Memory Architecture**: Inspired by Letta/MemGPT, it utilizes self-editing memory blocks (Persona, Human, World, Scratchpad) to maintain deep context over time.
- **Contextual Bandit Engine**: Implements Thompson Sampling to dynamically learn which coaching strategy (e.g., tough love, encouraging, analytical) works best for you.
- **Dynamic Knowledge Graph**: Automatically extracts and tracks your projects, tools, collaborators, and goals as entities and relationships.
- **Intervention Engine**: Determines the optimal timing for messages and interventions based on your historical responsiveness.
- **Curiosity Engine**: Proactively formulates and asks targeted questions to deepen its understanding of your goals and personalize future coaching.
- **Zero-Cost Infrastructure**: Designed to run statelessly via GitHub Actions crons, persisting data to Supabase, and utilizing the Gemini Flash/Pro free tiers.

## 🧠 Architecture Pipeline

The bot's nightly pipeline consists of several autonomous stages:
1. **Collection**: Gathers daily activity from GitHub, X, and LinkedIn.
2. **Parsing & Scoring**: Uses LLMs to parse raw HTML/scraper data and calculates a daily activity score.
3. **Memory Retrieval**: Fetches working memory, similar episodic memories, and updates the knowledge graph.
4. **Strategy Selection**: The Multi-Armed Bandit selects the optimal coaching persona for the day.
5. **Generation & Delivery**: Generates the coaching message, appends a curiosity question, and dispatches it via Telegram.
6. **Reflection**: Processes the reward from the previous day's interaction to update the bandit model.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase](https://supabase.com/) account (for PostgreSQL database)
- Google Gemini API Key
- Telegram Bot Token (via [@BotFather](https://t.me/botfather))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/accountability-bot.git
   cd accountability-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *Required Variables:*
   - `DATABASE_URL`: Supabase Postgres connection string
   - `DIRECT_URL`: Supabase direct connection (for Prisma migrations)
   - `GEMINI_API_KEY`: Google Gemini API key
   - `TELEGRAM_BOT_TOKEN`: Telegram bot token from BotFather
   - `ENCRYPTION_KEY`: 32-byte hex key for encrypting platform session cookies

4. **Initialize Database**
   Generate the Prisma client and push the schema to Supabase:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Usage

**Run the development server:**
```bash
npm run dev
```

**Run the nightly pipeline manually:**
```bash
npm run pipeline:nightly
```

**Build for production:**
```bash
npm run build
```

## 🏗️ Deployment

This project is optimized for deployment via **GitHub Actions**. 

1. Push your code to GitHub.
2. Add your `.env` variables to your repository's **Settings > Secrets and variables > Actions**.
3. The included GitHub Action workflow (if configured) will run the pipeline nightly, executing the data collection, LLM analysis, and message delivery completely autonomously.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
