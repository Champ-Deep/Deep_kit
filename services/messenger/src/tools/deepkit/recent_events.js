const axios = require('axios');

/**
 * recent_events - Get recent events from the DeepKit event bus
 *
 * Shows recent activity across all services in the Arsenal.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'recent_events',
      description: 'Get recent events from the DeepKit event bus. Shows what has been happening across the Arsenal. Use when asked about "recent activity", "what happened", "events", or "show me the logs".',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of events to return (default: 20, max: 100)'
          },
          type: {
            type: 'string',
            description: 'Filter by event type (e.g., CONTAINER, TASK, INVOICE)'
          }
        }
      }
    }
  },

  execute: async (args, context) => {
    const { limit = 20, type } = args;
    const baseUrl = `http://localhost:${process.env.PORT || 7777}`;

    try {
      let url = `${baseUrl}/api/events/recent?limit=${Math.min(limit, 100)}`;
      if (type) {
        url += `&type=${encodeURIComponent(type)}`;
      }

      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      // Format events for display
      const formattedEvents = data.events.map(event => ({
        type: event.type,
        source: event.source,
        timestamp: event.timestamp,
        summary: summarizeEvent(event)
      }));

      // Group by type for summary
      const byType = {};
      for (const event of data.events) {
        byType[event.type] = (byType[event.type] || 0) + 1;
      }

      return {
        success: true,
        type: 'event_list',
        count: data.total,
        events: formattedEvents,
        byType,
        message: data.total > 0
          ? `${data.total} recent event(s)${type ? ` of type ${type}` : ''}`
          : 'No recent events in the event bus',
        data: {
          events: data.events,
          byType
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get recent events: ${error.message}`
      };
    }
  }
};

function summarizeEvent(event) {
  const type = event.type || 'UNKNOWN';
  const source = event.source || 'unknown';

  if (type.startsWith('CONTAINER_')) {
    const action = type.replace('CONTAINER_', '').toLowerCase();
    const container = event.data?.container || 'unknown';
    return `Container ${container} ${action}`;
  }

  if (type === 'TASK_CREATED') {
    return `Task created: ${event.data?.title || 'untitled'}`;
  }

  if (type === 'INVOICE_CREATED' || type === 'INVOICE_PAID') {
    return `Invoice ${type.replace('INVOICE_', '').toLowerCase()}: ${event.data?.number || 'N/A'}`;
  }

  return `${type} from ${source}`;
}
