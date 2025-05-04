import { LRUCache } from 'lru-cache';

export class FlexibleCache<K extends {} = string> { // eslint-disable-line
	private cache: LRUCache<K, {}>; // eslint-disable-line

	constructor(timeToLiveSeconds: number, maxSize?: number) {
		this.cache = new LRUCache({
			max: maxSize,
			ttlAutopurge: true,
			ttl: timeToLiveSeconds * 1000,
		});
	}


	set<T>(key: K, value: T): void {
		this.cache.set(key, value as {}); // eslint-disable-line
	}

	get<T>(key: K): T | undefined {
		return this.cache.get(key) as T;
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}
}
