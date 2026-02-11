# KB: TOOL IDEATION & INTEGRATION LOGIC

## 1. The DeepKit User Personas
To ideate tools, first identify who we are building for:
- **The Creator:** Needs local video tools, AI image gen (Stable Diffusion), and document management.
- **The Business Strategist:** Needs local CRM (EspoCRM), Workflow Automation (n8n), and local RAG search.
- **The Developer:** Needs Vector DBs (Qdrant), Knowledge Graphs (FalkorDB), and API management tools.

## 2. Tool Integration Checklist
Before adding a new tool to the Arsenal, ask:
1.  **Is it Local?** (Can it run in a Docker container with zero cloud calls?)
2.  **Is it High-Density?** (Does it provide data/capabilities that empower the user?)
3.  **Is it Widget-Ready?** (Can we extract 2-3 key metrics for a DeepCard?)
4.  **Is it Sovereign?** (Does it give the user control over their data?)

## 3. The Current Service Inventory (The Arsenal)
- **THE ENGINE (11000+):** Ollama (AI Backbone).
- **THE FACE (3000-3999):** Open WebUI (Chat), NotebookLM (Research), Strapi (CMS).
- **THE ENGINE ROOM (5000-5999):** n8n (Automation).
- **THE VAULT (6000-7999):** PostgreSQL, Redis, Qdrant, FalkorDB.
- **THE MONITOR (9000-9999):** Uptime Kuma (Pulse), Adminer (Data).

## 4. Ideation Gaps (Opportunities)
- **Visuals:** We need a local image gallery and tagging system.
- **Voice:** We need a local whisper-based transcription "Bay."
- **Network:** We need a local internal file storage/sharing server (like FileBrowser).
- **Security:** We need a local secret/password management "Vault."

## 5. Integration Workflow
When adding a tool:
1.  Assign a **Port** (Follow Port Philosophy).
2.  Build the **DeepKit Overlay CSS** (Force the design bible).
3.  Define the **DeepCard Widget** (What stats do we show in the Hub?).
4.  Add to **`docker-compose.yml`** and **`install.sh`**.

---
**"A new tool is a new power-up in the Arsenal."**
