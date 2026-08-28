package dev.yuxiangkun.matcher.service;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Redis 实现：JD 匹配结果缓存 + 限流计数器。
 * 生产环境（docker-compose 起 Redis 后设 REDIS_ENABLED=true）使用。
 */
@Service
@ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "true")
public class RedisKvCache implements KvCache {

    private final StringRedisTemplate redis;

    public RedisKvCache(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public String get(String key) {
        return redis.opsForValue().get(key);
    }

    @Override
    public void put(String key, String value, long ttlSeconds) {
        redis.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public long increment(String key, long ttlSeconds) {
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, Duration.ofSeconds(ttlSeconds));
        }
        return count == null ? 0L : count;
    }
}
