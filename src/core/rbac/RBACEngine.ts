/**
 * @ldesign/permission - RBAC 引擎
 * 
 * 基于角色的访问控制（Role-Based Access Control）核心引擎
 * 
 * RBAC 是一种广泛使用的权限管理模型，通过将权限分配给角色，
 * 然后将角色分配给用户，实现灵活的权限管理。
 * 
 * 核心概念：
 * - 用户（User）：系统的使用者
 * - 角色（Role）：权限的集合
 * - 权限（Permission）：对资源的操作权限，格式为 resource:action
 * 
 * 支持的特性：
 * - ✅ 角色继承（多重继承）
 * - ✅ 循环继承检测
 * - ✅ 通配符权限（如 users:* 表示用户的所有操作）
 * - ✅ 层级关系缓存
 * - ✅ O(1) 权限检查（无继承）
 * 
 * @example
 * ```typescript
 * const rbac = new RBACEngine()
 * 
 * // 创建角色
 * rbac.createRole('admin')
 * rbac.createRole('user')
 * 
 * // 授予权限
 * rbac.grantPermission('admin', 'users', '*')  // 管理员拥有用户的所有操作权限
 * rbac.grantPermission('user', 'posts', 'read') // 普通用户只能读取文章
 * 
 * // 分配角色
 * rbac.assignRole('alice', 'admin')
 * rbac.assignRole('bob', 'user')
 * 
 * // 检查权限
 * rbac.check('alice', 'users', 'delete') // { allowed: true, ... }
 * rbac.check('bob', 'users', 'delete')   // { allowed: false, ... }
 * ```
 */

import type {
  Role,
  Permission,
  RoleOptions,
  GrantOptions,
  RevokeOptions,
  RBACConfig,
  CheckResult,
} from '../../types'
import { PermissionError, PermissionErrorType } from '../../types'
import { PermissionStore } from './PermissionStore'
import { RoleManager } from './RoleManager'
import { validateString, validateObject, validateArray } from '../../shared/validators'

/**
 * RBAC 引擎类
 * 
 * 这是 RBAC 系统的核心实现，提供完整的角色和权限管理功能。
 * 
 * 核心功能：
 * - 角色 CRUD（创建、读取、更新、删除）
 * - 权限 CRUD（授予、撤销、查询）
 * - 用户-角色管理（分配、移除、查询）
 * - 角色-权限管理（授予、撤销、查询）
 * - 角色继承管理（支持多重继承和继承链）
 * - 通配符权限支持（* 表示所有）
 * - 高性能权限检查（支持缓存）
 * 
 * 架构设计：
 * - PermissionStore：负责数据存储和持久化
 * - RoleManager：负责角色继承关系管理
 * - RBACEngine：协调两者，提供统一的 API
 * 
 * 性能特性：
 * - O(1) 权限检查（无继承时）
 * - O(n) 权限检查（有继承时，n 为继承层数）
 * - 支持角色层级缓存，提升查询性能
 * 
 * @example
 * ```typescript
 * const rbac = new RBACEngine({
 *   enableInheritance: true,      // 启用角色继承
 *   maxInheritanceDepth: 10,      // 最大继承深度
 *   detectCircular: true,          // 检测循环继承
 *   cacheHierarchy: true,          // 缓存层级关系
 * })
 * 
 * // 创建角色并设置继承关系
 * rbac.createRole('user')
 * rbac.createRole('editor', { inherits: ['user'] })
 * rbac.createRole('admin', { inherits: ['editor'] })
 * 
 * // 授予权限
 * rbac.grantPermission('user', 'posts', 'read')
 * rbac.grantPermission('editor', 'posts', 'write')
 * rbac.grantPermission('admin', 'users', '*')
 * 
 * // admin 继承了 editor 和 user 的所有权限
 * rbac.check('adminUser', 'posts', 'read')  // true（继承自 user）
 * rbac.check('adminUser', 'posts', 'write') // true（继承自 editor）
 * rbac.check('adminUser', 'users', 'delete') // true（自身权限）
 * ```
 */
export class RBACEngine {
  /** 权限存储 - 负责数据的存储和查询 */
  private store: PermissionStore

  /** 角色管理器 - 负责角色继承关系的管理 */
  private roleManager: RoleManager

  /** 配置选项 */
  private config: Required<RBACConfig>

