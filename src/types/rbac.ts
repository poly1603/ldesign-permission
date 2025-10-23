/**
 * @ldesign/permission - RBAC 类型定义
 * 
 * 基于角色的访问控制（Role-Based Access Control）类型
 */

import type { Permission, Role } from './core'

/**
 * 角色选项
 */
export interface RoleOptions {
  /** 角色显示名称 */
  displayName?: string
  /** 角色描述 */
  description?: string
  /** 继承的父角色 */
  inherits?: string[]
  /** 角色元数据 */
  metadata?: Record<string, any>
}

/**
 * 角色层级节点
 */
export interface RoleHierarchyNode {
  /** 角色名称 */
  name: string
  /** 角色信息 */
  role: Role
  /** 父节点 */
  parent?: RoleHierarchyNode
  /** 子节点列表 */
  children: RoleHierarchyNode[]
  /** 层级深度 */
  depth: number
  /** 继承的所有权限（包括父角色） */
  inheritedPermissions: Set<string>
}

/**
 * 角色继承配置
 */
export interface RoleInheritance {
  /** 子角色 */
  child: string
  /** 父角色列表 */
  parents: string[]
}

/**
 * 权限授予选项
 */
export interface GrantOptions {
  /** 是否递归授予子角色 */
  recursive?: boolean
  /** 过期时间 */
  expiresAt?: Date
  /** 条件（仅在满足条件时有效） */
  condition?: any
}

/**
 * 权限撤销选项
 */
export interface RevokeOptions {
  /** 是否递归撤销子角色 */
  recursive?: boolean
  /** 是否强制撤销（忽略继承） */
  force?: boolean
}

/**
 * 用户角色映射
 */
export interface UserRoleMapping {
  /** 用户ID */
  userId: string
  /** 角色名称 */
  roleName: string
  /** 分配时间 */
  assignedAt: Date
  /** 分配者 */
  assignedBy?: string
  /** 过期时间 */
  expiresAt?: Date
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 角色权限映射
 */
export interface RolePermissionMapping {
  /** 角色名称 */
  roleName: string
  /** 权限字符串 */
  permission: string
  /** 授予时间 */
  grantedAt: Date
  /** 授予者 */
  grantedBy?: string
  /** 过期时间 */
  expiresAt?: Date
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * RBAC 引擎配置
 */
export interface RBACConfig {
  /** 是否支持角色继承 */
  enableInheritance?: boolean
  /** 最大继承深度 */
  maxInheritanceDepth?: number
  /** 是否检测循环继承 */
  detectCircular?: boolean
  /** 是否缓存角色层级 */
  cacheHierarchy?: boolean
}

/**
 * 角色查询选项
 */
export interface RoleQueryOptions {
  /** 是否包含继承的权限 */
  includeInherited?: boolean
  /** 是否包含过期的权限 */
  includeExpired?: boolean
  /** 过滤条件 */
  filter?: (role: Role) => boolean
}

/**
 * 权限查询选项
 */
export interface PermissionQueryOptions {
  /** 资源过滤 */
  resource?: string | string[]
  /** 操作过滤 */
  action?: string | string[]
  /** 是否包含通配符 */
  includeWildcard?: boolean
}



