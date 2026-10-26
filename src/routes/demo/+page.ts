import type { Data } from '#lib/types.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	const data: Data = {
		dataPoints: [
			{ title: '残額', value: '1234' },
			{ title: '有効ポイント', value: '560' },
			{ title: '還元可能ポイント', value: '500' },
			{ title: '当月失効予定ポイント', value: '0' }
		],
		name: '',
		cardNumber: 'OK001 7357 7357 7357'
	};

	return { data: data };
};
