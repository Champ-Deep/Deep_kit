import { RRule, RRuleSet, rrulestr } from 'rrule';
import dayjs from 'dayjs';

export interface RecurrenceInstance {
  date: Date;
  dateString: string; // YYYY-MM-DD format
}

export interface GenerateInstancesOptions {
  from?: Date;
  to?: Date;
  limit?: number;
}

/**
 * Parse rrule string and generate future instances
 */
export function generateInstances(
  recurrenceRule: string,
  options: GenerateInstancesOptions = {}
): RecurrenceInstance[] {
  try {
    const { from = new Date(), to, limit = 30 } = options;

    // Parse rrule string
    const rule = rrulestr(recurrenceRule);

    // Generate instances
    let dates: Date[];
    if (to) {
      dates = rule.between(from, to, true); // inclusive
    } else {
      dates = rule.all((date, i) => {
        if (i >= limit) return false;
        return date >= from;
      });
    }

    // Convert to RecurrenceInstance format
    return dates.map((date) => ({
      date,
      dateString: dayjs(date).format('YYYY-MM-DD'),
    }));
  } catch (error) {
    console.error('Error generating recurrence instances:', error);
    return [];
  }
}

/**
 * Get next occurrence after a given date
 */
export function getNextOccurrence(recurrenceRule: string, after: Date = new Date()): Date | null {
  try {
    const rule = rrulestr(recurrenceRule);
    return rule.after(after, false); // false = exclusive
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
}

/**
 * Check if a date matches the recurrence rule
 */
export function isRecurrenceDate(recurrenceRule: string, date: Date): boolean {
  try {
    const rule = rrulestr(recurrenceRule);
    const instances = rule.between(
      dayjs(date).startOf('day').toDate(),
      dayjs(date).endOf('day').toDate(),
      true
    );
    return instances.length > 0;
  } catch (error) {
    console.error('Error checking recurrence date:', error);
    return false;
  }
}

/**
 * Create rrule string from frequency and interval
 * Helper for creating common recurrence patterns
 */
export function createRRule(options: {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  dtstart?: Date;
  until?: Date;
  count?: number;
  byweekday?: number[]; // 0=Monday, 6=Sunday
  bymonthday?: number; // Day of month (1-31)
}): string {
  const {
    freq,
    interval = 1,
    dtstart = new Date(),
    until,
    count,
    byweekday,
    bymonthday,
  } = options;

  // Map frequency string to RRule constant
  const freqMap = {
    DAILY: RRule.DAILY,
    WEEKLY: RRule.WEEKLY,
    MONTHLY: RRule.MONTHLY,
    YEARLY: RRule.YEARLY,
  };

  const ruleOptions: any = {
    freq: freqMap[freq],
    interval,
    dtstart,
  };

  if (until) ruleOptions.until = until;
  if (count) ruleOptions.count = count;
  if (byweekday) ruleOptions.byweekday = byweekday;
  if (bymonthday) ruleOptions.bymonthday = bymonthday;

  const rule = new RRule(ruleOptions);
  return rule.toString();
}

/**
 * Parse rrule string to human-readable format
 */
export function humanizeRRule(recurrenceRule: string): string {
  try {
    const rule = rrulestr(recurrenceRule);
    return rule.toText();
  } catch (error) {
    return 'Invalid recurrence rule';
  }
}

/**
 * Common recurrence patterns (ready-to-use rrule strings)
 */
export const RECURRENCE_PRESETS = {
  DAILY: createRRule({ freq: 'DAILY', interval: 1 }),
  WEEKDAYS: createRRule({ freq: 'WEEKLY', interval: 1, byweekday: [0, 1, 2, 3, 4] }), // Mon-Fri
  WEEKLY: createRRule({ freq: 'WEEKLY', interval: 1 }),
  BIWEEKLY: createRRule({ freq: 'WEEKLY', interval: 2 }),
  MONTHLY: createRRule({ freq: 'MONTHLY', interval: 1 }),
  QUARTERLY: createRRule({ freq: 'MONTHLY', interval: 3 }),
  YEARLY: createRRule({ freq: 'YEARLY', interval: 1 }),
};
