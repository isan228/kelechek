import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const BISHKEK = "Asia/Bishkek";
export const COOKIE_NAME = "kelech_session";
export const INVITE_TTL_DAYS = 7;
export const MEMBERSHIP_DAYS = 30;
