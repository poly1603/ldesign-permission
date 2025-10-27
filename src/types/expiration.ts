/**
 * @ldesign/permission - 过期类型定义
 * 
 * 定义权限过期管理相关的类型
 */

/**
 * 过期项
 */
export interface ExpirationEntry {
  /** 唯一键 */
  key: string
  /** 过期时间 */
  expiresAt: Date
  /** 创建时间 */
  createdAt: Date
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 过期回调函数
 * 
 * @param entry - 过期项
 * @param isNotify - 是否为过期前通知（true）还是已过期通知（false）
 */
export type ExpirationCallback = (entry: ExpirationEntry, isNotify?: boolean) => void

/**
 * 过期配置
 */
export interface ExpirationConfig {
  /** 是否启用自动清理 */
  autoCleanup?: boolean
  /** 清理间隔（毫秒） */
  cleanupInterval?: number
  /** 过期前通知时间（毫秒） */
  notifyBefore?: number
  /** 是否启用过期通知 */
  enableNotify?: boolean
}

/**
 * 临时权限
 */
export interface TemporaryPermission {
  /** 权限ID */
  id: string
  /** 用户ID */
  userId: string
  /** 资源 */
  resource: string
  /** 操作 */
  action: string
  /** 过期时间 */
  expiresAt: Date
  /** 创建时间 */
  createdAt: Date
  /** 创建者 */
  createdBy?: string
  /** 是否为一次性权限 */
  oneTime?: boolean
  /** 已使用次数 */
  usedCount?: number
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 临时角色分配
 */
export interface TemporaryRoleAssignment {
  /** 分配ID */
  id: string
  /** 用户ID */
  userId: string
  /** 角色名称 */
  roleName: string
  /** 过期时间 */
  expiresAt: Date
  /** 分配时间 */
  assignedAt: Date
  /** 分配者 */
  assignedBy?: string
  /** 元数据 */
  metadata?: Record<string, any>
}

