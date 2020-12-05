import RedLock, {Lock} from 'redlock';
import IORedis from 'ioredis';
import config from 'config';

let redis: RedisClient | any;

export interface RedisClient extends IORedis.Redis {
  getLock: (resource: string, ttl?: number) => Lock | null;
}

if (config.has('redis')) {
  redis = new IORedis(config.get('redis'));
  redis.getLock = getLock.bind(redis, createRedLock(redis));
}

export function createRedLock(client: IORedis.Redis) {
  return new RedLock([client], {
    retryCount: 10, // Maximum number of retries
    retryDelay: 100, // Retry interval
    retryJitter: 200, // Improve performance
  });
}

export function getLock(redLock: RedLock, resource: string, ttl = 1000): Promise<Lock | null> {
  return new Promise((resolve) => {
    redLock
      .lock(resource, ttl)
      .then((lock: Lock) => {
        resolve(lock);
      })
      .catch(() => {
        resolve(null);
      });
  });
}

export function getClient(): RedisClient | undefined {
  return redis;
}
