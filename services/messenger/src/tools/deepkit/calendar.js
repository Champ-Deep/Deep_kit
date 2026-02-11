/**
 * calendar - Manage calendar events via n8n/Google Calendar or local service
 *
 * Tries n8n workflow (Google Calendar) first, falls back to local DeepKit calendar.
 */
const axios = require('axios');

const CALENDAR_URL = process.env.CALENDAR_URL || 'http://deepkit-calendar:7714';
const N8N_URL = process.env.N8N_WEBHOOK_URL || 'http://deepkit-orchestrator:5678';

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'calendar',
      description: 'Manage calendar events. Create events, list upcoming events, or check schedule. Connects to Google Calendar via n8n or local DeepKit calendar.',
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
          location: {
            type: 'string',
            description: 'Event location (optional)'
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

    // Try Google Calendar via n8n first, fall back to local
    const useGoogleCalendar = await checkN8nCalendarWorkflow();

    try {
      switch (action) {
        case 'create': {
          if (!args.title) {
            return {
              success: false,
              error: 'Event title is required.',
              type: 'note',
              data: {
                action: 'found',
                note: { id: 'error', title: 'Missing Title', content: 'Please provide an event title.' }
              }
            };
          }

          const now = new Date();
          const startTime = args.start_time || new Date(now.getTime() + 3600000).toISOString();
          const endTime = args.end_time || new Date(new Date(startTime).getTime() + 3600000).toISOString();

          if (useGoogleCalendar) {
            return await createGoogleEvent({
              title: args.title,
              description: args.description,
              start_time: startTime,
              end_time: endTime,
              location: args.location
            });
          } else {
            return await createLocalEvent({
              title: args.title,
              description: args.description,
              start_time: startTime,
              end_time: endTime,
              all_day: args.all_day
            });
          }
        }

        case 'today': {
          const today = new Date();
          const start = today.toISOString().split('T')[0];
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const end = tomorrow.toISOString().split('T')[0];

          if (useGoogleCalendar) {
            return await listGoogleEvents(start, end, 'today');
          } else {
            return await listLocalEvents(start, end, 'today');
          }
        }

        case 'week': {
          const now = new Date();
          const start = now.toISOString().split('T')[0];
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const end = weekEnd.toISOString().split('T')[0];

          if (useGoogleCalendar) {
            return await listGoogleEvents(start, end, 'week');
          } else {
            return await listLocalEvents(start, end, 'week');
          }
        }

        case 'list': {
          const date = args.date || new Date().toISOString().split('T')[0];
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const end = nextDay.toISOString().split('T')[0];

          if (useGoogleCalendar) {
            return await listGoogleEvents(date, end, 'list', date);
          } else {
            return await listLocalEvents(date, end, 'list', date);
          }
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Use create, list, today, or week.`,
            type: 'note',
            data: {
              action: 'found',
              note: { id: 'error', title: 'Invalid Action', content: `Unknown action: ${action}` }
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Calendar error: ${error.message}`,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: 'error',
            title: 'Calendar Error',
            content: `Failed to access calendar: ${error.message}\n\n**Tip:** Make sure either Google Calendar is connected in n8n or the local calendar service is running.`
          }
        }
      };
    }
  }
};

