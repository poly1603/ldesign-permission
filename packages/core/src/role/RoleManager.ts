/**
 * 角色管理器
 *
 * @description 提供角色定义、继承和权限解析功能
 *
 * @module @ldesign/permission-core/role
 * @author LDesign Team
 */

import type {
  Permission,
  Role,
  RoleCheckOptions,
  RoleCheckResult,
  RoleDefinition,
} from '../types'

/**
 * 角色管理器配置
 */
export interface RoleManagerConfig {
  /** 是否启用角色继承 */
  enableInheritance?: boolean
  /** 最大继承深度（防止循环继承） */
  maxInheritanceDepth?: number
  /** 超级管理员角色 */
  superRole?: Role
}

/**
 * 角色管理器
 *
 * @description
 * 管理角色定义和权限继承关系
 *
 * **特性**：
 * - 角色定义管理
 * - 权限继承解析
 * - 角色层级管理
 * - 超级管理员支持
 *
 * @example
 * ```ts
 * const roleManager = new RoleManager()
 *
 * // 定义角色
 * roleManager.defineRole({
 *   id: 'admin',
 *   name: '管理员',
 *   permissions: ['user:read', 'user:write'],
 * })
 *
 * // 定义继承角色
 * roleManager.defineRole({
 *   id: 'superadmin',
 *   name: '超级管理员',
 *   permissions: ['system:admin'],
 *   parent: 'admin', // 继承 admin 的权限
 * })
 *
 * // 获取角色的所有权限（包括继承）
 * const permissions = roleManager.getPermissions('superadmin')
 * ```
 */
export class RoleManager {
  /** 角色定义存储 */
  private roles = new Map<Role, RoleDefinition>()

  /** 权限解析缓存 */
  private permissionCache = new Map<Role, Permission[]>()

  /** 配置 */
  private readonly config: Required<RoleManagerConfig>

  /**
   * 创建角色管理器
   *
   * @param config - 配置选项
   */
  constructor(config: RoleManagerConfig = {}) {
    this.config = {
      enableInheritance: config.enableInheritance ?? true,
      maxInheritanceDepth: config.maxInheritanceDepth ?? 10,
      superRole: config.superRole ?? 'super',
    }
  }

  /**
   * 定义角色
   *
   * @param definition - 角色定义
   *
   * @example
   * ```ts
   * roleManager.defineRole({
   *   id: 'editor',
   *   name: '编辑者',
   *   permissions: ['article:read', 'article:write'],
   * })
   * ```
   */
  defineRole(definition: RoleDefinition): void {
    this.roles.set(definition.id, definition)
    // 清除相关缓存
    this.invalidateCache(definition.id)
  }

  /**
   * 批量定义角色
   *
   * @param definitions - 角色定义数组
   */
  defineRoles(definitions: RoleDefinition[]): void {
    for (const definition of definitions) {
      this.defineRole(definition)
    }
  }

  /**
   * 获取角色定义
   *
   * @param role - 角色标识
   * @returns 角色定义
   */
  getRole(role: Role): RoleDefinition | undefined {
    return this.roles.get(role)
  }

  /**
   * 检查角色是否存在
   *
   * @param role - 角色标识
   * @returns 是否存在
   */
  hasRole(role: Role): boolean {
    return this.roles.has(role)
  }

  /**
   * 删除角色
   *
   * @param role - 角色标识
   * @returns 是否删除成功
   */
  removeRole(role: Role): boolean {
    const deleted = this.roles.delete(role)
    if (deleted) {
      this.invalidateCache(role)
    }
    return deleted
  }

  /**
   * 获取所有角色
   *
   * @returns 所有角色定义
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values())
  }

  /**
   * 获取角色的所有权限（包括继承的权限）
   *
   * @param role - 角色标识
   * @returns 权限列表
   */
  getPermissions(role: Role): Permission[] {
    // 检查缓存
    const cached = this.permissionCache.get(role)
    if (cached) {
      return cached
    }

    // 解析权限
    const permissions = this.resolvePermissions(role, new Set())
    this.permissionCache.set(role, permissions)

    return permissions
  }

