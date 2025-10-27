/**
 * @ldesign/permission - LRU 缓存实现
 * 
 * 实现基于最近最少使用（Least Recently Used）算法的缓存系统
 * 使用 Map + 双向链表实现 O(1) 时间复杂度的读写操作
 */

import type { CacheNode, CacheStats, ILRUCache } from '../../types/cache'

/**
 * LRU 缓存类
 * 
 * 特性：
 * - O(1) 时间复杂度的 get/set 操作
 * - 自动淘汰最久未使用的缓存项
 * - 支持 TTL（过期时间）
 * - 提供缓存统计信息
 * 
 * @template K - 键类型
 * @template V - 值类型
 */
export class LRUCache<K, V> implements ILRUCache<K, V> {
  /** 缓存 Map，存储键到节点的映射 */
  private cache = new Map<K, CacheNode<K, V>>()

  /** 双向链表的头节点（最近使用） */
  private head: CacheNode<K, V> | null = null

  /** 双向链表的尾节点（最久未使用） */
  private tail: CacheNode<K, V> | null = null

  /** 命中次数统计 */
  private hits = 0

  /** 未命中次数统计 */
  private misses = 0

  /** 淘汰次数统计 */
  private evictions = 0

  /**
   * 创建 LRU 缓存实例
   * 
   * @param maxSize - 最大缓存数量，默认 1000
   * @param ttl - 缓存过期时间（毫秒），默认 5 分钟
   */
  constructor(
    private maxSize: number = 1000,
    private ttl: number = 5 * 60 * 1000
  ) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be greater than 0')
    }
    if (ttl <= 0) {
      throw new Error('ttl must be greater than 0')
    }
  }

  /**
   * 获取缓存值
   * 
   * 如果缓存存在且未过期，将该项移到链表头部（标记为最近使用）
   * 
   * @param key - 缓存键
   * @returns 缓存值，不存在或已过期则返回 undefined
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key)

    if (!node) {
      this.misses++
      return undefined
    }

    // 检查是否过期
    if (this.isExpired(node)) {
      this.delete(key)
      this.misses++
      return undefined
    }

    // 移到头部（标记为最近使用）
    this.moveToHead(node)
    this.hits++

    return node.value
  }

  /**
   * 设置缓存值
   * 
   * 如果缓存已满，会淘汰最久未使用的项
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   */
  set(key: K, value: V): void {
    let node = this.cache.get(key)

    if (node) {
      // 更新现有节点
      node.value = value
      node.timestamp = Date.now()
      this.moveToHead(node)
    } else {
      // 创建新节点
      node = {
        key,
        value,
        timestamp: Date.now(),
        prev: null,
        next: null,
      }

      this.cache.set(key, node)
      this.addToHead(node)

      // 检查是否超出容量
      if (this.cache.size > this.maxSize) {
        // 淘汰尾部节点（最久未使用）
        if (this.tail) {
          this.cache.delete(this.tail.key)
          this.removeNode(this.tail)
          this.evictions++
        }
      }
    }
  }

  /**
   * 删除缓存项
   * 
   * @param key - 缓存键
   * @returns 是否成功删除
   */
  delete(key: K): boolean {
    const node = this.cache.get(key)

    if (!node) {
      return false
    }

    this.cache.delete(key)
    this.removeNode(node)

    return true
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  /**
   * 检查缓存是否存在
   * 
   * @param key - 缓存键
   * @returns 是否存在且未过期
   */
  has(key: K): boolean {
    const node = this.cache.get(key)

    if (!node) {
      return false
    }

    if (this.isExpired(node)) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取当前缓存大小
   * 
   * @returns 缓存项数量
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 统计信息对象
   */
  stats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.evictions,
    }
  }

  /**
   * 清理所有过期的缓存项
   * 
   * @returns 清理的缓存项数量
   */
  cleanup(): number {
    let cleanedCount = 0
    const keysToDelete: K[] = []

    // 收集过期的键
    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node)) {
        keysToDelete.push(key)
      }
    }

    // 删除过期项
    for (const key of keysToDelete) {
      this.delete(key)
      cleanedCount++
    }

    return cleanedCount
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 键数组（按最近使用顺序）
   */
  keys(): K[] {
    const keys: K[] = []
    let current = this.head

    while (current) {
      keys.push(current.key)
      current = current.next
    }

    return keys
  }

  /**
   * 获取所有缓存值
   * 
   * @returns 值数组（按最近使用顺序）
   */
  values(): V[] {
    const values: V[] = []
    let current = this.head

    while (current) {
      values.push(current.value)
      current = current.next
    }

    return values
  }

  /**
   * 遍历缓存项
   * 
   * @param callback - 回调函数
   */
  forEach(callback: (value: V, key: K) => void): void {
    let current = this.head

    while (current) {
      callback(current.value, current.key)
      current = current.next
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 检查节点是否过期
   * 
   * @param node - 缓存节点
   * @returns 是否过期
   */
  private isExpired(node: CacheNode<K, V>): boolean {
    return Date.now() - node.timestamp > this.ttl
  }

  /**
   * 将节点添加到链表头部
   * 
   * @param node - 要添加的节点
   */
  private addToHead(node: CacheNode<K, V>): void {
    node.prev = null
    node.next = this.head

    if (this.head) {
      this.head.prev = node
    }

    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * 从链表中移除节点
   * 
   * @param node - 要移除的节点
   */
  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }
  }

  /**
   * 将节点移到链表头部
   * 
   * @param node - 要移动的节点
   */
  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return
    }

    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }
}


