/**
 * 权限系统核心类型定义
 *
 * @module @ldesign/permission-core/types
 * @author LDesign Team
 */

// ==================== 基础权限类型 ====================

/**
 * 权限标识类型
 * @description 使用字符串格式，推荐使用 resource:action 格式
 * @example 'user:read', 'order:create', 'system:admin'
 */
export type Permission = string

/**
 * 角色标识类型
 * @example 'admin', 'user', 'guest'
 */
export type Role = string

/**
 * 资源标识类型
 * @example 'user', 'order', 'product'
 */
export type Resource = string

/**
 * 操作类型
 * @example 'read', 'write', 'delete', 'admin'
 */
export type Action = string

// ==================== 权限检查相关类型 ====================

/**
 * 权限检查模式
 */
export type PermissionMode = 'all' | 'any'

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  /** 检查模式：all - 需要全部权限，any - 需要任一权限 */
  mode?: PermissionMode
  /** 是否跳过缓存 */
  skipCache?: boolean
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  /** 是否通过检查 */
  granted: boolean
  /** 检查的权限列表 */
  permissions: Permission[]
  /** 缺失的权限列表 */
  missing: Permission[]
  /** 检查模式 */
  mode: PermissionMode
  /** 检查耗时（毫秒） */
  duration?: number
}

/**
 * 角色检查选项
 */
export interface RoleCheckOptions {
  /** 检查模式：all - 需要全部角色，any - 需要任一角色 */
  mode?: PermissionMode
  /** 是否跳过缓存 */
  skipCache?: boolean
}

/**
 * 角色检查结果
 */
export interface RoleCheckResult {
  /** 是否通过检查 */
  granted: boolean
  /** 检查的角色列表 */
  roles: Role[]
  /** 缺失的角色列表 */
  missing: Role[]
  /** 检查模式 */
  mode: PermissionMode
}

// ==================== 权限规则类型 ====================

/**
 * 权限规则接口
 * @description 用于定义复杂的权限规则
 */
