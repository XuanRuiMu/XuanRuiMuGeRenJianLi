package dev.yuxiangkun.matcher.service;

/**
 * 缓存抽象：Redis 与 Caffeine 两种实现共用同一接口，
 * 业务层（匹配服务 / 限流器）只依赖本接口。
 */
public interface KvCache {

    String get(String key);

    void put(String key, String value, long ttlSeconds);

    long increment(String key, long ttlSeconds);
}
