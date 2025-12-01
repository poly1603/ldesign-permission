/**
 * 权限管理器
 *
 * @description 权限系统核心管理器，整合角色、权限和策略
 *
 * @module @ldesign/permission-core/permission
 * @author LDesign Team
 */

import type {
  Permission,
  PermissionCheckOptions,
  PermissionCheckResult,
  PermissionEventListener,
  PermissionEventMap,
  PermissionEventType,
  PermissionManagerConfig,
  PolicyContext,
  PolicyEvaluationResult,
  Role,
  RoleCheckOptions,
  RoleCheckResult,
  RoleDefinition,
} from '../types'
import { PermissionCache } from '../cache'
import { PolicyEngine } from '../policy'
import { RoleManager } from '../role'

/**
 * 权限数据提供者接口
 * @description 用于动态获取用户权限数据
 */
export interface PermissionDataProvider {
  /** 获取当前用户的权限 */
  getPermissions: () => Permission[] | Promise<Permission[]>
  /** 获取当前用户的角色 */
  getRoles: () => Role[] | Promise<Role[]>
}

/**
 * 权限管理器
 *
 * @description
 * 权限系统的核心管理器，整合 RBAC 和 ABAC
 *
 * **特性**：
 * - 权限检查（支持 all/any 模式）
 * - 角色检查（支持继承）
 * - 策略评估（ABAC）
 * - 缓存优化
 * - 事件监听
 *
 * @example
 * ```ts
 * const manager = new PermissionManager({
 *   enableCache: true,
 *   superRole: 'admin',
 * })
 *
 * // 设置数据提供者
 * manager.setDataProvider({
 *   getPermissions: () => ['user:read', 'user:write'],
 *   getRoles: () => ['editor'],
 * })
 *
 * // 检查权限
 * const result = await manager.hasPermission('user:read')
 * ```
 */
export class PermissionManager {
  /** 角色管理器 */
  private roleManager: RoleManager

  /** 策略引擎 */
  private policyEngine: PolicyEngine

  /** 权限缓存 */
  private cache: PermissionCache<PermissionCheckResult>

  /** 数据提供者 */
  private dataProvider?: PermissionDataProvider

  /** 配置 */
  private readonly config: Required<PermissionManagerConfig>

  /** 事件监听器 */
  private listeners = new Map<PermissionEventType, Set<PermissionEventListener>>()

  /** 用户权限（静态设置） */
  private userPermissions: Permission[] = []

  /** 用户角色（静态设置） */
  private userRoles: Role[] = []

  /**
   * 创建权限管理器
   *
   * @param config - 配置选项
   */
  constructor(config: PermissionManagerConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 60000,
      cacheMaxSize: config.cacheMaxSize ?? 500,
      superPermission: config.superPermission ?? '*',
      superRole: config.superRole ?? 'super',
      debug: config.debug ?? false,
    }

    // 初始化子模块
    this.roleManager = new RoleManager({
      superRole: this.config.superRole,
    })

    this.policyEngine = new PolicyEngine({
      defaultEffect: 'deny',
    })

