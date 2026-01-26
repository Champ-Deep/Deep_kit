# Modules Guide

Deep Starter Kit is modular - you only install what you need. This guide explains each module.

---

## Core Services (Always Installed)

These 4 services form the foundation and are always included:

### PostgreSQL (Database)
- **What it does**: Stores all your data reliably
- **Port**: 5432 (internal, not web-accessible)
- **Why it's included**: Required by n8n, Strapi, and other apps

### Redis (Cache)
- **What it does**: Speeds up your applications
- **Port**: 6379 (internal)
- **Why it's included**: Makes everything faster, handles job queues

### Ollama (Local AI)
- **What it does**: Runs AI models on your computer
- **Port**: 11434
- **Why it's included**: Powers all AI features without cloud costs
- **Note**: First run downloads a ~4GB model

### Portainer (Docker Management)
- **What it does**: Visual interface to manage your Docker containers
- **URL**: http://localhost:9000
- **Why it's included**: Makes it easy to see what's running

---

## Module A: Workflow Automation (n8n)

**"I want to automate tasks and connect apps"**

### What is n8n?
n8n is like Zapier or Make, but runs on your computer. Connect apps, automate workflows, no coding required.

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

## Module B: AI Chat (Open WebUI)

**"I want to chat with local AI models"**

### What is Open WebUI?
It's like ChatGPT, but the AI runs on your computer. Your conversations stay private.

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
- The AI model runs locally, so responses may be slower than cloud services
- You can upload documents for the AI to analyze

---

## Module C: Document Research (Local NotebookLM)

**"I want to upload PDFs and research documents"**

### What is Local NotebookLM?
Upload documents, PDFs, or text files. Ask questions about them. Get summaries.

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

## Module D: Content Management (Strapi CMS)

**"I want to manage blog posts, pages, and content"**

### What is Strapi?
A headless CMS - create and manage content that can be used anywhere (websites, apps, etc.)

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

## Module E: Customer Management (EspoCRM)

**"I want to track contacts, deals, and customers"**

### What is EspoCRM?
A full-featured CRM for tracking leads, contacts, deals, and customer relationships.

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
This module includes MariaDB database (port 3306) which EspoCRM requires.

---

## Module F: PDF Tools (chamPDF)

**"I want to merge, split, and edit PDFs"**

### What is chamPDF?
A complete PDF toolkit - merge, split, compress, convert, and more.

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

## Module G: Knowledge Graphs (FalkorDB + Graphiti)

**"I want AI memory and relationship tracking"**

### What is this?
A graph database and knowledge framework for building AI applications with memory and relationships.

### URLs
- FalkorDB Browser: http://localhost:3011
- Graphiti API: http://localhost:8000

### Examples of what you can do:
- Store relationships between entities
- Give AI applications "memory"
- Query connected data
- Build knowledge bases

### Getting Started
1. Open FalkorDB Browser to explore the graph visually
2. Use Graphiti API to add and query knowledge

### Note
This is more advanced - best for developers building AI applications.

---

## Module H: Vector Search (Qdrant)

**"I want semantic search and RAG capabilities"**

### What is Qdrant?
A vector database for storing embeddings and doing semantic (meaning-based) search.

### URL
http://localhost:6333

### Examples of what you can do:
- Build semantic search (find things by meaning, not just keywords)
- Create RAG (Retrieval Augmented Generation) systems
- Find similar documents or images
- Power recommendation systems

### Getting Started
1. This is primarily an API service
2. Connect from n8n or your applications
3. Use with embedding models from Ollama

### Note
This is more advanced - best for developers building AI applications.

---

## Module I: Monitoring (Uptime Kuma)

**"I want to monitor uptime and service health"**

### What is Uptime Kuma?
A monitoring tool to check if your services are running and alert you if they go down.

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
3. Add monitors for your services
4. Set up notifications (email, Slack, etc.)

---

## Module J: Database Admin (Adminer)

**"I want a visual interface to manage databases"**

### What is Adminer?
A simple, powerful database management tool. Works with PostgreSQL, MySQL, and more.

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
3. Server: postgres
4. Username: deepkit
5. Password: (from your .env file)
6. Database: deepkit (or n8n, strapi, etc.)

---

## Module Combinations

### Minimal (Recommended Start)
- Core + Automation + AI Chat + PDF Tools
- Best for: Getting started, automating tasks

### Creator
- Core + Automation + AI Chat + Research + CMS + PDF Tools
- Best for: Content creators, marketers

### Business
- Core + Automation + AI Chat + CMS + CRM + PDF Tools + Monitoring
- Best for: Managing customers and operations

### Developer
- Core + Automation + AI Chat + Knowledge + Vector + Admin
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
- Visit Portainer at http://localhost:9000 to see container status
- Contact us: deep@championsmail.com

---

**Deep License** - Copyright (c) 2025 Deep
