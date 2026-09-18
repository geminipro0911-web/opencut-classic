import { z } from "zod";

const webEnvSchema = z.object({
	// Node
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	ANALYZE: z.string().optional(),
	NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

	// Public
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
	NEXT_PUBLIC_MARBLE_API_URL: z.url().default("https://api.marblecms.com"),

	// Server
	DATABASE_URL: z
		.string()
		.default("postgresql://opencut:opencut@localhost:5432/opencut"),

	BETTER_AUTH_SECRET: z.string().default("offline_better_auth_secret_desktop"),
	UPSTASH_REDIS_REST_URL: z.url().default("https://placeholder.example.com"),
	UPSTASH_REDIS_REST_TOKEN: z.string().default("offline_token"),
	MARBLE_WORKSPACE_KEY: z.string().default("offline_workspace_key"),
	FREESOUND_CLIENT_ID: z.string().default("offline_freesound_id"),
	FREESOUND_API_KEY: z.string().default("offline_freesound_key"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const webEnv = webEnvSchema.parse(process.env);
