const axios = require('axios');

const CALENDAR_URL = process.env.CALENDAR_URL || 'http://deepkit-calendar:7714';

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'calendar',
      description: 'Manage calendar events in DeepKit. Create events, list upcoming events, or check schedule for a specific date.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'list', 'today', 'week'],
            description: 'Operation: create a new event, list events in date range, show today, or show this week'
          },
          title: {
            type: 'string',
            description: 'Event title (required for create)'
          },
          description: {
            type: 'string',
            description: 'Event description (optional for create)'
          },
          start_time: {
            type: 'string',
            description: 'Start time in ISO format, e.g. 2026-02-03T10:00:00Z (required for create)'
          },
          end_time: {
            type: 'string',
            description: 'End time in ISO format (required for create)'
          },
          all_day: {
            type: 'boolean',
            description: 'Whether this is an all-day event (default: false)'
          },
          date: {
            type: 'string',
            description: 'Date to check schedule for, e.g. 2026-02-03 (for list/today)'
          }
        },
        required: ['action']
      }
    }
  },

  execute: async (args, context) => {
    const { action } = args;

    try {
      switch (action) {
        case 'create': {
          if (!args.title) {
            return { success: false, error: 'Event title is required.' };
          }

          const now = new Date();
          const startTime = args.start_time || new Date(now.getTime() + 3600000).toISOString();
          const endTime = args.end_time || new Date(new Date(startTime).getTime() + 3600000).toISOString();

          const response = await axios.post(`${CALENDAR_URL}/api/events`, {
            title: args.title,
            description: args.description || '',
            start_time: startTime,
            end_time: endTime,
            all_day: args.all_day || false,
            color: '#00F2FF'
          }, { timeout: 5000 });

          const event = response.data;
          return {
            success: true,
            action: 'created',
            event_id: event.id,
            title: event.title,
            start: startTime,
            end: endTime,
            message: `Event "${args.title}" scheduled for ${new Date(startTime).toLocaleString()}`
          };
        }

        case 'today': {
          const today = new Date();
          const start = today.toISOString().split('T')[0];
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const end = tomorrow.toISOString().split('T')[0];

          const response = await axios.get(`${CALENDAR_URL}/api/events`, {
            params: { start, end },
            timeout: 5000
          });

          const events = response.data || [];
          return {
            success: true,
            action: 'today',
            count: events.length,
            events: events.map(e => ({
              title: e.title,
              start: e.start_time,
              end: e.end_time,
              all_day: e.all_day
            })),
            message: events.length > 0
              ? `${events.length} event(s) today: ${events.map(e => e.title).join(', ')}`
              : 'No events scheduled for today.'
          };
        }

        case 'week': {
          const now = new Date();
          const start = now.toISOString().split('T')[0];
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const end = weekEnd.toISOString().split('T')[0];

          const response = await axios.get(`${CALENDAR_URL}/api/events`, {
            params: { start, end },
            timeout: 5000
          });

          const events = response.data || [];
          return {
            success: true,
            action: 'week',
            count: events.length,
            events: events.map(e => ({
              title: e.title,
              start: e.start_time,
              end: e.end_time
            })),
            message: events.length > 0
              ? `${events.length} event(s) this week: ${events.map(e => e.title).join(', ')}`
              : 'No events scheduled this week.'
          };
        }

        case 'list': {
          const date = args.date || new Date().toISOString().split('T')[0];
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const response = await axios.get(`${CALENDAR_URL}/api/events`, {
            params: { start: date, end: nextDay.toISOString().split('T')[0] },
            timeout: 5000
          });

          const events = response.data || [];
          return {
            success: true,
            action: 'listed',
            date,
            count: events.length,
            events: events.map(e => ({
              title: e.title,
              start: e.start_time,
              end: e.end_time
            })),
            message: events.length > 0
              ? `${events.length} event(s) on ${date}: ${events.map(e => e.title).join(', ')}`
              : `No events on ${date}.`
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Use create, list, today, or week.` };
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return { success: false, error: 'Calendar service (CHRONOS) is offline.' };
      }
      return { success: false, error: `Calendar error: ${error.message}` };
    }
  }
};
