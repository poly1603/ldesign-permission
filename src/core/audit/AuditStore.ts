/**
 * @ldesign/permission - 审计日志存储
 * 
 * 负责审计日志的存储和查询
 */

import type {
  AuditLogEntry,
  AuditLogStore as IAuditLogStore,
  AuditLogQueryOptions,
  AuditLogQueryResult,
} from '../../types'

/**
 * 审计日志存储类
 */
export class AuditStore implements IAuditLogStore {
  /** 日志条目存储 */
  private logs: Map<string, AuditLogEntry> = new Map()

  /** 日志索引（按时间排序） */
  private logsByTime: AuditLogEntry[] = []

  /** 最大日志数量 */
  private maxLogs: number

  /** 日志保留天数 */
  private retentionDays: number

  constructor(maxLogs: number = 10000, retentionDays: number = 90) {
    this.maxLogs = maxLogs
    this.retentionDays = retentionDays
  }

  /**
   * 添加日志
   */
  add(entry: AuditLogEntry): void {
    this.logs.set(entry.id, entry)
    this.logsByTime.push(entry)

    // 保持按时间排序
    this.logsByTime.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // 检查是否超过最大数量
    if (this.logs.size > this.maxLogs) {
      this.cleanup()
    }
  }

  /**
   * 批量添加日志
   */
  addBatch(entries: AuditLogEntry[]): void {
    entries.forEach(entry => {
      this.logs.set(entry.id, entry)
      this.logsByTime.push(entry)
    })

    this.logsByTime.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (this.logs.size > this.maxLogs) {
      this.cleanup()
    }
  }

  /**
   * 查询日志
   */
  query(options: AuditLogQueryOptions): AuditLogQueryResult {
    let filtered = Array.from(this.logs.values())

    // 按事件类型过滤
    if (options.eventTypes && options.eventTypes.length > 0) {
      filtered = filtered.filter(log => options.eventTypes!.includes(log.eventType))
    }

    // 按用户过滤
    if (options.userId) {
      filtered = filtered.filter(log => log.userId === options.userId)
    }

    // 按资源过滤
    if (options.resource) {
      filtered = filtered.filter(log => log.resource === options.resource)
    }

    // 按操作过滤
    if (options.action) {
      filtered = filtered.filter(log => log.action === options.action)
    }

    // 按时间范围过滤
    if (options.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime!)
    }

    if (options.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime!)
    }

    // 只查询拒绝的访问
    if (options.deniedOnly) {
      filtered = filtered.filter(log => log.allowed === false)
    }

    // 只查询允许的访问
    if (options.allowedOnly) {
      filtered = filtered.filter(log => log.allowed === true)
    }

    // 排序
    if (options.sortBy) {
      const sortBy = options.sortBy
      const order = options.sortOrder === 'asc' ? 1 : -1

      filtered.sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]

        if (aVal instanceof Date && bVal instanceof Date) {
          return order * (aVal.getTime() - bVal.getTime())
        }

        if (aVal < bVal) return -order
        if (aVal > bVal) return order
        return 0
      })
    }

    const total = filtered.length

    // 分页
    if (options.page !== undefined && options.pageSize !== undefined) {
      const start = (options.page - 1) * options.pageSize
      const end = start + options.pageSize
      filtered = filtered.slice(start, end)

      return {
        entries: filtered,
        total,
        page: options.page,
        pageSize: options.pageSize,
        totalPages: Math.ceil(total / options.pageSize),
      }
    }

    // 限制数量
    if (options.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return {
      entries: filtered,
      total,
    }
  }

  /**
   * 获取单个日志
   */
  get(id: string): AuditLogEntry | null {
    return this.logs.get(id) || null
  }

  /**
   * 删除日志
   */
  remove(id: string): void {
    const log = this.logs.get(id)
    if (log) {
      this.logs.delete(id)
      const index = this.logsByTime.indexOf(log)
      if (index !== -1) {
        this.logsByTime.splice(index, 1)
      }
    }
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs.clear()
    this.logsByTime = []
  }

  /**
   * 导出日志
   */
  export(options?: AuditLogQueryOptions): AuditLogEntry[] {
    if (options) {
      const result = this.query(options)
      return result.entries
    }

    return Array.from(this.logs.values())
  }

  /**
   * 清理过期日志
   */
  private cleanup(): void {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000)

    // 删除过期日志
    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoffDate) {
        this.logs.delete(id)
      }
    }

    // 更新索引
    this.logsByTime = this.logsByTime.filter(log => log.timestamp >= cutoffDate)

    // 如果还是超过最大数量，删除最旧的日志
    if (this.logs.size > this.maxLogs) {
      const toDelete = this.logs.size - this.maxLogs
      const oldestLogs = this.logsByTime.slice(-toDelete)

      oldestLogs.forEach(log => {
        this.logs.delete(log.id)
      })

      this.logsByTime = this.logsByTime.slice(0, -toDelete)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalLogs: this.logs.size,
      maxLogs: this.maxLogs,
      retentionDays: this.retentionDays,
    }
  }
}



