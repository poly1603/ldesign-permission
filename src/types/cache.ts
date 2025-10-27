/**
 * @ldesign/permission - 缓存类型定义
 * 
 * 定义权限缓存系统的相关类型
 */

import type { CheckResult } from './core'

/**
 * 缓存节点
 */
export interface CacheNode<K, V> {
  /** 键 */
  key: K
  /** 值 */
  value: V
  /** 创建时间戳 */
  timestamp: number
  /** 前一个节点 */
  prev: CacheNode<K, V> | null
  /** 后一个节点 */
  next: CacheNode<K, V> | null
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 最大缓存数量 */
  maxSize?: number
  /** 缓存过期时间（毫秒） */
  ttl?: number
  /** 是否启用缓存 */
  enabled?: boolean
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 总大小 */
  size: number
  /** 最大大小 */
  maxSize: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 命中率（百分比） */
  hitRate: number
  /** 过期清理次数 */
  evictions: number
}

/**
 * LRU 缓存接口
 */
export interface ILRUCache<K, V> {
  /** 获取缓存值 */
  get(key: K): V | undefined
  /** 设置缓存值 */
  set(key: K, value: V): void
  /** 删除缓存 */
  delete(key: K): boolean
  /** 清空缓存 */
  clear(): void
  /** 是否存在 */
  has(key: K): boolean
  /** 获取缓存大小 */
  size(): number
  /** 获取统计信息 */
  stats(): CacheStats
}

/**
 * 权限缓存键
 */
export interface PermissionCacheKey {
  /** 用户ID */
  userId: string
  /** 资源 */
  resource: string
  /** 操作 */
  action: string
  /** 上下文哈希（可选） */
  contextHash?: string
}

/**
 * 权限缓存值
 */
export interface PermissionCacheValue {
  /** 检查结果 */
  result: CheckResult
  /** 缓存时间 */
  cachedAt: number
}

/**
 * 缓存操作选项
 */
export interface CacheOptions {
  /** 是否跳过缓存 */
  skipCache?: boolean
  /** 是否刷新缓存 */
  refreshCache?: boolean
  /** 自定义 TTL */
  ttl?: number
}