export interface PermissionRule {
  /** 规则 ID */
  id: string
  /** 规则名称 */
  name: string
  /** 规则描述 */
  description?: string
  /** 资源标识 */
  resource: Resource
  /** 允许的操作 */
  actions: Action[]
  /** 规则条件 */
  conditions?: PermissionCondition[]
  /** 规则优先级（越高越优先） */
  priority?: number
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 权限条件接口
 * @description 用于定义权限的条件判断
 */
export interface PermissionCondition {
  /** 条件字段 */
  field: string
  /** 操作符 */
  operator: ConditionOperator
  /** 条件值 */
  value: unknown
}

/**
 * 条件操作符类型
 */
export type ConditionOperator
  = | 'eq' // 等于
    | 'ne' // 不等于
    | 'gt' // 大于
    | 'gte' // 大于等于
    | 'lt' // 小于
    | 'lte' // 小于等于
    | 'in' // 包含于
    | 'nin' // 不包含于
    | 'contains' // 包含
    | 'startsWith' // 以...开头
    | 'endsWith' // 以...结尾
    | 'regex' // 正则匹配

// ==================== 角色定义类型 ====================

/**
 * 角色定义接口
 */
export interface RoleDefinition {
  /** 角色 ID */
  id: Role
  /** 角色名称 */
  name: string
  /** 角色描述 */
  description?: string
  /** 拥有的权限列表 */
  permissions: Permission[]
  /** 父角色（用于权限继承） */
  parent?: Role
  /** 是否为超级管理员角色 */
  isSuper?: boolean
  /** 角色优先级 */
  priority?: number
  /** 元数据 */
  meta?: Record<string, unknown>
}

// ==================== 权限管理器配置类型 ====================

/**
 * 权限管理器配置
 */
export interface PermissionManagerConfig {
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number
  /** 缓存大小限制 */
  cacheMaxSize?: number
  /** 超级管理员权限标识 */
  superPermission?: Permission
  /** 超级管理员角色标识 */
  superRole?: Role
  /** 是否启用调试模式 */
  debug?: boolean
}

// ==================== 策略引擎类型 ====================

/**
 * 策略类型
 */
export type PolicyEffect = 'allow' | 'deny'

/**
 * 策略定义接口
 * @description 用于 ABAC (Attribute-Based Access Control)
 */
export interface PolicyDefinition {
  /** 策略 ID */
  id: string
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description?: string
  /** 策略效果：允许或拒绝 */
  effect: PolicyEffect
  /** 适用的主体 */
  subjects?: PolicySubject[]
  /** 适用的资源 */
  resources?: Resource[]
  /** 适用的操作 */
  actions?: Action[]
  /** 策略条件 */
  conditions?: PolicyCondition[]
  /** 策略优先级 */
  priority?: number
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 策略主体接口
 */
export interface PolicySubject {
  /** 主体类型 */
  type: 'user' | 'role' | 'group' | 'any'
  /** 主体值 */
  value?: string | string[]
}

/**
 * 策略条件接口
 */
export interface PolicyCondition {
  /** 条件类型 */
  type: PolicyConditionType
  /** 条件键 */
  key: string
  /** 条件值 */
  value: unknown
  /** 条件操作符 */
  operator?: ConditionOperator
}

/**
 * 策略条件类型
 */
export type PolicyConditionType
  = | 'attribute' // 属性条件
    | 'time' // 时间条件
    | 'ip' // IP 条件
    | 'environment' // 环境条件
    | 'custom' // 自定义条件

/**
 * 策略评估上下文
 */
export interface PolicyContext {
  /** 当前用户 */
  user?: PolicyContextUser
  /** 请求资源 */
  resource?: Resource
  /** 请求操作 */
  action?: Action
  /** 环境信息 */
  environment?: PolicyContextEnvironment
  /** 自定义属性 */
  attributes?: Record<string, unknown>
}

/**
 * 策略上下文用户信息
 */
export interface PolicyContextUser {
  /** 用户 ID */
  id: string | number
  /** 用户名 */
  username?: string
  /** 用户角色 */
  roles?: Role[]
  /** 用户权限 */
  permissions?: Permission[]
  /** 用户属性 */
  attributes?: Record<string, unknown>
}

/**
 * 策略上下文环境信息
 */
export interface PolicyContextEnvironment {
  /** IP 地址 */
  ip?: string
  /** 时间戳 */
  timestamp?: number
  /** 时区 */
  timezone?: string
  /** 设备类型 */
  deviceType?: string
  /** 来源 */
  source?: string
  /** 其他环境属性 */
  [key: string]: unknown
}

/**
 * 策略评估结果
 */
export interface PolicyEvaluationResult {
  /** 是否允许 */
  allowed: boolean
  /** 匹配的策略 */
  matchedPolicies: PolicyDefinition[]
  /** 拒绝的策略 */
  deniedPolicies: PolicyDefinition[]
  /** 评估耗时（毫秒） */
  duration: number
  /** 原因说明 */
  reason?: string
}

// ==================== 缓存相关类型 ====================

/**
 * 缓存项接口
 */
export interface CacheItem<T = unknown> {
  /** 缓存值 */
  value: T
  /** 过期时间戳 */
  expiresAt: number
  /** 创建时间戳 */
  createdAt: number
  /** 访问次数 */
  accessCount?: number
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存项数量 */
  size: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 最大容量 */
  maxSize: number
}

// ==================== 事件类型 ====================

/**
 * 权限事件类型
 */
export type PermissionEventType
  = | 'permission:check'
    | 'permission:granted'
    | 'permission:denied'
    | 'role:check'
    | 'role:granted'
    | 'role:denied'
    | 'policy:evaluated'
    | 'cache:hit'
    | 'cache:miss'
    | 'cache:cleared'
    | 'error'

/**
 * 权限事件监听器
 */
export type PermissionEventListener<T = unknown> = (data: T) => void

/**
 * 权限事件数据映射
 */
export interface PermissionEventMap {
  'permission:check': { permissions: Permission[], options?: PermissionCheckOptions }
  'permission:granted': PermissionCheckResult
  'permission:denied': PermissionCheckResult
  'role:check': { roles: Role[], options?: RoleCheckOptions }
  'role:granted': RoleCheckResult
  'role:denied': RoleCheckResult
  'policy:evaluated': PolicyEvaluationResult
  'cache:hit': { key: string }
  'cache:miss': { key: string }
  'cache:cleared': { reason?: string }
  'error': { code: string, message: string, details?: unknown }
}
