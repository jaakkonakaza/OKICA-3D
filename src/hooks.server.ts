import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { DEV_USER } from '$app/env/private';
import { getUser } from '#lib/server/user.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getUser(event.request.headers, dev ? DEV_USER : undefined);
	const response = await resolve(event);
	if (event.route.id === '/') response.headers.set('cache-control', 'private, no-store');
	return response;
};
