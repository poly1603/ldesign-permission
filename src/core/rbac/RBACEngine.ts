/**
 * @ldesign/permission - RBAC 引擎
 * 
 * 基于角色的访问控制核心引擎
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

/**
 * RBAC 引擎类
 * 
 * 核心功能：
 * - 角色 CRUD
 * - 权限 CRUD
 * - 用户-角色管理
 * - 角色-权限管理
 * - 通配符支持
 * - 权限检查
 */
export class RBACEngine {
  /** 权限存储 */
  private store: PermissionStore

  /** 角色管理器 */
  private roleManager: RoleManager

  /** 配置 */
  private config: Required<RBACConfig>

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
   */
  createRole(name: string, options: RoleOptions = {}): Role {
    if (this.store.hasRole(name)) {
      throw new PermissionError(
        PermissionErrorType.INVALID_CONFIG,
        `Role "${name}" already exists`
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
   */
  assignRole(userId: string, roleName: string): void {
    if (!this.store.hasRole(roleName)) {
      throw new PermissionError(
        PermissionErrorType.ROLE_NOT_FOUND,
        `Role "${roleName}" not found`
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
   */
  grantPermission(roleName: string, resource: string, action: string, options: GrantOptions = {}): void {
    if (!this.store.hasRole(roleName)) {
      throw new PermissionError(
        PermissionErrorType.ROLE_NOT_FOUND,
        `Role "${roleName}" not found`
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



