/**
 * @ldesign/permission - 权限过期管理器
 * 
 * 负责管理权限和角色的过期时间
 * 提供自动清理和过期通知功能
 */

import type { ExpirationEntry, ExpirationCallback } from '../../types/expiration'

/**
 * 过期管理器类
 * 
 * 功能：
 * - 跟踪权限和角色的过期时间
 * - 自动清理过期项
 * - 过期前通知
 * - 手动清理接口
 */
export class ExpirationManager {
  /** 过期项存储 */
  private expirations = new Map<string, ExpirationEntry>()

  /** 过期回调函数 */
  private callbacks = new Map<string, ExpirationCallback>()

  /** 自动清理定时器 */
  private cleanupTimer?: NodeJS.Timeout

  /** 通知定时器 */
  private notifyTimer?: NodeJS.Timeout

  /** 自动清理间隔（毫秒） */
  private cleanupInterval: number

  /** 过期前通知时间（毫秒） */
  private notifyBefore: number

  /**
   * 创建过期管理器实例
   * 
   * @param cleanupInterval - 自动清理间隔，默认 1 分钟
   * @param notifyBefore - 过期前多久通知，默认 5 分钟
   */
  constructor(
    cleanupInterval: number = 60 * 1000,  // 1 分钟
    notifyBefore: number = 5 * 60 * 1000  // 5 分钟
  ) {
    this.cleanupInterval = cleanupInterval
    this.notifyBefore = notifyBefore
  }

  /**
   * 添加过期项
   * 
   * @param key - 唯一键
   * @param expiresAt - 过期时间
   * @param metadata - 元数据
   */
  add(key: string, expiresAt: Date, metadata?: Record<string, any>): void {
    this.expirations.set(key, {
      key,
      expiresAt,
      createdAt: new Date(),
      metadata,
    })
  }

  /**
   * 移除过期项
   * 
   * @param key - 唯一键
   * @returns 是否成功移除
   */
  remove(key: string): boolean {
    return this.expirations.delete(key)
  }

  /**
   * 检查项是否过期
   * 
   * @param key - 唯一键
   * @returns 是否过期
   */
  isExpired(key: string): boolean {
    const entry = this.expirations.get(key)
    if (!entry) {
      return false
    }

    return new Date() >= entry.expiresAt
  }

  /**
   * 获取过期项
   * 
   * @param key - 唯一键
   * @returns 过期项，不存在则返回 undefined
   */
  get(key: string): ExpirationEntry | undefined {
    return this.expirations.get(key)
  }

  /**
   * 获取剩余时间（毫秒）
   * 
   * @param key - 唯一键
   * @returns 剩余毫秒数，已过期返回 0，不存在返回 -1
   */
  getTimeRemaining(key: string): number {
    const entry = this.expirations.get(key)
    if (!entry) {
      return -1
    }

    const remaining = entry.expiresAt.getTime() - Date.now()
    return Math.max(0, remaining)
  }

  /**
   * 更新过期时间
   * 
   * @param key - 唯一键
   * @param expiresAt - 新的过期时间
   * @returns 是否成功更新
   */
  update(key: string, expiresAt: Date): boolean {
    const entry = this.expirations.get(key)
    if (!entry) {
      return false
    }

    entry.expiresAt = expiresAt
    return true
  }

  /**
   * 延长过期时间
   * 
   * @param key - 唯一键
   * @param duration - 延长的时间（毫秒）
   * @returns 是否成功延长
   */
  extend(key: string, duration: number): boolean {
    const entry = this.expirations.get(key)
    if (!entry) {
      return false
    }

    entry.expiresAt = new Date(entry.expiresAt.getTime() + duration)
    return true
  }

  /**
   * 注册过期回调
   * 
   * 当项过期时会调用此回调
   * 
   * @param key - 唯一键
   * @param callback - 回调函数
   */
  onExpire(key: string, callback: ExpirationCallback): void {
    this.callbacks.set(key, callback)
  }

  /**
   * 移除过期回调
   * 
   * @param key - 唯一键
   * @returns 是否成功移除
   */
  offExpire(key: string): boolean {
    return this.callbacks.delete(key)
  }

  /**
   * 清理所有过期项
   * 
   * @returns 清理的项数量
   */
  cleanup(): number {
    const now = new Date()
    let cleanedCount = 0
    const keysToDelete: string[] = []

    // 收集过期的键
    for (const [key, entry] of this.expirations.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    // 删除并触发回调
    for (const key of keysToDelete) {
      const entry = this.expirations.get(key)
      this.expirations.delete(key)
      cleanedCount++

      // 触发回调
      const callback = this.callbacks.get(key)
      if (callback && entry) {
        try {
          callback(entry)
        } catch (error) {
          console.error(`Error in expiration callback for "${key}":`, error)
        }
        this.callbacks.delete(key)
      }
    }

    return cleanedCount
  }

  /**
   * 检查即将过期的项
   * 
   * @returns 即将过期的项列表
   */
  getExpiringSoon(): ExpirationEntry[] {
    const now = Date.now()
    const threshold = now + this.notifyBefore
    const expiringSoon: ExpirationEntry[] = []

    for (const entry of this.expirations.values()) {
      const expiresAt = entry.expiresAt.getTime()
      if (expiresAt > now && expiresAt <= threshold) {
        expiringSoon.push(entry)
      }
    }

    return expiringSoon
  }

  /**
   * 启动自动清理
   * 
   * 定期清理过期项
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return // 已经启动
    }

    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
        console.log(`Expiration cleanup: ${cleaned} items removed`)
      }
    }, this.cleanupInterval)
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 启动过期通知
   * 
   * 定期检查即将过期的项并发送通知
   */
  startExpirationNotify(): void {
    if (this.notifyTimer) {
      return
    }

    this.notifyTimer = setInterval(() => {
      const expiringSoon = this.getExpiringSoon()

      for (const entry of expiringSoon) {
        const callback = this.callbacks.get(entry.key)
        if (callback) {
          try {
            callback(entry, true) // true 表示即将过期通知
          } catch (error) {
            console.error(`Error in expiration notify callback for "${entry.key}":`, error)
          }
        }
      }
    }, this.cleanupInterval)
  }

  /**
   * 停止过期通知
   */
  stopExpirationNotify(): void {
    if (this.notifyTimer) {
      clearInterval(this.notifyTimer)
      this.notifyTimer = undefined
    }
  }

  /**
   * 清空所有过期项
   */
  clear(): void {
    this.expirations.clear()
    this.callbacks.clear()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let activeCount = 0
    let expiringSoonCount = 0

    for (const entry of this.expirations.values()) {
      const expiresAt = entry.expiresAt.getTime()

      if (expiresAt <= now) {
        expiredCount++
      } else if (expiresAt <= now + this.notifyBefore) {
        expiringSoonCount++
      } else {
        activeCount++
      }
    }

    return {
      total: this.expirations.size,
      expired: expiredCount,
      active: activeCount,
      expiringSoon: expiringSoonCount,
      callbacks: this.callbacks.size,
    }
  }

  /**
   * 销毁管理器
   * 
   * 停止所有定时器并清理资源
   */
  destroy(): void {
    this.stopAutoCleanup()
    this.stopExpirationNotify()
    this.clear()
  }
}

