import { Router, Request, Response } from 'express';
import { RRule } from 'rrule';
import ical from 'ical-generator';
import dayjs from 'dayjs';
import * as db from '../services/database';
import type { CreateEventRequest, CreateBookingRequest, CreateAvailabilityRequest } from '../types';

const router = Router();

const TASK_TRACKER_URL = process.env.TASK_TRACKER_URL || 'http://deepkit-task-tracker:7718';

// Events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const events = await db.getEvents(
      start as string | undefined,
      end as string | undefined
    );
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/events/tasks', async (req: Request, res: Response) => {
  try {
    // Pull tasks with due dates from task tracker and convert to calendar events
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${TASK_TRACKER_URL}/api/tasks`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Task Tracker responded with ${response.status}`);
    }

    const tasks = await response.json() as any[];
    // Filter tasks with due_date and map them to calendar event format
    const taskEvents = (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.due_date).map((task: any) => ({
      id: `task-${task.id}`,
      title: `[TASK] ${task.title}`,
      description: task.description || null,
      start_time: task.due_date,
      end_time: task.due_date,
      all_day: true,
      color: task.priority === 'high' ? '#FF3B3B' : task.priority === 'medium' ? '#FFB000' : '#00F2FF',
      location: null,
      is_recurring: false,
      recurrence_rule: null,
      created_by: null,
      created_at: task.created_at || new Date().toISOString(),
      updated_at: task.updated_at || new Date().toISOString(),
      source: 'task_tracker',
      task_id: task.id,
      task_status: task.status,
      task_priority: task.priority,
    }));

    res.json(taskEvents);
  } catch (error: any) {
    console.error('Error fetching tasks:', error.message);
    // Return empty array instead of error - task tracker might not be running
    res.json([]);
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const event = await db.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const eventData: CreateEventRequest = req.body;

    // Validate required fields
    if (!eventData.title || !eventData.start_time || !eventData.end_time) {
      return res.status(400).json({ error: 'Missing required fields: title, start_time, end_time' });
    }

    const event = await db.createEvent(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const eventData: Partial<CreateEventRequest> = req.body;
    const event = await db.updateEvent(id, eventData);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const eventData: Partial<CreateEventRequest> = req.body;
    const event = await db.updateEvent(id, eventData);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await db.deleteEvent(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// iCal export
router.get('/events/:id/ical', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const event = await db.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const calendar = ical({ name: 'DeepKit Calendar' });

    const eventConfig: any = {
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
    };

    // Add recurrence rule if present
    if (event.is_recurring && event.recurrence_rule) {
      const rule = event.recurrence_rule as any;
      const rruleOptions: any = {
        freq: RRule[rule.freq as keyof typeof RRule],
        dtstart: new Date(event.start_time),
      };

      if (rule.interval) rruleOptions.interval = rule.interval;
      if (rule.count) rruleOptions.count = rule.count;
      if (rule.until) rruleOptions.until = new Date(rule.until);
      if (rule.byweekday) rruleOptions.byweekday = rule.byweekday;
      if (rule.bymonthday) rruleOptions.bymonthday = rule.bymonthday;

      const rrule = new RRule(rruleOptions);
      eventConfig.repeating = rrule.toString().split('\n')[1];
    }

    calendar.createEvent(eventConfig);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="event-${id}.ics"`);
    res.send(calendar.toString());
  } catch (error) {
    console.error('Error generating iCal:', error);
    res.status(500).json({ error: 'Failed to generate iCal' });
  }
});

// Get recurring event instances
router.get('/events/:id/instances', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const event = await db.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.is_recurring || !event.recurrence_rule) {
      return res.json([event]);
    }

    const rule = event.recurrence_rule as any;
    const rruleOptions: any = {
      freq: RRule[rule.freq as keyof typeof RRule],
      dtstart: new Date(event.start_time),
    };

    if (rule.interval) rruleOptions.interval = rule.interval;
    if (rule.count) rruleOptions.count = rule.count;
    if (rule.until) rruleOptions.until = new Date(rule.until);
    if (rule.byweekday) rruleOptions.byweekday = rule.byweekday;
    if (rule.bymonthday) rruleOptions.bymonthday = rule.bymonthday;

    const rrule = new RRule(rruleOptions);
    const instances = rrule.all().slice(0, 100).map((date, index) => {
      const duration = dayjs(event.end_time).diff(dayjs(event.start_time), 'millisecond');
      const endTime = dayjs(date).add(duration, 'millisecond').toDate();
      return {
        ...event,
        id: `${event.id}-${index}`,
        start_time: date.toISOString(),
        end_time: endTime.toISOString(),
      };
    });

    res.json(instances);
  } catch (error) {
    console.error('Error generating instances:', error);
    res.status(500).json({ error: 'Failed to generate instances' });
  }
});

// Bookings
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const { event_id } = req.query;
    const bookings = await db.getBookings(
      event_id ? parseInt(event_id as string, 10) : undefined
    );
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const bookingData: CreateBookingRequest = req.body;

    // Validate required fields
    if (!bookingData.attendee_name || !bookingData.attendee_email) {
      return res.status(400).json({ error: 'Missing required fields: attendee_name, attendee_email' });
    }

    const booking = await db.createBooking(bookingData);
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.put('/bookings/:id/confirm', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await db.confirmBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

router.put('/bookings/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await db.cancelBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Availability
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const availability = await db.getAvailability();
    res.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

router.post('/availability', async (req: Request, res: Response) => {
  try {
    const availabilityData: CreateAvailabilityRequest = req.body;

    // Validate required fields
    if (availabilityData.day_of_week === undefined || !availabilityData.start_time || !availabilityData.end_time) {
      return res.status(400).json({ error: 'Missing required fields: day_of_week, start_time, end_time' });
    }

    const availability = await db.createAvailability(availabilityData);
    res.status(201).json(availability);
  } catch (error) {
    console.error('Error creating availability:', error);
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

router.delete('/availability/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await db.deleteAvailability(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Availability not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ error: 'Failed to delete availability' });
  }
});

// Stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
