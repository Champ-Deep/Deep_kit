# KB: PORT PHILOSOPHY & TECHNICAL STRUCTURE

## 1. The Port Zoning System
DeepKit organizes services into "Functional Bays" based on port ranges. This prevents conflicts and provides a mental map for the user.

| Range | Zone Name | DeepKit Concept | Description |
| :--- | :--- | :--- | :--- |
| **3000 - 3999** | **THE FACE** | The Hub Frontend | User-facing dashboards and visual tools. |
| **5000 - 5999** | **THE ENGINE** | Logic & Orchestration | Automation, APIs, and "Workforce" services. |
| **6000 - 7999** | **THE VAULT** | Storage & Knowledge | Databases (SQL/NoSQL), Vectors, and Graphs. |
| **9000 - 9999** | **THE MONITOR** | Admin & Pulse | System health, monitoring, and database management. |
| **11000+** | **THE BRAIN** | AI Runtimes | Local LLMs, inference engines, and heavy compute. |

## 2. Infrastructure Standards
- **Docker First:** All tools must be containerized.
- **Unified Network:** All containers connect to `deepkit-network`.
- **Naming Convention:** Containers use the prefix `deepkit-` (e.g., `deepkit-store`, `deepkit-engine`).
- **Data Persistence:** Use Docker Volumes mapped to `/Users/champion/DeepKit/data/` or similar.

## 3. The "Nexus" Architecture
The "Nexus" is the idea that every tool is interconnected. 
- **The Central Hub:** Acts as the traffic controller.
- **Port Discovery:** The Hub should scan its own port ranges to see which "Bays" are online.
- **Identity Injection:** Branding (CSS) is injected via volume mounts to ensure consistency across third-party tools.

## 4. Connectivity Logic
- **Incoming:** Port triggers or user UI interactions.
- **Processing:** Logic handled by the `DEEPKIT_ORCHESTRATOR` (n8n).
- **Storage:** Metadata stored in `DEEPKIT_STORE` (Postgres).
- **Intelligence:** RAG/Inference handled by `DEEPKIT_ENGINE` (Ollama).

---
**"Standardized ports are the nervous system of the Sovereign Console."**