  /**
   * 创建 RBAC 引擎实例
   * 
   * @param config - 配置选项
   * @param config.enableInheritance - 是否启用角色继承，默认 true
   * @param config.maxInheritanceDepth - 最大继承深度，默认 10，防止继承链过长影响性能
   * @param config.detectCircular - 是否检测循环继承，默认 true，建议保持开启
   * @param config.cacheHierarchy - 是否缓存层级关系，默认 true，提升查询性能
   */
  constructor(config: RBACConfig = {}) {
    this.config = {
      enableInheritance: config.enableInheritance ?? true,
      maxInheritanceDepth: config.maxInheritanceDepth ?? 10,
      detectCircular: config.detectCircular ?? true,
      cacheHierarchy: config.cacheHierarchy ?? true,
    }

    this.store = new PermissionStore()
    this.roleManager = new RoleManager(this.config)
  }

  // ==================== 角色管理 ====================

  /**
   * 创建角色
   * 
   * @param name - 角色名称，必须唯一且不能为空
   * @param options - 角色选项
   * @param options.displayName - 角色显示名称
   * @param options.description - 角色描述
   * @param options.inherits - 继承的父角色列表
   * @param options.metadata - 角色元数据
   * @returns 创建的角色对象
   * @throws {PermissionError} 如果角色名称无效或已存在
   * 
   * @example
   * ```typescript
   * // 创建基础角色
   * rbac.createRole('user')
   * 
   * // 创建带继承的角色
   * rbac.createRole('admin', {
   *   displayName: '管理员',
   *   description: '系统管理员角色',
   *   inherits: ['user']
   * })
   * ```
   */
  createRole(name: string, options: RoleOptions = {}): Role {
    // 验证角色名称
    validateString(name, 'roleName', {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/, // 只允许字母、数字、下划线和连字符
    })

    // 验证选项对象
    if (options) {
      validateObject(options, 'options', { required: false, allowEmpty: true })

      // 验证继承列表
      if (options.inherits) {
        validateArray(options.inherits, 'options.inherits', {
          required: false,
          minLength: 1,
          itemValidator: (item) => validateString(item, 'parentRole'),
        })
      }
    }

    // 检查角色是否已存在
    if (this.store.hasRole(name)) {
      throw new PermissionError(
        PermissionErrorType.INVALID_CONFIG,
        `角色 "${name}" 已存在`
      )
    }

    const role: Role = {
      name,
      displayName: options.displayName,
      description: options.description,
      permissions: [],
      inherits: options.inherits,
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.store.addRole(role)

    // 设置继承关系
    if (options.inherits && options.inherits.length > 0) {
      this.roleManager.setInheritance(name, options.inherits)
    }

    return role
  }

  /**
   * 获取角色
   */
  getRole(name: string): Role | undefined {
    return this.store.getRole(name)
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return this.store.getAllRoles()
  }

  /**
   * 更新角色
   */
  updateRole(name: string, updates: Partial<RoleOptions>): boolean {
    const role = this.store.getRole(name)
    if (!role) {
      throw new PermissionError(
        PermissionErrorType.ROLE_NOT_FOUND,
        `Role "${name}" not found`
      )
    }

    // 更新继承关系
    if (updates.inherits !== undefined) {
      this.roleManager.setInheritance(name, updates.inherits)
    }

    return this.store.updateRole(name, updates)
  }

  /**
   * 删除角色
   */
  deleteRole(name: string): boolean {
    return this.store.removeRole(name)
  }

  /**
   * 角色是否存在
   */
  hasRole(name: string): boolean {
    return this.store.hasRole(name)
  }

  // ==================== 用户-角色管理 ====================

  /**
   * 给用户分配角色
   * 
   * 将指定角色分配给用户。一个用户可以拥有多个角色，
   * 用户的最终权限是所有角色权限的并集。
   * 
   * @param userId - 用户唯一标识符
   * @param roleName - 角色名称
   * @throws {PermissionError} 如果参数无效或角色不存在
   * 
   * @example
   * ```typescript
   * rbac.assignRole('user123', 'admin')
   * rbac.assignRole('user123', 'editor') // 用户可以拥有多个角色
   * ```
   */
  assignRole(userId: string, roleName: string): void {
    // 验证用户ID
    validateString(userId, 'userId', {
      minLength: 1,
      maxLength: 255,
    })

    // 验证角色名称
    validateString(roleName, 'roleName', {
      minLength: 1,
      maxLength: 100,
    })

    // 检查角色是否存在
    if (!this.store.hasRole(roleName)) {
      throw new PermissionError(
        PermissionErrorType.ROLE_NOT_FOUND,
        `角色 "${roleName}" 不存在`
      )
    }

    this.store.assignRoleToUser(userId, roleName)
  }

  /**
   * 从用户移除角色
   */
  unassignRole(userId: string, roleName: string): boolean {
    return this.store.removeRoleFromUser(userId, roleName)
  }

  /**
   * 获取用户的所有角色
   */
  getUserRoles(userId: string): string[] {
    return this.store.getUserRoles(userId)
  }

  /**
   * 获取用户的所有角色（包括继承的）
   */
  getUserRolesWithInheritance(userId: string): string[] {
    const directRoles = this.store.getUserRoles(userId)
    const allRoles = new Set(directRoles)

    if (this.config.enableInheritance) {
      for (const role of directRoles) {
        const ancestors = this.roleManager.getAncestors(role)
        ancestors.forEach(ancestor => allRoles.add(ancestor))
      }
    }

    return Array.from(allRoles)
  }

  /**
   * 用户是否拥有某个角色
   */
  userHasRole(userId: string, roleName: string, checkInheritance: boolean = true): boolean {
    const hasDirectRole = this.store.userHasRole(userId, roleName)

    if (hasDirectRole || !checkInheritance || !this.config.enableInheritance) {
      return hasDirectRole
    }

    // 检查继承的角色
    const userRoles = this.store.getUserRoles(userId)
    for (const role of userRoles) {
      if (this.roleManager.inheritsFrom(role, roleName)) {
        return true
      }
    }

    return false
  }

  // ==================== 角色-权限管理 ====================

  /**
   * 给角色授予权限
   * 
   * 将指定的资源操作权限授予角色。权限格式为 resource:action。
   * 支持通配符 * 表示所有资源或所有操作。
   * 
   * @param roleName - 角色名称
   * @param resource - 资源名称（如 'users', 'posts'）或 '*' 表示所有资源
   * @param action - 操作类型（如 'read', 'write', 'delete'）或 '*' 表示所有操作
   * @param options - 授予选项
   * @param options.recursive - 是否递归授予子角色（如果启用了角色继承）
   * @throws {PermissionError} 如果参数无效或角色不存在
   * 
   * @example
   * ```typescript
   * // 授予具体权限
   * rbac.grantPermission('editor', 'posts', 'write')
   * 
   * // 授予所有操作权限
   * rbac.grantPermission('admin', 'users', '*')
   * 
   * // 递归授予（子角色也会获得该权限）
   * rbac.grantPermission('admin', 'settings', 'read', { recursive: true })
   * ```
   */
  grantPermission(roleName: string, resource: string, action: string, options: GrantOptions = {}): void {
    // 验证角色名称
    validateString(roleName, 'roleName', {
      minLength: 1,
      maxLength: 100,
    })

    // 验证资源名称
    validateString(resource, 'resource', {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_*-]+$/, // 允许字母、数字、下划线、连字符和通配符
    })

    // 验证操作名称
    validateString(action, 'action', {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_*-]+$/,
    })

