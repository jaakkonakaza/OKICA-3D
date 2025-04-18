import type { PageLoad } from './$types';
import type { Data } from './types';

export const load: PageLoad = async ({ fetch, url }) => {
	const apiKey = url.searchParams.get('apiKey');

	const data: Promise<Data> = apiKey
		? fetch(`http://localhost:3001/data?apiKey=${apiKey}`).then((r) => r.json())
		: new Promise((resolve) =>
				setTimeout(
					() =>
						resolve({
							dataPoints: [
								{ title: '残額', value: (Math.random() * 10000).toFixed(0) },
								{ title: '有効ポイント', value: (Math.random() * 1000).toFixed(0) },
								{ title: '還元可能ポイント', value: (Math.random() * 1000).toFixed(0) },
								{ title: '当月失効予定ポイント', value: (Math.random() * 1000).toFixed(0) }
							],
							name: '',
							cardNumber: 'OK001 7357 7357 7357'
						}),
					5000
				)
			);

	return { data };
};
