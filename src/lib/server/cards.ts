import { error } from '@sveltejs/kit';
import { OKICA_ACCOUNTS } from '$app/env/private';
import type { Data } from '#lib/types.ts';
import { fetchDataPoints } from './okica.ts';

const TTL = 2 * 60 * 1000;
// Cache failures longer to avoid repeated logins locking the account.
const FAILURE_TTL = 5 * 60 * 1000;

interface Entry {
	data: Promise<Data>;
	// Infinity while the fetch is in flight.
	expires: number;
}

const sessions = new Map<string, string>();

const cache = new Map<string, Entry>();

export function getCard(user: string): Promise<Data> {
	const account = OKICA_ACCOUNTS.get(user);
	if (!account) error(403, 'No OKICA account is configured for this user');

	const hit = cache.get(user);
	if (hit && Date.now() < hit.expires) return hit.data;

	const entry: Entry = {
		data: fetchDataPoints(account.email, account.password, sessions.get(user)).then(
			({ dataPoints, auth }) => {
				sessions.set(user, auth);
				return { dataPoints, name: '', cardNumber: account.cardNumber };
			}
		),
		expires: Infinity
	};
	entry.data.then(
		() => (entry.expires = Date.now() + TTL),
		() => (entry.expires = Date.now() + FAILURE_TTL)
	);
	cache.set(user, entry);
	return entry.data;
}