    this.cache = new PermissionCache({
      maxSize: this.config.cacheMaxSize,
      defaultTTL: this.config.cacheTTL,
    })
  }

  // ==================== 数据提供者 ====================

  /**
   * 设置数据提供者
   *
   * @param provider - 数据提供者
   */
  setDataProvider(provider: PermissionDataProvider): void {
    this.dataProvider = provider
    this.clearCache()
  }

  /**
   * 设置用户权限（静态方式）
   *
   * @param permissions - 权限列表
   */
  setPermissions(permissions: Permission[]): void {
    this.userPermissions = permissions
    this.clearCache()
  }

  /**
   * 设置用户角色（静态方式）
   *
   * @param roles - 角色列表
   */
  setRoles(roles: Role[]): void {
    this.userRoles = roles
    this.clearCache()
  }

  /**
   * 获取用户权限
   *
   * @returns 权限列表
   */
  async getPermissions(): Promise<Permission[]> {
    if (this.dataProvider) {
      return Promise.resolve(this.dataProvider.getPermissions())
    }
    return this.userPermissions
  }

  /**
   * 获取用户角色
   *
   * @returns 角色列表
   */
  async getRoles(): Promise<Role[]> {
    if (this.dataProvider) {
      return Promise.resolve(this.dataProvider.getRoles())
    }
    return this.userRoles
  }

  // ==================== 权限检查 ====================

  /**
   * 检查是否具有权限
   *
   * @param permission - 权限标识或权限列表
   * @param options - 检查选项
   * @returns 是否具有权限
   *
   * @example
   * ```ts
   * // 检查单个权限
   * const can = await manager.hasPermission('user:read')
   *
   * // 检查多个权限（任一）
   * const can = await manager.hasPermission(['user:read', 'user:write'], { mode: 'any' })
   *
   * // 检查多个权限（全部）
   * const can = await manager.hasPermission(['user:read', 'user:write'], { mode: 'all' })
   * ```
   */
  async hasPermission(
    permission: Permission | Permission[],
    options: PermissionCheckOptions = {},
  ): Promise<boolean> {
    const permissions = Array.isArray(permission) ? permission : [permission]
    const result = await this.checkPermissions(permissions, options)
    return result.granted
  }

  /**
   * 检查权限（返回详细结果）
   *
   * @param permissions - 权限列表
   * @param options - 检查选项
   * @returns 检查结果
   */
  async checkPermissions(
    permissions: Permission[],
    options: PermissionCheckOptions = {},
  ): Promise<PermissionCheckResult> {
    const mode = options.mode ?? 'all'
    const startTime = performance.now()

    // 空权限列表直接通过
    if (permissions.length === 0) {
      return {
        granted: true,
        permissions,
        missing: [],
        mode,
        duration: performance.now() - startTime,
      }
    }

    // 检查缓存
    if (this.config.enableCache && !options.skipCache) {
      const cacheKey = this.getPermissionCacheKey(permissions, mode)
      const cached = this.cache.get(cacheKey)
      if (cached) {
        this.emit('cache:hit', { key: cacheKey })
        return cached
      }
      this.emit('cache:miss', { key: cacheKey })
    }

    // 获取用户权限
    const userPermissions = await this.getPermissions()
    const userRoles = await this.getRoles()

    // 检查是否是超级管理员
    if (this.isSuperUser(userPermissions, userRoles)) {
      const result: PermissionCheckResult = {
        granted: true,
        permissions,
        missing: [],
        mode,
        duration: performance.now() - startTime,
      }
      this.cacheResult(permissions, mode, result)
      return result
    }

    // 合并角色权限
    const rolePermissions = this.roleManager.getMergedPermissions(userRoles)
    const allPermissions = new Set([...userPermissions, ...rolePermissions])

    // 检查权限
    const missing: Permission[] = []
    let grantedCount = 0

    for (const perm of permissions) {
      if (allPermissions.has(perm) || this.matchWildcard(perm, allPermissions)) {
        grantedCount++
      }
      else {
        missing.push(perm)
      }
    }

    const granted = mode === 'all'
      ? missing.length === 0
      : grantedCount > 0

    const result: PermissionCheckResult = {
      granted,
      permissions,
      missing,
      mode,
      duration: performance.now() - startTime,
    }

    // 缓存结果
    this.cacheResult(permissions, mode, result)

    // 触发事件
    this.emit(granted ? 'permission:granted' : 'permission:denied', result)

    return result
  }

  // ==================== 角色检查 ====================

  /**
   * 检查是否具有角色
   *
   * @param role - 角色标识或角色列表
   * @param options - 检查选项
   * @returns 是否具有角色
   */
  async hasRole(
    role: Role | Role[],
    options: RoleCheckOptions = {},
  ): Promise<boolean> {
    const roles = Array.isArray(role) ? role : [role]
    const result = await this.checkRoles(roles, options)
    return result.granted
  }

  /**
   * 检查角色（返回详细结果）
   *
   * @param roles - 角色列表
   * @param options - 检查选项
   * @returns 检查结果
   */
  async checkRoles(
    roles: Role[],
    options: RoleCheckOptions = {},
  ): Promise<RoleCheckResult> {
    const userRoles = await this.getRoles()
    const result = this.roleManager.checkRoles(userRoles, roles, options)

    // 触发事件
    this.emit(result.granted ? 'role:granted' : 'role:denied', result)

    return result
  }

  // ==================== 策略评估 ====================

  /**
   * 评估策略
   *
   * @param context - 策略上下文
   * @returns 评估结果
   */
  async evaluatePolicy(context: PolicyContext): Promise<PolicyEvaluationResult> {
    // 补充用户信息
    if (!context.user) {
      const permissions = await this.getPermissions()
      const roles = await this.getRoles()
      context.user = {
        id: 0,
        permissions,
        roles,
      }
    }

    const result = this.policyEngine.evaluate(context)

    // 触发事件
    this.emit('policy:evaluated', result)

    return result
  }

  // ==================== 角色管理 ====================

  /**
   * 定义角色
   *
   * @param definition - 角色定义
   */
  defineRole(definition: RoleDefinition): void {
    this.roleManager.defineRole(definition)
    this.clearCache()
  }

  /**
   * 批量定义角色
   *
   * @param definitions - 角色定义数组
   */
  defineRoles(definitions: RoleDefinition[]): void {
    this.roleManager.defineRoles(definitions)
    this.clearCache()
  }

  /**
   * 获取角色管理器
   *
   * @returns 角色管理器实例
   */
  getRoleManager(): RoleManager {
    return this.roleManager
  }

  /**
   * 获取策略引擎
   *
   * @returns 策略引擎实例
   */
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine
  }

  // ==================== 事件处理 ====================

  /**
   * 监听事件
   *
   * @param event - 事件类型
   * @param listener - 事件监听器
   * @returns 取消监听函数
   */
  on<K extends PermissionEventType>(
    event: K,
    listener: PermissionEventListener<PermissionEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as PermissionEventListener)

    return () => {
      this.listeners.get(event)?.delete(listener as PermissionEventListener)
    }
  }

  /**
   * 触发事件
   *
   * @private
   */
  private emit<K extends PermissionEventType>(
    event: K,
    data: PermissionEventMap[K],
  ): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(data)
        }
        catch (error) {
          console.error(`[PermissionManager] 事件处理器错误:`, error)
        }
      }
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查是否是超级用户
   *
   * @private
   */
  private isSuperUser(permissions: Permission[], roles: Role[]): boolean {
    return (
      permissions.includes(this.config.superPermission)
      || roles.includes(this.config.superRole)
      || roles.some(role => this.roleManager.isSuperRole(role))
    )
  }

  /**
   * 匹配通配符权限
   *
   * @private
   */
  private matchWildcard(permission: Permission, userPermissions: Set<Permission>): boolean {
    // 检查通配符权限
    if (userPermissions.has('*')) {
      return true
    }

    // 检查资源级通配符 (e.g., user:* 匹配 user:read)
    const parts = permission.split(':')
    if (parts.length >= 2) {
      const resourceWildcard = `${parts[0]}:*`
      if (userPermissions.has(resourceWildcard)) {
        return true
      }
    }

    return false
  }

  /**
   * 获取权限缓存键
   *
   * @private
   */
  private getPermissionCacheKey(permissions: Permission[], mode: string): string {
    return `perm:${mode}:${permissions.sort().join(',')}`
  }

  /**
   * 缓存检查结果
   *
   * @private
   */
  private cacheResult(
    permissions: Permission[],
    mode: string,
    result: PermissionCheckResult,
  ): void {
    if (this.config.enableCache) {
      const cacheKey = this.getPermissionCacheKey(permissions, mode)
      this.cache.set(cacheKey, result)
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.roleManager.clearCache()
    this.emit('cache:cleared', { reason: 'manual' })
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    cacheStats: ReturnType<PermissionCache['getStats']>
    roleStats: ReturnType<RoleManager['getStats']>
    policyStats: ReturnType<PolicyEngine['getStats']>
  } {
    return {
      cacheStats: this.cache.getStats(),
      roleStats: this.roleManager.getStats(),
      policyStats: this.policyEngine.getStats(),
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.cache.destroy()
    this.listeners.clear()
    this.userPermissions = []
    this.userRoles = []
  }
}

/**
 * 创建权限管理器
 *
 * @param config - 配置选项
 * @returns 权限管理器实例
 *
 * @example
 * ```ts
 * const manager = createPermissionManager({
 *   enableCache: true,
 *   superRole: 'admin',
 * })
 * ```
 */
export function createPermissionManager(
  config?: PermissionManagerConfig,
): PermissionManager {
  return new PermissionManager(config)
}
