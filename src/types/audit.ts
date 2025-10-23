/**
 * @ldesign/permission - 审计类型定义
 * 
 * 权限审计日志相关类型
 */

import type { Context } from './abac'
import type { Effect } from './policy'

/**
 * 审计事件类型
 */
export enum AuditEventType {
  /** 权限检查 */
  PERMISSION_CHECK = 'permission_check',
  /** 权限授予 */
  PERMISSION_GRANTED = 'permission_granted',
  /** 权限撤销 */
  PERMISSION_REVOKED = 'permission_revoked',
  /** 角色分配 */
  ROLE_ASSIGNED = 'role_assigned',
  /** 角色移除 */
  ROLE_REMOVED = 'role_removed',
  /** 角色创建 */
  ROLE_CREATED = 'role_created',
  /** 角色更新 */
  ROLE_UPDATED = 'role_updated',
  /** 角色删除 */
  ROLE_DELETED = 'role_deleted',
  /** 策略创建 */
  POLICY_CREATED = 'policy_created',
  /** 策略更新 */
  POLICY_UPDATED = 'policy_updated',
  /** 策略删除 */
  POLICY_DELETED = 'policy_deleted',
  /** 访问拒绝 */
  ACCESS_DENIED = 'access_denied',
  /** 访问允许 */
  ACCESS_GRANTED = 'access_granted',
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志ID */
  id: string
  /** 事件类型 */
  eventType: AuditEventType
  /** 时间戳 */
  timestamp: Date
  /** 用户ID */
  userId?: string
  /** 用户名 */
  username?: string
  /** 资源 */
  resource?: string
  /** 操作 */
  action?: string
  /** 效果 */
  effect?: Effect
  /** 是否允许 */
  allowed?: boolean
  /** 角色 */
  role?: string
  /** 权限 */
  permission?: string
  /** 上下文信息 */
  context?: Context
  /** IP地址 */
  ipAddress?: string
  /** 用户代理 */
  userAgent?: string
  /** 原因/描述 */
  reason?: string
  /** 耗时（毫秒） */
  duration?: number
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQueryOptions {
  /** 事件类型过滤 */
  eventTypes?: AuditEventType[]
  /** 用户ID过滤 */
  userId?: string
  /** 资源过滤 */
  resource?: string
  /** 操作过滤 */
  action?: string
  /** 开始时间 */
  startTime?: Date
  /** 结束时间 */
  endTime?: Date
  /** 是否只查询拒绝的访问 */
  deniedOnly?: boolean
  /** 是否只查询允许的访问 */
  allowedOnly?: boolean
  /** 排序字段 */
  sortBy?: keyof AuditLogEntry
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 限制数量 */
  limit?: number
}

/**
 * 审计日志查询结果
 */
export interface AuditLogQueryResult {
  /** 日志条目列表 */
  entries: AuditLogEntry[]
  /** 总数 */
  total: number
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 总页数 */
  totalPages?: number
}

/**
 * 审计日志存储接口
 */
export interface AuditLogStore {
  /** 添加日志 */
  add(entry: AuditLogEntry): Promise<void> | void
  /** 批量添加日志 */
  addBatch(entries: AuditLogEntry[]): Promise<void> | void
  /** 查询日志 */
  query(options: AuditLogQueryOptions): Promise<AuditLogQueryResult> | AuditLogQueryResult
  /** 获取日志 */
  get(id: string): Promise<AuditLogEntry | null> | AuditLogEntry | null
  /** 删除日志 */
  remove(id: string): Promise<void> | void
  /** 清空日志 */
  clear(): Promise<void> | void
  /** 导出日志 */
  export(options?: AuditLogQueryOptions): Promise<AuditLogEntry[]> | AuditLogEntry[]
}

/**
 * 审计配置
 */
export interface AuditConfig {
  /** 是否启用审计 */
  enabled?: boolean
  /** 记录的事件类型 */
  eventTypes?: AuditEventType[]
  /** 是否记录上下文 */
  includeContext?: boolean
  /** 是否记录IP地址 */
  includeIpAddress?: boolean
  /** 是否记录用户代理 */
  includeUserAgent?: boolean
  /** 日志保留天数 */
  retentionDays?: number
  /** 是否自动清理过期日志 */
  autoCleanup?: boolean
  /** 清理间隔（毫秒） */
  cleanupInterval?: number
  /** 最大日志数量 */
  maxLogs?: number
}

/**
 * 审计统计信息
 */
export interface AuditStats {
  /** 总日志数 */
  totalLogs: number
  /** 权限检查次数 */
  permissionChecks: number
  /** 访问拒绝次数 */
  accessDenied: number
  /** 访问允许次数 */
  accessGranted: number
  /** 按事件类型统计 */
  byEventType: Record<AuditEventType, number>
  /** 按用户统计 */
  byUser: Record<string, number>
  /** 按资源统计 */
  byResource: Record<string, number>
  /** 按日期统计 */
  byDate: Record<string, number>
}

/**
 * 审计报告
 */
export interface AuditReport {
  /** 报告ID */
  id: string
  /** 报告名称 */
  name: string
  /** 生成时间 */
  generatedAt: Date
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 统计信息 */
  stats: AuditStats
  /** 详细日志 */
  logs?: AuditLogEntry[]
  /** 元数据 */
  metadata?: Record<string, any>
}



