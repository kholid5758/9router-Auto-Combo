# 9router Auto-Combo

Standalone Auto-Free, Super-Combos, Model Routing Engine, and Management Dashboard for **9Router**.

## Features
- **Auto-Free Aggregation Engine**: Scrapes and synchronizes free coding and reasoning models from 15+ providers.
- **Live Pre-Test Verification**: Fast health checks and latency probes before model injection.
- **Quality-Based Tiering**: Empirically ranks models into `auto-free`, `auto-smart`, `auto-fast`, and `auto-code`.
- **Quota & Cooldown Management**: Auto-detects 429 quota exhaustion and parks models to temporary cooldown.
- **REST API First Architecture**: Directly interfaces with 9router via native HTTP endpoints (`/api/models`, `/api/models/test`, `/api/models/disabled`).
- **Modern Dashboard UI**: 9router theme with macOS window decorations, dark mode cards, real-time metrics, and CLI stream logger.
- **Master Password Auth**: Protected with HMAC session tokens matching 9router master credentials.

## Getting Started

### Installation
```bash
npm install
npm run build
npm start
```

Default port: `20135` (configurable in `.env`).
