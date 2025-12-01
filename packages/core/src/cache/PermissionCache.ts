/**
 * 权限缓存管理器
 *
 * @description 提供高性能的权限检查结果缓存
 *
 * @module @ldesign/permission-core/cache
 * @author LDesign Team
 */

import type { CacheItem, CacheStats } from '../types'

/**
 * 权限缓存配置
 */
export interface PermissionCacheConfig {
  /** 最大缓存数量 */
  maxSize?: number
  /** 默认过期时间（毫秒） */
  defaultTTL?: number
  /** 是否启用统计 */
  enableStats?: boolean
}

/**
 * 权限缓存管理器
 *
 * @description
 * 使用 LRU (Least Recently Used) 策略管理缓存
 *
 * **特性**：
 * - O(1) 时间复杂度的读写操作
 * - 自动过期清理
 * - 缓存命中率统计
 * - 内存使用限制
 *
 * @example
 * ```ts
 * const cache = new PermissionCache({ maxSize: 1000, defaultTTL: 60000 })
 *
 * // 设置缓存
 * cache.set('permission:user:read', true)
 *
 * // 获取缓存
 * const result = cache.get('permission:user:read')
 *
 * // 清理过期缓存
 * cache.cleanup()
 * ```
 */
export class PermissionCache<T = boolean> {
  /** 缓存存储 */
  private cache = new Map<string, CacheItem<T>>()

  /** 缓存配置 */
  private readonly config: Required<PermissionCacheConfig>

  /** 统计数据 */
  private stats = {
    hits: 0,
    misses: 0,
  }

  /** 清理定时器 */
  private cleanupTimer?: ReturnType<typeof setInterval>

  /**
   * 创建权限缓存实例
   *
   * @param config - 缓存配置
   */
  constructor(config: PermissionCacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 500,
      defaultTTL: config.defaultTTL ?? 60000, // 默认 1 分钟
      enableStats: config.enableStats ?? true,
    }

    // 启动定期清理
    this.startCleanupTimer()
  }

  /**
   * 获取缓存值
   *
   * @param key - 缓存键
   * @returns 缓存值，不存在或已过期返回 undefined
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key)

    if (!item) {
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return undefined
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return undefined
    }

    // 更新访问信息（LRU）
    if (item.accessCount !== undefined) {
      item.accessCount++
    }

    if (this.config.enableStats) {
      this.stats.hits++
    }

    return item.value
  }

  /**
   * 设置缓存值
   *
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 过期时间（毫秒），可选
   */
  set(key: string, value: T, ttl?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evict()
    }

    const now = Date.now()
    const item: CacheItem<T> = {
      value,
      createdAt: now,
      expiresAt: now + (ttl ?? this.config.defaultTTL),
      accessCount: 0,
    }

    this.cache.set(key, item)
  }

  /**
   * 检查缓存是否存在
   *
   * @param key - 缓存键
   * @returns 是否存在有效缓存
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * 删除缓存
   *
   * @param key - 缓存键
   * @returns 是否删除成功
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * 根据前缀删除缓存
   *
   * @param prefix - 键前缀
   * @returns 删除的缓存数量
   */
  deleteByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      maxSize: this.config.maxSize,
    }
  }

  /**
   * 获取缓存大小
   *
   * @returns 当前缓存数量
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 清理过期缓存
   *
   * @returns 清理的缓存数量
   */
  cleanup(): number {
    const now = Date.now()
    let count = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 驱逐缓存（LRU 策略）
   *
   * @private
   */
  private evict(): void {
    // 淘汰访问次数最少的 20% 缓存
    const evictCount = Math.ceil(this.config.maxSize * 0.2)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => (a[1].accessCount ?? 0) - (b[1].accessCount ?? 0))
      .slice(0, evictCount)

    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  /**
   * 启动清理定时器
   *
   * @private
   */
  private startCleanupTimer(): void {
    // 每分钟清理一次过期缓存
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 60000)

    // 防止阻止进程退出
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as { unref: () => void }).unref()
    }
  }

  /**
   * 销毁缓存管理器
   *
   * @description 释放所有资源，清理定时器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.clear()
  }
}

/**
 * 创建权限缓存实例
 *
 * @param config - 缓存配置
 * @returns 权限缓存实例
 *
 * @example
 * ```ts
 * const cache = createPermissionCache({
 *   maxSize: 1000,
 *   defaultTTL: 30000, // 30 秒
 * })
 * ```
 */
export function createPermissionCache<T = boolean>(
  config?: PermissionCacheConfig,
): PermissionCache<T> {
  return new PermissionCache<T>(config)
}
