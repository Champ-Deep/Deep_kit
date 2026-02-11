/**
 * notes - Save and retrieve notes in the DeepKit Arsenal
 * Uses local Postgres storage directly (agent_notes table).
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'notes',
      description: 'Save and retrieve personal notes. Use this when the user wants to save information, write something down, or retrieve previously saved notes.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['save', 'list', 'search'],
            description: 'Operation: save a new note, list recent notes, or search notes by keyword'
          },
          title: {
            type: 'string',
            description: 'Note title (required for save)'
          },
          content: {
            type: 'string',
            description: 'Note content/body (required for save)'
          },
          query: {
            type: 'string',
            description: 'Search query (required for search)'
          },
          limit: {
            type: 'number',
            description: 'Max results (default: 5)'
          }
        },
        required: ['action']
      }
    }
  },

  execute: async (args, context) => {
    const { storage } = context;

    if (!storage) {
      return { success: false, error: 'Storage unavailable. THE VAULT is offline.' };
    }

    const { action } = args;

    try {
      switch (action) {
        case 'save': {
          if (!args.content) {
            return { success: false, error: 'Note content is required.' };
          }

          const title = args.title || args.content.substring(0, 50) + '...';

          // Use agent_notes table via raw query
          const result = await storage.rawQuery(
            `INSERT INTO agent_notes (title, content, metadata, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, title, created_at`,
            [title, args.content, JSON.stringify({
              created_by: context.userId || 'unknown',
              source: context.channel || 'api'
            })]
          );

          const note = result[0];
          return {
            success: true,
            action: 'saved',
            note_id: note.id.substring(0, 8),
            title: note.title,
            message: `Note "${title}" saved.`
          };
        }

        case 'list': {
          const limit = args.limit || 5;
          const results = await storage.rawQuery(
            `SELECT id, title, content, created_at
             FROM agent_notes
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
          );

          return {
            success: true,
            action: 'listed',
            count: results.length,
            notes: results.map(n => ({
              id: n.id.substring(0, 8),
              title: n.title,
              preview: n.content.substring(0, 100),
              created_at: n.created_at
            })),
            message: results.length > 0
              ? `${results.length} note(s): ${results.map(n => n.title).join(', ')}`
              : 'No notes found.'
          };
        }

        case 'search': {
          if (!args.query) {
            return { success: false, error: 'Search query is required.' };
          }

          const limit = args.limit || 5;
          const results = await storage.rawQuery(
            `SELECT id, title, content, created_at
             FROM agent_notes
             WHERE title ILIKE $1 OR content ILIKE $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [`%${args.query}%`, limit]
          );

          return {
            success: true,
            action: 'searched',
            query: args.query,
            count: results.length,
            notes: results.map(n => ({
              id: n.id.substring(0, 8),
              title: n.title,
              preview: n.content.substring(0, 100),
              created_at: n.created_at
            })),
            message: results.length > 0
              ? `Found ${results.length} note(s) matching "${args.query}"`
              : `No notes found matching "${args.query}".`
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Use save, list, or search.` };
      }
    } catch (error) {
      return { success: false, error: `Notes error: ${error.message}` };
    }
  }
};
