/**
 * @ldesign/permission - 核心类型定义
 * 
 * 定义权限系统的基础类型
 */

/**
 * 资源类型
 */
export type Resource = string

/**
 * 操作类型
 */
export type Action = string | '*'

/**
 * 权限字符串格式：resource:action
 * @example 'users:read', 'posts:write', 'admin:*'
 */
export type PermissionString = string

/**
 * 权限对象
 */
export interface Permission {
  /** 资源名称 */
  resource: Resource
  /** 操作类型 */
  action: Action
  /** 权限描述 */
  description?: string
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 角色定义
 */
export interface Role {
  /** 角色名称（唯一标识） */
  name: string
  /** 角色显示名称 */
  displayName?: string
  /** 角色描述 */
  description?: string
  /** 角色权限列表 */
  permissions: PermissionString[]
  /** 父角色（继承） */
  inherits?: string[]
  /** 角色元数据 */
  metadata?: Record<string, any>
  /** 创建时间 */
  createdAt?: Date
  /** 更新时间 */
  updatedAt?: Date
}

/**
 * 用户定义
 */
export interface User {
  /** 用户ID */
  id: string
  /** 用户名 */
  username?: string
  /** 用户角色列表 */
  roles: string[]
  /** 用户属性（用于ABAC） */
  attributes?: Record<string, any>
  /** 用户元数据 */
  metadata?: Record<string, any>
}

/**
 * 权限检查选项
 */
export interface CheckOptions {
  /** 是否使用缓存 */
  useCache?: boolean
  /** 是否跳过缓存 */
  skipCache?: boolean
  /** 缓存TTL（毫秒） */
  cacheTTL?: number
  /** 是否记录审计日志 */
  audit?: boolean
  /** 上下文信息 */
  context?: Record<string, any>
}

/**
 * 权限检查结果
 */
export interface CheckResult {
  /** 是否允许 */
  allowed: boolean
  /** 匹配的权限 */
  matchedPermission?: Permission
  /** 匹配的角色 */
  matchedRole?: string
  /** 检查耗时（毫秒） */
  duration?: number
  /** 是否来自缓存 */
  fromCache?: boolean
  /** 原因/错误信息 */
  reason?: string
}

/**
 * 权限管理器配置
 */
export interface PermissionConfig {
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存配置 */
  cache?: {
    /** 最大缓存数量 */
    maxSize?: number
    /** 默认TTL（毫秒） */
    ttl?: number
  }
  /** 是否启用审计日志 */
  enableAudit?: boolean
  /** 是否启用事件 */
  enableEvents?: boolean
  /** 严格模式（未定义的权限默认拒绝） */
  strict?: boolean
  /** 默认拒绝策略 */
  defaultDeny?: boolean
}

/**
 * 权限存储接口
 */
export interface PermissionStorage {
  /** 保存权限数据 */
  save(key: string, data: any): Promise<void> | void
  /** 加载权限数据 */
  load(key: string): Promise<any> | any
  /** 删除权限数据 */
  remove(key: string): Promise<void> | void
  /** 清空所有数据 */
  clear(): Promise<void> | void
}

/**
 * 错误类型
 */
export enum PermissionErrorType {
  /** 权限不存在 */
  PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND',
  /** 角色不存在 */
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  /** 用户不存在 */
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  /** 权限拒绝 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 循环继承 */
  CIRCULAR_INHERITANCE = 'CIRCULAR_INHERITANCE',
  /** 无效的配置 */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** 无效的权限格式 */
  INVALID_PERMISSION = 'INVALID_PERMISSION',
}

/**
 * 权限错误
 */
export class PermissionError extends Error {
  constructor(
    public type: PermissionErrorType,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}



