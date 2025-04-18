interface CacheEntry {
	data: any;
	timestamp: number;
}

class MemoryCache {
	private cache: Map<string, CacheEntry>;
	private ttl: number;

	constructor(ttl: number = 120000) {
		// Default 2 minutes in milliseconds
		this.cache = new Map();
		this.ttl = ttl;
	}

	get(key: string): any | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	set(key: string, data: any): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now()
		});
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}
}

export const cache = new MemoryCache();
