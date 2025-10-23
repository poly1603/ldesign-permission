/**
 * @ldesign/permission - 缓存类型定义
 * 
 * 权限缓存相关类型
 */

/**
 * 缓存键类型
 */
export type CacheKey = string

/**
 * 缓存值类型
 */
export type CacheValue = any

/**
 * 缓存条目
 */
export interface CacheEntry<T = CacheValue> {
  /** 键 */
  key: CacheKey
  /** 值 */
  value: T
  /** 过期时间戳 */
  expiresAt?: number
  /** 创建时间戳 */
  createdAt: number
  /** 最后访问时间戳 */
  lastAccessedAt: number
  /** 访问次数 */
  hitCount: number
  /** 权重（用于缓存策略） */
  weight?: number
}

/**
 * 缓存策略类型
 */
export enum CacheStrategy {
  /** LRU（最近最少使用） */
  LRU = 'lru',
  /** LFU（最不经常使用） */
  LFU = 'lfu',
  /** FIFO（先进先出） */
  FIFO = 'fifo',
  /** TTL（基于时间） */
  TTL = 'ttl',
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 缓存策略 */
  strategy?: CacheStrategy
  /** 最大缓存条目数 */
  maxSize?: number
  /** 默认TTL（毫秒） */
  ttl?: number
  /** 是否启用统计 */
  enableStats?: boolean
  /** 是否启用压缩 */
  enableCompression?: boolean
}

/**
 * 缓存统计
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number
  /** 缓存未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 当前缓存条目数 */
  size: number
  /** 最大缓存条目数 */
  maxSize: number
  /** 驱逐次数 */
  evictions: number
  /** 过期次数 */
  expirations: number
}

/**
 * 缓存键构建器配置
 */
export interface CacheKeyBuilderConfig {
  /** 键前缀 */
  prefix?: string
  /** 键分隔符 */
  separator?: string
  /** 是否包含时间戳 */
  includeTimestamp?: boolean
}

/**
 * 预加载策略
 */
export enum PreloadStrategy {
  /** 预加载所有 */
  ALL = 'all',
  /** 预加载常用 */
  COMMON = 'common',
  /** 按需加载 */
  ON_DEMAND = 'on-demand',
  /** 智能预测 */
  SMART = 'smart',
}

/**
 * 预加载配置
 */
export interface PreloadConfig {
  /** 预加载策略 */
  strategy?: PreloadStrategy
  /** 预加载项列表 */
  items?: string[]
  /** 预加载批次大小 */
  batchSize?: number
  /** 预加载延迟（毫秒） */
  delay?: number
}

/**
 * 缓存事件类型
 */
export enum CacheEventType {
  /** 缓存设置 */
  SET = 'set',
  /** 缓存获取 */
  GET = 'get',
  /** 缓存删除 */
  DELETE = 'delete',
  /** 缓存清空 */
  CLEAR = 'clear',
  /** 缓存驱逐 */
  EVICT = 'evict',
  /** 缓存过期 */
  EXPIRE = 'expire',
  /** 缓存命中 */
  HIT = 'hit',
  /** 缓存未命中 */
  MISS = 'miss',
}

/**
 * 缓存事件
 */
export interface CacheEvent {
  /** 事件类型 */
  type: CacheEventType
  /** 缓存键 */
  key?: CacheKey
  /** 缓存值 */
  value?: CacheValue
  /** 时间戳 */
  timestamp: number
  /** 元数据 */
  metadata?: Record<string, any>
}



