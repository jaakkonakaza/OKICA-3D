import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDataPoints } from './okica.ts';

vi.mock('$app/env/private', () => ({
	OKICA_ACCOUNTS: new Map([['jaakko', { email: 'e', password: 'p', cardNumber: 'OK1' }]])
}));
vi.mock('./okica.ts', () => ({ fetchDataPoints: vi.fn() }));

const fetchMock = vi.mocked(fetchDataPoints);
const dataPoints = [{ title: '残額' as const, value: '1' }];

describe('getCard', () => {
	beforeEach(() => {
		vi.resetModules();
		fetchMock.mockReset();
		vi.useFakeTimers();
	});

	const load = async () => (await import('./cards.ts')).getCard;

	it('rejects users without an account, including Object prototype names', async () => {
		const getCard = await load();
		for (const user of ['stranger', 'constructor', '__proto__', 'toString']) {
			expect(() => getCard(user)).toThrow(expect.objectContaining({ status: 403 }) as Error);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('shares one in-flight fetch and caches the result for two minutes', async () => {
		fetchMock.mockResolvedValue({ dataPoints, auth: 'a1' });
		const getCard = await load();

		const [first, second] = [getCard('jaakko'), getCard('jaakko')];
		expect(first).toBe(second);
		await expect(first).resolves.toEqual({ dataPoints, name: '', cardNumber: 'OK1' });
		expect(fetchMock).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(119_000);
		await getCard('jaakko');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(2_000);
		await getCard('jaakko');
		expect(fetchMock).toHaveBeenCalledTimes(2);

		expect(fetchMock).toHaveBeenLastCalledWith('e', 'p', 'a1');
	});

	it('remembers a failure for five minutes instead of retrying the login', async () => {
		fetchMock.mockRejectedValue(new Error('Login failed (200)'));
		const getCard = await load();

		await expect(getCard('jaakko')).rejects.toThrow('Login failed');
		vi.advanceTimersByTime(4 * 60_000);
		await expect(getCard('jaakko')).rejects.toThrow('Login failed');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(61_000);
		await expect(getCard('jaakko')).rejects.toThrow('Login failed');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
