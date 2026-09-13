package dev.yuxiangkun.matcher.service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Expiry;

/**
 * Caffeine 内存实现：本地开发无 Redis 时的降级方案，
 * 接口语义与 Redis 版完全一致（含 TTL 与固定窗口计数器）。
 */
@Service
@ConditionalOnProperty(name = "app.cache.redis-enabled", havingValue = "false", matchIfMissing = true)
public class CaffeineKvCache implements KvCache {

    private record Entry(String value, long expireAtMillis) {}

    private static final Expiry<String, Entry> TTL_EXPIRY = new Expiry<>() {
        @Override
        public long expireAfterCreate(String key, Entry entry, long currentTime) {
            return Math.max(1, entry.expireAtMillis() - System.currentTimeMillis()) * 1_000_000L;
        }

        @Override
        public long expireAfterUpdate(String key, Entry entry, long currentTime, long currentDuration) {
            return expireAfterCreate(key, entry, currentTime);
        }

        @Override
        public long expireAfterRead(String key, Entry entry, long currentTime, long currentDuration) {
            return currentDuration;
        }
    };

    private final Cache<String, Entry> store;
    private final Cache<String, AtomicLong> counters;

    public CaffeineKvCache() {
        this.store = Caffeine.newBuilder().expireAfter(TTL_EXPIRY).maximumSize(10_000).build();
        this.counters = Caffeine.newBuilder().expireAfterAccess(Duration.ofMinutes(2)).build();
    }

    @Override
    public String get(String key) {
        Entry entry = store.getIfPresent(key);
        return entry == null ? null : entry.value();
    }

    @Override
    public void put(String key, String value, long ttlSeconds) {
        store.put(key, new Entry(value, Instant.now().plusSeconds(ttlSeconds).toEpochMilli()));
    }

    @Override
    public long increment(String key, long ttlSeconds) {
        AtomicLong counter = counters.get(key, k -> new AtomicLong(0));
        long value = counter.incrementAndGet();
        if (value == 1L) {
            // 固定窗口起点：窗口到期后清零计数，实现每分钟限流
            CompletableFuture.delayedExecutor(ttlSeconds, TimeUnit.SECONDS)
                    .execute(() -> counters.invalidate(key));
        }
        return value;
    }
}
