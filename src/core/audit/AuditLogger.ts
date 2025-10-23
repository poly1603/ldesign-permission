/**
 * @ldesign/permission - 审计日志记录器
 * 
 * 负责记录权限相关的审计日志
 */

import type {
  AuditLogEntry,
  AuditEventType,
  AuditConfig,
  Context,
  Effect,
  AuditStats,
  AuditReport,
} from '../../types'
import { AuditStore } from './AuditStore'

/**
 * 审计日志记录器类
 */
export class AuditLogger {
  /** 审计日志存储 */
  private store: AuditStore

  /** 配置 */
  private config: Required<AuditConfig>

  /** 自动清理定时器 */
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: AuditConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      eventTypes: config.eventTypes ?? [],
      includeContext: config.includeContext ?? true,
      includeIpAddress: config.includeIpAddress ?? true,
      includeUserAgent: config.includeUserAgent ?? true,
      retentionDays: config.retentionDays ?? 90,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 24 * 60 * 60 * 1000, // 24小时
      maxLogs: config.maxLogs ?? 10000,
    }

    this.store = new AuditStore(this.config.maxLogs, this.config.retentionDays)

    // 启动自动清理
    if (this.config.autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * 记录日志
   */
  log(
    eventType: AuditEventType,
    data: Partial<AuditLogEntry>
  ): void {
    if (!this.config.enabled) {
      return
    }

    // 检查是否记录此类型事件
    if (this.config.eventTypes.length > 0 && !this.config.eventTypes.includes(eventType)) {
      return
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      eventType,
      timestamp: new Date(),
      userId: data.userId,
      username: data.username,
      resource: data.resource,
      action: data.action,
      effect: data.effect,
      allowed: data.allowed,
      role: data.role,
      permission: data.permission,
      context: this.config.includeContext ? data.context : undefined,
      ipAddress: this.config.includeIpAddress ? data.ipAddress : undefined,
      userAgent: this.config.includeUserAgent ? data.userAgent : undefined,
      reason: data.reason,
      duration: data.duration,
      metadata: data.metadata,
    }

    this.store.add(entry)
  }

  /**
   * 记录权限检查
   */
  logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    allowed: boolean,
    duration?: number,
    context?: Context,
    reason?: string
  ): void {
    this.log('permission_check', {
      userId,
      resource,
      action,
      allowed,
      duration,
      context,
      reason,
    })
  }

  /**
   * 记录权限授予
   */
  logPermissionGranted(
    roleName: string,
    permission: string,
    grantedBy?: string
  ): void {
    this.log('permission_granted', {
      role: roleName,
      permission,
      metadata: { grantedBy },
    })
  }

  /**
   * 记录权限撤销
   */
  logPermissionRevoked(
    roleName: string,
    permission: string,
    revokedBy?: string
  ): void {
    this.log('permission_revoked', {
      role: roleName,
      permission,
      metadata: { revokedBy },
    })
  }

  /**
   * 记录角色分配
   */
  logRoleAssigned(
    userId: string,
    roleName: string,
    assignedBy?: string
  ): void {
    this.log('role_assigned', {
      userId,
      role: roleName,
      metadata: { assignedBy },
    })
  }

  /**
   * 记录角色移除
   */
  logRoleRemoved(
    userId: string,
    roleName: string,
    removedBy?: string
  ): void {
    this.log('role_removed', {
      userId,
      role: roleName,
      metadata: { removedBy },
    })
  }

  /**
   * 记录访问拒绝
   */
  logAccessDenied(
    userId: string,
    resource: string,
    action: string,
    reason?: string,
    context?: Context
  ): void {
    this.log('access_denied', {
      userId,
      resource,
      action,
      allowed: false,
      effect: 'deny',
      reason,
      context,
    })
  }

  /**
   * 记录访问允许
   */
  logAccessGranted(
    userId: string,
    resource: string,
    action: string,
    context?: Context
  ): void {
    this.log('access_granted', {
      userId,
      resource,
      action,
      allowed: true,
      effect: 'allow',
      context,
    })
  }

  /**
   * 查询日志
   */
  query(options: any) {
    return this.store.query(options)
  }

  /**
   * 导出日志
   */
  export(options?: any): AuditLogEntry[] {
    return this.store.export(options)
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * 生成统计信息
   */
  generateStats(): AuditStats {
    const allLogs = this.store.export()

    const stats: AuditStats = {
      totalLogs: allLogs.length,
      permissionChecks: 0,
      accessDenied: 0,
      accessGranted: 0,
      byEventType: {} as Record<AuditEventType, number>,
      byUser: {},
      byResource: {},
      byDate: {},
    }

    for (const log of allLogs) {
      // 统计事件类型
      stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1

      // 统计权限检查
      if (log.eventType === 'permission_check') {
        stats.permissionChecks++
      }

      // 统计访问拒绝
      if (log.eventType === 'access_denied' || log.allowed === false) {
        stats.accessDenied++
      }

      // 统计访问允许
      if (log.eventType === 'access_granted' || log.allowed === true) {
        stats.accessGranted++
      }

      // 统计用户
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1
      }

      // 统计资源
      if (log.resource) {
        stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1
      }

      // 统计日期
      const dateKey = log.timestamp.toISOString().split('T')[0]
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1
    }

    return stats
  }

  /**
   * 生成审计报告
   */
  generateReport(startTime: Date, endTime: Date, name?: string): AuditReport {
    const logs = this.store.export({
      startTime,
      endTime,
    })

    const stats = this.generateStats()

    return {
      id: this.generateId(),
      name: name || `Audit Report ${startTime.toISOString()} - ${endTime.toISOString()}`,
      generatedAt: new Date(),
      startTime,
      endTime,
      stats,
      logs,
    }
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // 清理逻辑由 AuditStore 内部处理
      this.store.getStats()
    }, this.config.cleanupInterval)
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
   * 生成唯一ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取存储实例
   */
  getStore(): AuditStore {
    return this.store
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stopAutoCleanup()
  }
}



