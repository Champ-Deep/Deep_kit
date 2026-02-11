-- =============================================================================
-- Deep Starter Kit - Database Initialization
-- =============================================================================
-- This script runs automatically when PostgreSQL starts for the first time.
-- It creates separate databases for each application that needs one.
-- =============================================================================

-- Core Services
CREATE DATABASE n8n;         -- Workflow Automation
CREATE DATABASE strapi;      -- Headless CMS
CREATE DATABASE hubconfig;   -- Hub Settings
CREATE DATABASE messenger;   -- WhatsApp/Telegram Intelligent Assistant (THE PROXY)

-- Productivity Suite
CREATE DATABASE calendar;    -- Calendar & Scheduling
CREATE DATABASE timetracker; -- Time Tracking
CREATE DATABASE tasktracker; -- Gamified Tasks
CREATE DATABASE filemanager; -- File Storage Metadata

-- Business Suite
CREATE DATABASE marketing;   -- Marketing 360
CREATE DATABASE webhooks;    -- Webhook Manager
CREATE DATABASE invoicing;   -- Invoice & Billing

-- Security
CREATE DATABASE passwords;   -- Password Manager

-- Communication
CREATE DATABASE champmail;   -- Email Automation

-- Collaboration
CREATE DATABASE cowork;      -- Unified AI Workspace

-- Grant privileges (implicit for superuser, but explicit for clarity if needed)
-- GRANT ALL PRIVILEGES ON DATABASE calendar TO deepkit;
-- ... etc