import { z } from "zod";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
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
        phone: passwordHash,
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
      return { success: true };
    }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userRows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = userRows[0];
      if (!user) throw new Error("Invalid email or password.");

      const passwordHash = await hashPassword(input.password);
      if (user.phone !== passwordHash) throw new Error("Invalid email or password.");

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