// Check if n8n Google Calendar workflow is available
async function checkN8nCalendarWorkflow() {
  try {
    // Try a simple health check on n8n
    await axios.get(`${N8N_URL}/healthz`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Google Calendar via n8n
async function createGoogleEvent(event) {
  try {
    const response = await axios.post(`${N8N_URL}/webhook/calendar/create`, {
      title: event.title,
      description: event.description || '',
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || ''
    }, { timeout: 10000 });

    const data = response.data;
    return {
      success: true,
      type: 'note',
      data: {
        action: 'created',
        note: {
          id: `calendar-${Date.now()}`,
          title: 'Event Created',
          content: `**${event.title}**\n\n**When:** ${formatDateTime(event.start_time)} - ${formatDateTime(event.end_time)}${event.location ? `\n**Where:** ${event.location}` : ''}${data.event?.link ? `\n\n[Open in Google Calendar](${data.event.link})` : ''}`,
          created_at: new Date().toISOString()
        }
      },
      message: `Event "${event.title}" created in Google Calendar`,
      suggestions: ['Show my calendar today', 'Create another event', 'What\'s on my schedule this week?']
    };
  } catch (error) {
    // Fall back to local calendar
    if (error.response?.status === 404) {
      console.log('Google Calendar workflow not found, falling back to local');
      return await createLocalEvent(event);
    }
    throw error;
  }
}

async function listGoogleEvents(start, end, actionType, specificDate) {
  try {
    const response = await axios.get(`${N8N_URL}/webhook/calendar/list`, {
      params: { start_date: start, end_date: end },
      timeout: 10000
    });

    const events = response.data?.events || [];
    return formatEventResponse(events, actionType, specificDate, 'Google Calendar');
  } catch (error) {
    // Fall back to local calendar
    if (error.response?.status === 404) {
      return await listLocalEvents(start, end, actionType, specificDate);
    }
    throw error;
  }
}

// Local DeepKit Calendar
async function createLocalEvent(event) {
  try {
    const response = await axios.post(`${CALENDAR_URL}/api/events`, {
      title: event.title,
      description: event.description || '',
      start_time: event.start_time,
      end_time: event.end_time,
      all_day: event.all_day || false,
      color: '#00F2FF'
    }, { timeout: 5000 });

    return {
      success: true,
      type: 'note',
      data: {
        action: 'created',
        note: {
          id: `calendar-${Date.now()}`,
          title: 'Event Created',
          content: `**${event.title}**\n\n**When:** ${formatDateTime(event.start_time)} - ${formatDateTime(event.end_time)}`,
          created_at: new Date().toISOString()
        }
      },
      message: `Event "${event.title}" scheduled for ${formatDateTime(event.start_time)}`,
      suggestions: ['Show my calendar today', 'Create another event']
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Calendar service is offline. Enable it with: ./install.sh --preset business');
    }
    throw error;
  }
}

async function listLocalEvents(start, end, actionType, specificDate) {
  try {
    const response = await axios.get(`${CALENDAR_URL}/api/events`, {
      params: { start, end },
      timeout: 5000
    });

    const events = (response.data || []).map(e => ({
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      location: e.location
    }));

    return formatEventResponse(events, actionType, specificDate, 'DeepKit Calendar');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Calendar service is offline. Enable it with: ./install.sh --preset business');
    }
    throw error;
  }
}

// Helpers
function formatEventResponse(events, actionType, specificDate, source) {
  const count = events.length;
  let periodText = '';

  switch (actionType) {
    case 'today':
      periodText = 'today';
      break;
    case 'week':
      periodText = 'this week';
      break;
    case 'list':
      periodText = `on ${specificDate}`;
      break;
  }

  const eventList = events.map(e =>
    `- **${e.title}** at ${formatTime(e.start)}${e.location ? ` (${e.location})` : ''}`
  ).join('\n');

  return {
    success: true,
    type: 'note',
    data: {
      action: 'found',
      note: {
        id: `calendar-${Date.now()}`,
        title: count > 0 ? `${count} Event${count !== 1 ? 's' : ''} ${periodText}` : `No Events ${periodText}`,
        content: count > 0
          ? `**Your schedule ${periodText}:**\n\n${eventList}\n\n*Source: ${source}*`
          : `You have no events scheduled ${periodText}.\n\n*Source: ${source}*`,
        created_at: new Date().toISOString()
      }
    },
    message: count > 0
      ? `${count} event${count !== 1 ? 's' : ''} ${periodText}`
      : `No events ${periodText}`,
    suggestions: count === 0
      ? ['Create an event', 'Check next week\'s schedule']
      : ['Create another event', 'Check another date']
  };
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}