  /**
   * 获取多个角色的合并权限
   *
   * @param roles - 角色标识数组
   * @returns 合并后的权限列表
   */
  getMergedPermissions(roles: Role[]): Permission[] {
    const permissionSet = new Set<Permission>()

    for (const role of roles) {
      const permissions = this.getPermissions(role)
      for (const permission of permissions) {
        permissionSet.add(permission)
      }
    }

    return Array.from(permissionSet)
  }

  /**
   * 检查用户是否具有指定角色
   *
   * @param userRoles - 用户拥有的角色
   * @param requiredRoles - 需要检查的角色
   * @param options - 检查选项
   * @returns 检查结果
   */
  checkRoles(
    userRoles: Role[],
    requiredRoles: Role[],
    options: RoleCheckOptions = {},
  ): RoleCheckResult {
    const mode = options.mode ?? 'any'
    const userRoleSet = new Set(userRoles)

    // 检查是否是超级管理员
    if (userRoleSet.has(this.config.superRole)) {
      return {
        granted: true,
        roles: requiredRoles,
        missing: [],
        mode,
      }
    }

    const missing: Role[] = []
    let grantedCount = 0

    for (const role of requiredRoles) {
      if (userRoleSet.has(role)) {
        grantedCount++
      }
      else {
        missing.push(role)
      }
    }

    const granted = mode === 'all'
      ? missing.length === 0
      : grantedCount > 0 || requiredRoles.length === 0

    return {
      granted,
      roles: requiredRoles,
      missing,
      mode,
    }
  }

  /**
   * 检查角色是否是超级管理员
   *
   * @param role - 角色标识
   * @returns 是否是超级管理员
   */
  isSuperRole(role: Role): boolean {
    const definition = this.roles.get(role)
    return definition?.isSuper === true || role === this.config.superRole
  }

  /**
   * 获取角色的父角色链
   *
   * @param role - 角色标识
   * @returns 父角色链
   */
  getParentChain(role: Role): Role[] {
    const chain: Role[] = []
    const visited = new Set<Role>()

    let current = role
    let depth = 0

    while (depth < this.config.maxInheritanceDepth) {
      const definition = this.roles.get(current)
      if (!definition?.parent || visited.has(definition.parent)) {
        break
      }

      visited.add(definition.parent)
      chain.push(definition.parent)
      current = definition.parent
      depth++
    }

    return chain
  }

  /**
   * 解析角色权限（包括继承）
   *
   * @private
   */
  private resolvePermissions(role: Role, visited: Set<Role>): Permission[] {
    // 防止循环继承
    if (visited.has(role)) {
      return []
    }
    visited.add(role)

    const definition = this.roles.get(role)
    if (!definition) {
      return []
    }

    // 当前角色的权限
    const permissions = new Set<Permission>(definition.permissions)

    // 继承父角色的权限
    if (this.config.enableInheritance && definition.parent) {
      const parentPermissions = this.resolvePermissions(definition.parent, visited)
      for (const permission of parentPermissions) {
        permissions.add(permission)
      }
    }

    return Array.from(permissions)
  }

  /**
   * 清除角色相关的缓存
   *
   * @private
   */
  private invalidateCache(role: Role): void {
    // 清除该角色及所有可能依赖它的角色的缓存
    this.permissionCache.delete(role)

    // 清除继承该角色的其他角色的缓存
    for (const [roleId, definition] of this.roles.entries()) {
      if (definition.parent === role) {
        this.invalidateCache(roleId)
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.permissionCache.clear()
  }

  /**
   * 获取统计信息
   *
   * @returns 统计信息
   */
  getStats(): {
    roleCount: number
    cacheSize: number
    inheritanceEnabled: boolean
  } {
    return {
      roleCount: this.roles.size,
      cacheSize: this.permissionCache.size,
      inheritanceEnabled: this.config.enableInheritance,
    }
  }
}

/**
 * 创建角色管理器
 *
 * @param config - 配置选项
 * @returns 角色管理器实例
 *
 * @example
 * ```ts
 * const roleManager = createRoleManager({
 *   enableInheritance: true,
 *   superRole: 'admin',
 * })
 * ```
 */
export function createRoleManager(config?: RoleManagerConfig): RoleManager {
  return new RoleManager(config)
}
