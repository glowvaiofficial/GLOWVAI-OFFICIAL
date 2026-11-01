import { z } from "zod";

/**
 * GLOW VAI Environment Variable Schema and Validator.
 * Server secrets stay on the server.
 * Missing required vars in production fail the build.
 */
export const envSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM_TRANSACTIONAL: z.string().default("GLOW VAI <hello@send.glowvai.in>"),
  EMAIL_FROM_MARKETING: z.string().default("GLOW VAI <tips@news.glowvai.in>"),
  EMAIL_REPLY_TO: z.string().default("contact@glowvai.in"),
  TEAM_NOTIFY_EMAIL: z.string().default("team@glowvai.in"),
  UNSUBSCRIBE_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  GA_API_SECRET: z.string().optional(),
  INTERNAL_WEBHOOK_SECRET: z.string().min(32).optional(),
  SHEETS_WEBAPP_URL: z.string().optional(),
  SHEETS_SECRET: z.string().optional(),
  LEAD_ALERTS: z.string().optional().default("true"),
  REVIEW_EMAILS: z.string().optional().default("true"),
  CRON_SECRET: z.string().min(32).optional(),
  ADMIN_PASSCODE_HASH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success && process.env.NODE_ENV === "production") {
    console.error("[FATAL ENV ERROR]: Invalid environment variables", result.error.format());
    throw new Error("Invalid server environment configuration");
  }
  return result.data || envSchema.parse({});
}

export const env = validateEnv();
