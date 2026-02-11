# DEEPKIT Modules Guide

> "Your Personal AI. Locally Contained. Locally Empowered."

DEEPKIT is modular - you only install what you need. This guide explains each module.

---

## Core Services (Always Installed)

These 3 services form the foundation and are always included:

### DEEPKIT_STORE (PostgreSQL)
- **What it does**: Stores all your data reliably
- **Port**: 5432 (internal)
- **Why it's included**: Required by DEEPKIT_ORCHESTRATOR, DEEPKIT_CONTENT, and other apps

### DEEPKIT_CACHE (Redis)
- **What it does**: Speeds up your applications
- **Port**: 6379 (internal)
- **Why it's included**: Makes everything faster, handles job queues

### DEEPKIT_ENGINE (Ollama)
- **What it does**: Runs AI models locally on your computer
- **Port**: 11434
- **Why it's included**: Powers all AI features without cloud costs
- **Note**: First run downloads a ~4GB model

---

## DEEPKIT_ORCHESTRATOR (Workflow Automation)

**"I want to automate tasks and connect apps"**

### What is it?
DEEPKIT_ORCHESTRATOR is your visual workflow automation engine. Connect apps, automate workflows, no coding required.

### URL
http://localhost:5678

### Examples of what you can do:
- When you receive an email with an attachment, save it to Dropbox
- Post to social media on a schedule
- Sync data between apps automatically
- Send Slack notifications when something happens

### Getting Started
1. Go to http://localhost:5678
2. Click "Add workflow"
3. Drag and drop nodes to build automations
4. Connect your apps using API keys

### Tips
- Start with simple 2-3 step workflows
- Use the "HTTP Request" node to connect to any API
- Schedule workflows to run automatically

---

## DEEPKIT_CHAT (AI Conversation Interface)

**"I want to chat with local AI models"**

### What is it?
DEEPKIT_CHAT is your private AI conversation interface. Like ChatGPT, but everything runs locally on your computer. Your conversations stay private.

### URL
http://localhost:3001

### Examples of what you can do:
- Ask questions and get AI-powered answers
- Brainstorm ideas
- Write and edit content
- Analyze text

### Getting Started
1. Go to http://localhost:3001
2. Start typing in the chat box
3. The AI will respond (first response may be slow as the model loads)

### Tips
- Be specific in your questions for better answers
- The AI model runs locally via DEEPKIT_ENGINE
- You can upload documents for the AI to analyze

---

## DEEPKIT_RESEARCH (Document Analysis)

**"I want to upload PDFs and research documents"**

### What is it?
DEEPKIT_RESEARCH lets you upload documents, PDFs, or text files. Ask questions about them. Get summaries.

### URL
http://localhost:3002

### Examples of what you can do:
- Upload research papers and ask questions
- Summarize long documents
- Compare information across multiple files
- Generate notes from your documents

### Getting Started
1. Go to http://localhost:3002
2. Upload your documents
3. Ask questions in the chat

---

## DEEPKIT_CONTENT (Content Management)

**"I want to manage blog posts, pages, and content"**

### What is it?
DEEPKIT_CONTENT is a headless CMS - create and manage content that can be used anywhere (websites, apps, etc.)

### URL
http://localhost:3003

### Examples of what you can do:
- Manage blog posts
- Create product catalogs
- Build content for your website
- Define your own content types

### Getting Started
1. Go to http://localhost:3003
2. Create an admin account (first time)
3. Define your content types in "Content-Type Builder"
4. Add content in "Content Manager"

### Tips
- Start with simple content types (like "Blog Post" with title, body, image)
- Use the API to pull content into your website or app

---

## DEEPKIT_SALES (Customer Management)

**"I want to track contacts, deals, and customers"**

### What is it?
DEEPKIT_SALES is a full-featured CRM for tracking leads, contacts, deals, and customer relationships.

### URL
http://localhost:3004

### Login
- Username: admin
- Password: Check your .env file

### Examples of what you can do:
- Track leads and contacts
- Manage sales pipeline
- Log emails and calls
- Schedule follow-ups

### Getting Started
1. Go to http://localhost:3004
2. Log in with admin credentials
3. Add your first contact
4. Create deals in the pipeline

### Note
This module includes MariaDB database (port 3306) which DEEPKIT_SALES requires.

---

## DEEPKIT_DOCS (PDF Tools)

