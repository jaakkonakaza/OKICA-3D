export interface DataPoint {
	title: string;
	value: string;
}

export interface Data {
	dataPoints: DataPoint[];
	name: string;
	cardNumber: string;
}
