import { Pool } from 'pg';

// Create a separate pool for browsing other databases
function createBrowserPool(database?: string): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: database || 'postgres',
    user: process.env.POSTGRES_USER || 'deepkit',
    password: process.env.POSTGRES_PASSWORD || 'deepkit123',
  });
}

export interface DatabaseInfo {
  name: string;
  size: string;
  tables: number;
}

export interface TableInfo {
  name: string;
  schema: string;
  rows: number;
  size: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

export interface TableData {
  columns: ColumnInfo[];
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
}

/**
 * List all databases (filtered to DeepKit databases)
 */
export async function listDatabases(): Promise<DatabaseInfo[]> {
  const pool = createBrowserPool('postgres');
  try {
    const result = await pool.query(`
      SELECT
        datname as name,
        pg_size_pretty(pg_database_size(datname)) as size,
        (SELECT COUNT(*)
         FROM pg_tables
         WHERE schemaname = 'public'
         AND pg_catalog.pg_table_is_visible(
           (schemaname||'.'||tablename)::regclass::oid
         )
        ) as tables
      FROM pg_database
      WHERE datname NOT IN ('postgres', 'template0', 'template1')
        AND datname LIKE 'deepkit%' OR datname IN (
          'filemanager', 'tasktracker', 'calendar', 'timetracker',
          'webhooks', 'invoicing', 'marketing', 'passwords',
          'champmail', 'cowork', 'n8n', 'strapi'
        )
      ORDER BY datname ASC
    `);
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * List all tables in a database
 */
export async function listTables(database: string): Promise<TableInfo[]> {
  const pool = createBrowserPool(database);
  try {
    const result = await pool.query(`
      SELECT
        schemaname as schema,
        tablename as name,
        (SELECT COUNT(*) FROM (SELECT 1 FROM ${database}.public." + tablename + " LIMIT 1000) t) as rows,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `);

    // Get row counts separately (safer)
    const tables: TableInfo[] = [];
    for (const row of result.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM "${row.name}"`);
        tables.push({
          schema: row.schema,
          name: row.name,
          rows: parseInt(countResult.rows[0].count, 10),
          size: row.size
        });
      } catch (error) {
        // Skip tables we can't access
        console.error(`Error counting rows in ${row.name}:`, error);
        tables.push({
          schema: row.schema,
          name: row.name,
          rows: 0,
          size: row.size
        });
      }
    }

    return tables;
  } finally {
    await pool.end();
  }
}

/**
 * Get table schema (column definitions)
 */
export async function getTableSchema(database: string, tableName: string): Promise<ColumnInfo[]> {
  const pool = createBrowserPool(database);
  try {
    const result = await pool.query(`
      SELECT
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable,
        column_default as default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position ASC
    `, [tableName]);
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Browse table data with pagination
 */
export async function browseTableData(
  database: string,
  tableName: string,
  page: number = 1,
  pageSize: number = 100
): Promise<TableData> {
  const pool = createBrowserPool(database);

  // Security: Validate table name (prevent SQL injection)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }

  // Limit page size
  const limitedPageSize = Math.min(pageSize, 1000);
  const offset = (page - 1) * limitedPageSize;

  try {
    // Get columns
    const columns = await getTableSchema(database, tableName);

    // Get total row count
    const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const totalRows = parseInt(countResult.rows[0].count, 10);

    // Get data
    const dataResult = await pool.query(
      `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
      [limitedPageSize, offset]
    );

    return {
      columns,
      rows: dataResult.rows,
      totalRows,
      page,
      pageSize: limitedPageSize
    };
  } finally {
    await pool.end();
  }
}

/**
 * Execute a SELECT query (read-only)
 */
export async function executeQuery(database: string, query: string): Promise<{ columns: string[]; rows: any[] }> {
  const pool = createBrowserPool(database);

  // Security: Only allow SELECT queries
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Block dangerous keywords
  const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate'];
  for (const keyword of dangerous) {
    if (trimmed.includes(keyword)) {
      throw new Error(`Keyword '${keyword}' is not allowed`);
    }
  }

  try {
    const result = await pool.query(query);
    const columns = result.fields.map(field => field.name);
    return {
      columns,
      rows: result.rows
    };
  } finally {
    await pool.end();
  }
}