    // 检查角色是否存在
    if (!this.store.hasRole(roleName)) {
      throw new PermissionError(
        PermissionErrorType.ROLE_NOT_FOUND,
        `角色 "${roleName}" 不存在`
      )
    }

    const permission = `${resource}:${action}`
    this.store.grantPermissionToRole(roleName, permission)

    // 递归授予子角色
    if (options.recursive) {
      const children = this.roleManager.getChildren(roleName)
      for (const child of children) {
        this.store.grantPermissionToRole(child, permission)
      }
    }
  }

  /**
   * 从角色撤销权限
   */
  revokePermission(roleName: string, resource: string, action: string, options: RevokeOptions = {}): boolean {
    const permission = `${resource}:${action}`
    const revoked = this.store.revokePermissionFromRole(roleName, permission)

    // 递归撤销子角色
    if (options.recursive) {
      const children = this.roleManager.getChildren(roleName)
      for (const child of children) {
        this.store.revokePermissionFromRole(child, permission)
      }
    }

    return revoked
  }

  /**
   * 获取角色的所有权限
   */
  getRolePermissions(roleName: string, includeInherited: boolean = false): string[] {
    const directPermissions = this.store.getRolePermissions(roleName)

    if (!includeInherited || !this.config.enableInheritance) {
      return directPermissions
    }

    // 合并继承的权限
    const role = this.store.getRole(roleName)
    if (!role) {
      return directPermissions
    }

    const allRolesMap = new Map(
      this.store.getAllRoles().map(r => [r.name, r])
    )

    const mergedPermissions = this.roleManager.mergePermissions(role, allRolesMap)
    return Array.from(mergedPermissions)
  }

  // ==================== 权限检查 ====================

  /**
   * 检查权限字符串是否匹配
   */
  private matchPermission(required: string, granted: string): boolean {
    // 精确匹配
    if (required === granted) {
      return true
    }

    const [reqResource, reqAction] = required.split(':')
    const [grantedResource, grantedAction] = granted.split(':')

    // 通配符匹配
    if (grantedResource === '*' || grantedAction === '*') {
      return (grantedResource === '*' || grantedResource === reqResource) &&
        (grantedAction === '*' || grantedAction === reqAction)
    }

    return false
  }

  /**
   * 检查用户是否拥有权限
   */
  check(userId: string, resource: string, action: string): CheckResult {
    const startTime = performance.now()
    const requiredPermission = `${resource}:${action}`

    // 获取用户的所有角色（包括继承的）
    const userRoles = this.getUserRolesWithInheritance(userId)

    if (userRoles.length === 0) {
      return {
        allowed: false,
        reason: 'User has no roles',
        duration: performance.now() - startTime,
      }
    }

    // 检查每个角色的权限
    for (const roleName of userRoles) {
      const permissions = this.store.getRolePermissions(roleName)

      for (const permission of permissions) {
        if (this.matchPermission(requiredPermission, permission)) {
          return {
            allowed: true,
            matchedPermission: { resource, action },
            matchedRole: roleName,
            duration: performance.now() - startTime,
          }
        }
      }
    }

    return {
      allowed: false,
      reason: `User does not have permission "${requiredPermission}"`,
      duration: performance.now() - startTime,
    }
  }

  /**
   * 检查角色是否拥有权限
   */
  roleHasPermission(roleName: string, resource: string, action: string, includeInherited: boolean = true): boolean {
    const requiredPermission = `${resource}:${action}`
    const permissions = this.getRolePermissions(roleName, includeInherited)

    return permissions.some(permission =>
      this.matchPermission(requiredPermission, permission)
    )
  }

  /**
   * 批量检查权限
   */
  checkMultiple(userId: string, permissions: Array<{ resource: string; action: string }>): CheckResult[] {
    return permissions.map(({ resource, action }) =>
      this.check(userId, resource, action)
    )
  }

  /**
   * 检查用户是否拥有任意一个权限
   */
  checkAny(userId: string, permissions: Array<{ resource: string; action: string }>): boolean {
    return permissions.some(({ resource, action }) =>
      this.check(userId, resource, action).allowed
    )
  }

  /**
   * 检查用户是否拥有所有权限
   */
  checkAll(userId: string, permissions: Array<{ resource: string; action: string }>): boolean {
    return permissions.every(({ resource, action }) =>
      this.check(userId, resource, action).allowed
    )
  }

  // ==================== 工具方法 ====================

  /**
   * 获取 PermissionStore 实例
   */
  getStore(): PermissionStore {
    return this.store
  }

  /**
   * 获取 RoleManager 实例
   */
  getRoleManager(): RoleManager {
    return this.roleManager
  }

  /**
   * 导出所有数据
   */
  export(): string {
    return JSON.stringify({
      store: this.store.export(),
      roleManager: this.roleManager.export(),
      version: '1.0.0',
    })
  }

  /**
   * 导入数据
   */
  import(data: string): void {
    const parsed = JSON.parse(data)
    this.store.import(parsed.store)
    this.roleManager.import(parsed.roleManager)
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    await this.store.clear()
    this.roleManager.clear()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      store: this.store.getStats(),
      roleManager: this.roleManager.getStats(),
    }
  }
}



