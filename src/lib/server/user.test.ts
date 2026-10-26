import { describe, expect, it } from 'vitest';
import { getUser } from './user.ts';

describe('getUser', () => {
	it('takes the username from the gate header', () => {
		expect(getUser(new Headers({ 'Remote-User': 'jaakko' }))).toBe('jaakko');
	});

	it('treats a missing or blank header as signed out', () => {
		expect(getUser(new Headers())).toBeNull();
		expect(getUser(new Headers({ 'Remote-User': '  ' }))).toBeNull();
	});

	it('falls back to the dev user only when one is given', () => {
		expect(getUser(new Headers(), 'dev')).toBe('dev');
		expect(getUser(new Headers(), '')).toBeNull();
		expect(getUser(new Headers({ 'Remote-User': 'real' }), 'dev')).toBe('real');
	});
});
