import { error } from '@sveltejs/kit';
import { getCard } from '#lib/server/cards.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) error(401, 'Not signed in');

	return { data: getCard(locals.user) };
};
