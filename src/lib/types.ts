export const DATA_POINT_TITLES = [
	'残額',
	'有効ポイント',
	'還元可能ポイント',
	'当月失効予定ポイント'
] as const;

interface DataPoint {
	title: string;
	value: string;
}

export interface Data {
	dataPoints: DataPoint[];
	name: string;
	cardNumber: string;
}
