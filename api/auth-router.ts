import { z } from "zod";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signSessionToken } from "./kimi/session";
import { nanoid } from "nanoid";


async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (process.env.PASSWORD_SALT || "easyoutstation_salt"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("hex");
}

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  signup: publicQuery
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) throw new Error("An account with this email already exists.");

      const passwordHash = await hashPassword(input.password);
      const unionId = nanoid();

      await db.insert(users).values({
        unionId,
        name: input.name,
        email: input.email,
        passwordHash: passwordHash,
        role: "user",
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({ unionId, clientId: "easyoutstation" });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, token, {
        httpOnly: cookieOpts.httpOnly,
        path: cookieOpts.path,
        sameSite: (cookieOpts.sameSite?.toLowerCase() as "lax" | "none") ?? "lax",
        secure: cookieOpts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }));
      return { success: true, token };
    }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userRows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = userRows[0];
      if (!user) throw new Error("Invalid email or password.");

      const passwordHash = await hashPassword(input.password);
      if (user.passwordHash !== passwordHash) throw new Error("Invalid email or password.");

      await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));

      const token = await signSessionToken({ unionId: user.unionId, clientId: "easyoutstation" });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, token, {
        httpOnly: cookieOpts.httpOnly,
        path: cookieOpts.path,
        sameSite: (cookieOpts.sameSite?.toLowerCase() as "lax" | "none") ?? "lax",
        secure: cookieOpts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }));
      return { success: true, token };
    }),

  loginWithPhone: publicQuery
    .input(z.object({ phone: z.string().min(10).max(15), name: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Firebase OTP is verified client-side before this is called
      const db = getDb();
      let userRows = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
      let user = userRows[0];

      if (!user) {
        const unionId = nanoid();
        await db.insert(users).values({ unionId, phone: input.phone, name: input.name ?? null, role: "user", lastSignInAt: new Date() });
        userRows = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
        user = userRows[0];
      } else {
        const updates: Record<string, any> = { lastSignInAt: new Date() };
        if (input.name && !user.name) updates.name = input.name;
        await db.update(users).set(updates).where(eq(users.id, user.id));
      }

      const token = await signSessionToken({ unionId: user.unionId, clientId: "easyoutstation" });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, token, {
        httpOnly: cookieOpts.httpOnly,
        path: cookieOpts.path,
        sameSite: (cookieOpts.sameSite?.toLowerCase() as "lax" | "none") ?? "lax",
        secure: cookieOpts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }));
      return { success: true, token };
    }),

  loginWithEmail: publicQuery
    .input(z.object({ email: z.string().email(), name: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Email OTP is verified server-side before this is called
      const db = getDb();
      const normalizedEmail = input.email.toLowerCase().trim();

      // Step 1: find existing account by email
      let userRows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      let user = userRows[0];

      // Step 2: no email match — check if any booking was placed with this email
      // while linked to a user (e.g. phone-only account that gave email at checkout).
      // If found, attach the email to that account instead of creating a duplicate.
      if (!user) {
        const [linked] = await db
          .select({ userId: bookings.userId })
          .from(bookings)
          .where(and(eq(bookings.customerEmail, normalizedEmail), gt(bookings.userId, 0)))
          .orderBy(bookings.id)
          .limit(1);
        if (linked?.userId) {
          const [existing] = await db.select().from(users).where(eq(users.id, linked.userId)).limit(1);
          if (existing) {
            await db.update(users).set({ email: normalizedEmail, lastSignInAt: new Date() }).where(eq(users.id, existing.id));
            user = { ...existing, email: normalizedEmail };
          }
        }
      }

      // Step 3: still nothing — create a fresh email-only account
      if (!user) {
        const unionId = nanoid();
        await db.insert(users).values({ unionId, email: normalizedEmail, name: input.name ?? null, role: "user", lastSignInAt: new Date() });
        userRows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
        user = userRows[0];
      } else {
        const updates: Record<string, any> = { lastSignInAt: new Date() };
        if (input.name && !user.name) updates.name = input.name;
        await db.update(users).set(updates).where(eq(users.id, user.id));
      }

      const token = await signSessionToken({ unionId: user.unionId, clientId: "easyoutstation" });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, token, {
        httpOnly: cookieOpts.httpOnly,
        path: cookieOpts.path,
        sameSite: (cookieOpts.sameSite?.toLowerCase() as "lax" | "none") ?? "lax",
        secure: cookieOpts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }));
      return { success: true, token };
    }),

  updateProfile: authedQuery
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  saveFcmToken: authedQuery
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(users).set({ fcmToken: input.token }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, "", {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: 0,
    }));
    return { success: true };
  }),
});
