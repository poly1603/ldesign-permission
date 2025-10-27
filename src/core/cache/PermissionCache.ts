/**
 * @ldesign/permission - 权限缓存管理器
 * 
 * 基于 LRU 算法的权限检查结果缓存
 * 提供高效的权限缓存和查询功能
 */

import type { CheckResult } from '../../types/core'
import type { CacheConfig, PermissionCacheKey, PermissionCacheValue } from '../../types/cache'
import { LRUCache } from './LRUCache'
import { hashObject } from '../../shared/utils'

/**
 * 权限缓存管理器类
 * 
 * 功能：
 * - 缓存权限检查结果
 * - 自动生成缓存键
 * - 支持上下文哈希
 * - 提供缓存失效机制
 */
export class PermissionCache {
  /** LRU 缓存实例 */
  private cache: LRUCache<string, PermissionCacheValue>

  /** 是否启用缓存 */
  private enabled: boolean

  /**
   * 创建权限缓存实例
   * 
   * @param config - 缓存配置
   */
  constructor(config: CacheConfig = {}) {
    this.enabled = config.enabled ?? true

    this.cache = new LRUCache<string, PermissionCacheValue>(
      config.maxSize ?? 1000,
      config.ttl ?? 5 * 60 * 1000 // 默认 5 分钟
    )
  }

  /**
   * 获取缓存的权限检查结果
   * 
   * @param key - 权限缓存键
   * @returns 缓存的检查结果，不存在则返回 undefined
   */
  get(key: PermissionCacheKey): CheckResult | undefined {
    if (!this.enabled) {
      return undefined
    }

    const cacheKey = this.generateCacheKey(key)
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return undefined
    }

    // 返回结果并标记为来自缓存
    return {
      ...cached.result,
      fromCache: true,
    }
  }

  /**
   * 设置权限检查结果缓存
   * 
   * @param key - 权限缓存键
   * @param result - 检查结果
   */
  set(key: PermissionCacheKey, result: CheckResult): void {
    if (!this.enabled) {
      return
    }

    const cacheKey = this.generateCacheKey(key)
    const value: PermissionCacheValue = {
      result,
      cachedAt: Date.now(),
    }

    this.cache.set(cacheKey, value)
  }

  /**
   * 删除指定用户的所有缓存
   * 
   * 当用户的权限发生变化时调用
   * 
   * @param userId - 用户ID
   * @returns 删除的缓存项数量
   */
  invalidateUser(userId: string): number {
    if (!this.enabled) {
      return 0
    }

    let count = 0
    const keys = this.cache.keys()

    for (const key of keys) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 删除指定资源的所有缓存
   * 
   * 当资源的权限策略发生变化时调用
   * 
   * @param resource - 资源名称
   * @returns 删除的缓存项数量
   */
  invalidateResource(resource: string): number {
    if (!this.enabled) {
      return 0
    }

    let count = 0
    const keys = this.cache.keys()

    for (const key of keys) {
      if (key.includes(`:${resource}:`)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 删除指定角色相关的所有缓存
   * 
   * 当角色的权限发生变化时调用
   * 
   * @param roleName - 角色名称
   * @param userIds - 拥有该角色的用户ID列表
   * @returns 删除的缓存项数量
   */
  invalidateRole(roleName: string, userIds: string[]): number {
    if (!this.enabled) {
      return 0
    }

    let count = 0

    // 删除所有相关用户的缓存
    for (const userId of userIds) {
      count += this.invalidateUser(userId)
    }

    return count
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清理过期的缓存项
   * 
   * @returns 清理的缓存项数量
   */
  cleanup(): number {
    return this.cache.cleanup()
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 统计信息
   */
  getStats() {
    return {
      ...this.cache.stats(),
      enabled: this.enabled,
    }
  }

  /**
   * 启用缓存
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * 禁用缓存
   * 
   * 禁用后会清空现有缓存
   */
  disable(): void {
    this.enabled = false
    this.cache.clear()
  }

  /**
   * 检查缓存是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 重置缓存统计信息
   */
  resetStats(): void {
    this.cache.resetStats()
  }

  // ==================== 私有方法 ====================

  /**
   * 生成缓存键
   * 
   * 格式：userId:resource:action[:contextHash]
   * 
   * @param key - 权限缓存键对象
   * @returns 缓存键字符串
   */
  private generateCacheKey(key: PermissionCacheKey): string {
    const parts = [key.userId, key.resource, key.action]

    if (key.contextHash) {
      parts.push(key.contextHash)
    }

    return parts.join(':')
  }
}

/**
 * 生成上下文哈希
 * 
 * 用于区分不同上下文的权限检查
 * 
 * @param context - 上下文对象
 * @returns 哈希字符串
 */
export function generateContextHash(context?: Record<string, any>): string | undefined {
  if (!context || Object.keys(context).length === 0) {
    return undefined
  }

  return hashObject(context)
}

/**
 * 创建权限缓存键
 * 
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @param context - 可选的上下文
 * @returns 权限缓存键对象
 */
export function createPermissionCacheKey(
  userId: string,
  resource: string,
  action: string,
  context?: Record<string, any>
): PermissionCacheKey {
  return {
    userId,
    resource,
    action,
    contextHash: generateContextHash(context),
  }
}


