import { DateTime } from "luxon";
import { BISHKEK } from "./prisma.js";

export function nowInBishkek(): DateTime {
  return DateTime.now().setZone(BISHKEK);
}

export function startOfTodayBishkek(): Date {
  return nowInBishkek().startOf("day").toUTC().toJSDate();
}

export function addDaysExclusive(start: Date, days: number): Date {
  return DateTime.fromJSDate(start, { zone: "utc" })
    .setZone(BISHKEK)
    .plus({ days })
    .toUTC()
    .toJSDate();
}

export function isMembershipActive(
  startsAt: Date,
  endsAtExclusive: Date,
  at: Date = new Date(),
): boolean {
  return startsAt <= at && at < endsAtExclusive;
}
