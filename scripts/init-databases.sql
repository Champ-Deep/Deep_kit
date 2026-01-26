-- =============================================================================
-- Deep Starter Kit - Database Initialization
-- =============================================================================
-- This script runs automatically when PostgreSQL starts for the first time.
-- It creates separate databases for each application that needs one.
-- =============================================================================

-- Create database for n8n (workflow automation)
CREATE DATABASE n8n;

-- Create database for Strapi (CMS)
CREATE DATABASE strapi;

-- Grant privileges (using the main user)
-- Note: The main POSTGRES_USER already has superuser privileges
