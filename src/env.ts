import { defineEnvVars } from '@sveltejs/kit/env';

export interface Account {
	email: string;
	password: string;
	cardNumber: string;
}

const isAccount = (value: unknown): value is Account =>
	typeof value === 'object' &&
	value !== null &&
	['email', 'password', 'cardNumber'].every(
		(key) =>
			typeof (value as Record<string, unknown>)[key] === 'string' &&
			(value as Record<string, string>)[key] !== ''
	);

export const variables = defineEnvVars({
	OKICA_ACCOUNTS: {
		description:
			'JSON object mapping a Pocket ID username to OKICA login details: {"<username>": {"email", "password", "cardNumber"}}',
		schema: (value) => {
			const accounts = new Map<string, Account>();
			if (!value) return accounts;

			let parsed: unknown;
			try {
				parsed = JSON.parse(value);
			} catch {
				// Parser errors can contain passwords.
				throw new Error('OKICA_ACCOUNTS is not valid JSON');
			}
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new Error('OKICA_ACCOUNTS must be a JSON object');
			}

			for (const [user, account] of Object.entries(parsed)) {
				if (!isAccount(account)) {
					throw new Error(`OKICA_ACCOUNTS.${user} needs email, password and cardNumber strings`);
				}
				accounts.set(user, account);
			}
			return accounts;
		}
	},
	DEV_USER: {
		description: 'Username to act as under `vite dev`, where no forward-auth gate sets Remote-User',
		schema: (value) => (value === '' ? undefined : value)
	}
});