**"I want to merge, split, and edit PDFs"**

### What is it?
DEEPKIT_DOCS is a complete PDF toolkit - merge, split, compress, convert, and more.

### URL
http://localhost:3005

### Examples of what you can do:
- Merge multiple PDFs into one
- Split a PDF into separate pages
- Compress PDFs to reduce file size
- Convert PDFs to images or other formats
- Add watermarks
- Rotate pages

### Getting Started
1. Go to http://localhost:3005
2. Choose an operation (Merge, Split, etc.)
3. Upload your files
4. Download the result

---

## DEEPKIT_GRAPH + DEEPKIT_MEMORY (Knowledge Graphs)

**"I want AI memory and relationship tracking"**

### What is it?
A graph database and knowledge framework for building AI applications with memory and relationships.

### URLs
- DEEPKIT_GRAPH_EXPLORER: http://localhost:3011
- DEEPKIT_MEMORY API: http://localhost:8000

### Examples of what you can do:
- Store relationships between entities
- Give AI applications "memory"
- Query connected data
- Build knowledge bases

### Getting Started
1. Open DEEPKIT_GRAPH_EXPLORER to explore the graph visually
2. Use DEEPKIT_MEMORY API to add and query knowledge

### Note
This is more advanced - best for developers building AI applications.

---

## DEEPKIT_VECTOR (Semantic Search)

**"I want semantic search and RAG capabilities"**

### What is it?
DEEPKIT_VECTOR is a vector database for storing embeddings and doing semantic (meaning-based) search.

### URL
http://localhost:6333

### Examples of what you can do:
- Build semantic search (find things by meaning, not just keywords)
- Create RAG (Retrieval Augmented Generation) systems
- Find similar documents or images
- Power recommendation systems

### Getting Started
1. This is primarily an API service
2. Connect from DEEPKIT_ORCHESTRATOR or your applications
3. Use with embedding models from DEEPKIT_ENGINE

### Note
This is more advanced - best for developers building AI applications.

---

## DEEPKIT_PULSE (System Monitoring)

**"I want to monitor uptime and service health"**

### What is it?
DEEPKIT_PULSE monitors your services, checks if they're running, and alerts you if anything goes down.

### URL
http://localhost:9002

### Examples of what you can do:
- Monitor if services are up
- Get alerts when something goes down
- Track response times
- View uptime history

### Getting Started
1. Go to http://localhost:9002
2. Create an account
3. Add monitors for your DEEPKIT services
4. Set up notifications (email, Slack, etc.)

---

## DEEPKIT_DATA (Database Admin)

**"I want a visual interface to manage databases"**

### What is it?
DEEPKIT_DATA is a simple, powerful database management tool. Works with PostgreSQL, MySQL, and more.

### URL
http://localhost:9003

### Examples of what you can do:
- View and edit database tables
- Run SQL queries
- Export and import data
- Manage database structure

### Getting Started
1. Go to http://localhost:9003
2. Select "PostgreSQL" as system
3. Server: deepkit-store
4. Username: deepkit
5. Password: (from your .env file)
6. Database: deepkit (or n8n, strapi, etc.)

---

## Module Combinations

### Minimal (Recommended Start)
- Core + DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_DOCS
- Best for: Getting started, automating tasks

### Creator
- Core + DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_RESEARCH + DEEPKIT_CONTENT + DEEPKIT_DOCS
- Best for: Content creators, marketers

### Business
- Core + DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_CONTENT + DEEPKIT_SALES + DEEPKIT_DOCS + DEEPKIT_PULSE
- Best for: Managing customers and operations

### Developer
- Core + DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_GRAPH + DEEPKIT_VECTOR + DEEPKIT_DATA
- Best for: Building AI applications

### Full Stack
- Everything included
- Best for: Power users who need all capabilities

---

## Adding Modules Later

You can always add more modules:

```bash
# Add a single module
docker compose -f docker-compose.yml -f modules/monitoring.yml up -d

# Add multiple modules
docker compose -f docker-compose.yml -f modules/cms.yml -f modules/crm.yml up -d
```

---

## Need Help?

- Check the [Quick Start Guide](QUICKSTART.md)
- Look at the logs: `docker compose logs -f [service-name]`
- Use Docker Desktop to see container status
- Contact us: deep@championsmail.com

---

**Deep License** - Copyright (c) 2025 Deep
