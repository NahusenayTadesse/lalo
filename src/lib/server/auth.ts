import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { customerResetPasswordTemplate, sendEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,

	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: {
		enabled: true,
		revokeSessionsOnPasswordReset: true,

		sendResetPassword: async ({ user, url }) => {
			const template = customerResetPasswordTemplate(url);

			try {
				await sendEmail(user.email, template.subject, template.html);
			} catch (err) {
				// Without this the client only saw a generic better-auth error and the log
				// had nothing saying the mail server was the cause.
				console.error(`Password reset email to ${user.email} failed:`, err);
				throw err;
			}
		},

		onPasswordReset: async ({ user }, request) => {
			console.log(`Password for user ${user.email} has been reset.`);
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
