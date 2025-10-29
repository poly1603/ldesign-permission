/**
 * @ldesign/permission - 权限管理器
 * 
 * 统一的权限管理入口，集成 RBAC、ABAC 和策略引擎
 */

import type {
  Permission,
  PermissionConfig,
  CheckOptions,
  CheckResult,
  Role,
  RoleOptions,
  AbilityRule,
  Context,
  User,
  Policy,
} from '../types'
import { RBACEngine } from './rbac/RBACEngine'
import { ABACEngine } from './abac/ABACEngine'
import { PolicyEngine } from './policy/PolicyEngine'
import { ContextManager } from './abac/ContextManager'
import { PermissionCache, createPermissionCacheKey } from './cache/PermissionCache'
import { EventEmitter } from './events/EventEmitter'
import { AuditLogger } from './audit/AuditLogger'
import { TemporaryPermissionManager } from './expiration/TemporaryPermissionManager'
import { PerformanceMonitor } from './monitor/PerformanceMonitor'
import { PermissionTemplateManager } from './template/PermissionTemplate'

/**
 * 权限管理器类
 * 
 * 提供统一的权限管理 API，整合：
 * - RBAC（基于角色的访问控制）
 * - ABAC（基于属性的访问控制）
 * - 策略引擎
 */
export class PermissionManager {
  /** RBAC 引擎 */
  private rbacEngine: RBACEngine

  /** ABAC 引擎 */
  private abacEngine: ABACEngine

  /** 策略引擎 */
  private policyEngine: PolicyEngine

  /** 上下文管理器 */
  private contextManager: ContextManager

  /** 权限缓存 */
  private permissionCache: PermissionCache

  /** 事件发射器 */
  private eventEmitter?: EventEmitter

  /** 审计日志记录器 */
  private auditLogger?: AuditLogger

  /** 临时权限管理器 */
  private temporaryPermissionManager: TemporaryPermissionManager

  /** 性能监控器 */
  private performanceMonitor: PerformanceMonitor

  /** 权限模板管理器 */
  private templateManager: PermissionTemplateManager

  /** 配置 */
  private config: Required<PermissionConfig>

  /** 当前用户 */
  private currentUser?: User

  constructor(config: PermissionConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cache: {
        maxSize: config.cache?.maxSize ?? 1000,
        ttl: config.cache?.ttl ?? 5 * 60 * 1000, // 5分钟
      },
      enableAudit: config.enableAudit ?? false,
      enableEvents: config.enableEvents ?? true,
      strict: config.strict ?? false,
      defaultDeny: config.defaultDeny ?? true,
    }

    this.rbacEngine = new RBACEngine({
      enableInheritance: true,
      detectCircular: true,
    })

    this.abacEngine = new ABACEngine({
      enableConditionCache: this.config.enableCache,
      strict: this.config.strict,
    })

    this.policyEngine = new PolicyEngine({
      defaultConflictResolution: 'deny-override',
      strict: this.config.strict,
    })

    this.contextManager = this.abacEngine.getContextManager()

    // 初始化权限缓存
    this.permissionCache = new PermissionCache({
      enabled: this.config.enableCache,
      maxSize: this.config.cache.maxSize,
      ttl: this.config.cache.ttl,
    })

    // 初始化事件系统
    if (this.config.enableEvents) {
      this.eventEmitter = new EventEmitter()
    }

    // 初始化审计日志
    if (this.config.enableAudit) {
      this.auditLogger = new AuditLogger({
        enabled: true,
      })
    }

    // 初始化临时权限管理器
    this.temporaryPermissionManager = new TemporaryPermissionManager({
      autoCleanup: true,
      cleanupInterval: 60 * 1000, // 1 分钟
    })

    // 初始化性能监控器
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      slowQueryThreshold: 1.0, // 1ms
    })

    // 初始化模板管理器
    this.templateManager = new PermissionTemplateManager()
  }

  // ==================== 用户管理 ====================

  /**
   * 设置当前用户
   */
  setCurrentUser(user: User): void {
    this.currentUser = user

    // 设置用户上下文
    this.contextManager.setGlobalContext(
      this.contextManager.createUserContext(user)
    )
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | undefined {
    return this.currentUser
  }

  /**
   * 清除当前用户
   */
  clearCurrentUser(): void {
    this.currentUser = undefined
    this.contextManager.clearGlobalContext()
  }

  // ==================== RBAC API ====================

  /**
   * 创建角色
   */
  createRole(name: string, options?: RoleOptions): Role {
    return this.rbacEngine.createRole(name, options)
  }

  /**
   * 获取角色
   */
  getRole(name: string): Role | undefined {
    return this.rbacEngine.getRole(name)
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return this.rbacEngine.getAllRoles()
  }

  /**
   * 删除角色
   */
  deleteRole(name: string): boolean {
    return this.rbacEngine.deleteRole(name)
  }

  /**
   * 给用户分配角色
   * 
   * @param userId - 用户ID
   * @param roleName - 角色名称
   */
  assignRole(userId: string, roleName: string): void {
    this.rbacEngine.assignRole(userId, roleName)

    // 清除该用户的缓存
    this.permissionCache.invalidateUser(userId)

    // 触发事件
    this.eventEmitter?.emitSync('role:assigned', {
      userId,
      roleName,
    })

    // 记录审计日志
    this.auditLogger?.logRoleAssigned(userId, roleName)
  }

  /**
   * 从用户移除角色
   * 
   * @param userId - 用户ID
   * @param roleName - 角色名称
   * @returns 是否成功移除
   */
  unassignRole(userId: string, roleName: string): boolean {
    const removed = this.rbacEngine.unassignRole(userId, roleName)

    if (removed) {
      // 清除该用户的缓存
      this.permissionCache.invalidateUser(userId)

      // 触发事件
      this.eventEmitter?.emitSync('role:unassigned', {
        userId,
        roleName,
      })

      // 记录审计日志
      this.auditLogger?.logRoleRemoved(userId, roleName)
    }

    return removed
  }

  /**
   * 获取用户的角色
   */
  getUserRoles(userId: string): string[] {
    return this.rbacEngine.getUserRoles(userId)
  }

  /**
   * 用户是否拥有角色
   */
  hasRole(userId: string, roleName: string): boolean {
    return this.rbacEngine.userHasRole(userId, roleName)
  }

  /**
   * 授予权限给角色
   * 
   * @param roleName - 角色名称
   * @param resource - 资源名称
   * @param action - 操作类型
   */
  grantPermission(roleName: string, resource: string, action: string): void {
    this.rbacEngine.grantPermission(roleName, resource, action)

    // 获取拥有该角色的所有用户并清除缓存
    const users = this.rbacEngine.getStore().getUsersWithRole(roleName)
    for (const userId of users) {
      this.permissionCache.invalidateUser(userId)
    }

    // 触发事件
    this.eventEmitter?.emitSync('permission:granted', {
      roleName,
      resource,
      action,
      permission: `${resource}:${action}`,
    })

    // 记录审计日志
    this.auditLogger?.logPermissionGranted(roleName, `${resource}:${action}`)
  }

  /**
   * 从角色撤销权限
   * 
   * @param roleName - 角色名称
   * @param resource - 资源名称
   * @param action - 操作类型
   * @returns 是否成功撤销
   */
  revokePermission(roleName: string, resource: string, action: string): boolean {
    const revoked = this.rbacEngine.revokePermission(roleName, resource, action)

    if (revoked) {
      // 获取拥有该角色的所有用户并清除缓存
      const users = this.rbacEngine.getStore().getUsersWithRole(roleName)
      for (const userId of users) {
        this.permissionCache.invalidateUser(userId)
      }

      // 触发事件
      this.eventEmitter?.emitSync('permission:revoked', {
        roleName,
        resource,
        action,
        permission: `${resource}:${action}`,
      })

      // 记录审计日志
      this.auditLogger?.logPermissionRevoked(roleName, `${resource}:${action}`)
    }

    return revoked
  }

  /**
   * 获取角色的权限
   */
  getRolePermissions(roleName: string, includeInherited: boolean = true): string[] {
    return this.rbacEngine.getRolePermissions(roleName, includeInherited)
  }

  // ==================== ABAC API ====================

  /**
   * 定义能力规则
   */
  defineAbility(rules: AbilityRule[]): void {
    this.abacEngine.addRules(rules)
  }

  /**
   * 添加能力规则
   */
  addAbilityRule(rule: AbilityRule): void {
    this.abacEngine.addRule(rule)
  }

  /**
   * 移除能力规则
   */
  removeAbilityRule(ruleId: string): boolean {
    return this.abacEngine.removeRule(ruleId)
  }

  /**
   * 获取所有能力规则
   */
  getAllAbilityRules(): AbilityRule[] {
    return this.abacEngine.getAllRules()
  }

  /**
   * 检查能力（ABAC）
   */
  can(action: string, subject: any, context?: Context): boolean {
    const fullContext = this.contextManager.buildContext(context)
    return this.abacEngine.can(action, subject, fullContext)
  }

  /**
   * 检查不能（ABAC）
   */
  cannot(action: string, subject: any, context?: Context): boolean {
    return !this.can(action, subject, context)
  }

  // ==================== 策略 API ====================

  /**
   * 添加策略
   */
  addPolicy(policy: Policy): void {
    this.policyEngine.addPolicy(policy)
  }

  /**
   * 获取策略
   */
  getPolicy(id: string): Policy | null {
    return this.policyEngine.getPolicy(id)
  }

  /**
   * 获取所有策略
   */
  getAllPolicies(): Policy[] {
    return this.policyEngine.getAllPolicies()
  }

  /**
   * 删除策略
   */
  removePolicy(id: string): void {
    this.policyEngine.removePolicy(id)
  }

  // ==================== 统一检查 API ====================

  /**
   * 统一权限检查
   * 
   * 此方法会按以下顺序检查（优先级从高到低）：
   * 1. 检查缓存（如果启用且缓存存在）
   * 2. 检查临时权限（包括一次性权限）
   * 3. RBAC 检查（基于角色的权限）
   * 4. ABAC 检查（基于属性的权限，需要提供 context）
   * 5. 策略检查（基于策略规则）
   * 
   * 性能特点：
   * - 缓存命中：< 0.1ms
   * - 无缓存：< 0.5ms
   * - 缓存命中率通常在 80% 以上
   * 
   * @param userId - 用户唯一标识符
   * @param resource - 资源名称（如 'users', 'posts'）
   * @param action - 操作类型（如 'read', 'write', 'delete'）
   * @param options - 可选配置
   * @param options.skipCache - 是否跳过缓存
   * @param options.context - 上下文信息（用于 ABAC 检查）
   * @returns 权限检查结果，包含是否允许、耗时、匹配信息等
   * 
   * @example
   * ```typescript
   * // 基本检查
   * const result = pm.check('user123', 'posts', 'delete')
   * if (result.allowed) {
   *   console.log('允许删除文章')
   *   console.log('耗时:', result.duration, 'ms')
   *   console.log('来自缓存:', result.fromCache)
   * }
   * 
   * // 带上下文的检查（用于 ABAC）
   * const result2 = pm.check('user123', 'posts', 'delete', {
   *   context: { user: { id: 'user123' }, resource: { ownerId: 'user123' } }
   * })
   * ```
   */
  check(userId: string, resource: string, action: string, options: CheckOptions = {}): CheckResult {
    const startTime = performance.now()

    // 触发检查前事件
    this.eventEmitter?.emitSync('permission:check:before', {
      userId,
      resource,
      action,
      options,
    })

    // 1. 检查缓存（如果启用且未明确跳过）
    if (this.config.enableCache && !options.skipCache) {
      const cacheKey = createPermissionCacheKey(userId, resource, action, options.context)
      const cached = this.permissionCache.get(cacheKey)

      if (cached) {
        // 触发检查后事件
        this.eventEmitter?.emitSync('permission:check:after', {
          userId,
          resource,
          action,
          result: cached,
        })

        return cached
      }
    }

    let result: CheckResult

    // 2. 检查临时权限（优先级高）
    const hasTemporaryPermission = this.temporaryPermissionManager.checkTemporaryPermission(
      userId,
      resource,
      action
    )

    if (hasTemporaryPermission) {
      result = {
        allowed: true,
        duration: performance.now() - startTime,
        fromCache: false,
        reason: 'Temporary permission granted',
      }
    } else {
      // 3. RBAC 检查
      const rbacResult = this.rbacEngine.check(userId, resource, action)
      if (rbacResult.allowed) {
        result = {
          ...rbacResult,
          fromCache: false,
        }
      } else {
        // 4. ABAC 检查（如果提供了上下文）
        if (options.context) {
          const fullContext = this.contextManager.buildContext({
            ...options.context,
            user: { id: userId },
          })

          const abacResult = this.abacEngine.check(action, { type: resource }, fullContext)
          if (abacResult.allowed) {
            result = {
              ...abacResult,
              fromCache: false,
            }
          } else {
            // 4. 策略检查
            result = this.checkWithPolicy(userId, resource, action, options, startTime)
          }
        } else {
          // 4. 策略检查（无上下文）
          result = this.checkWithPolicy(userId, resource, action, options, startTime)
        }
      }

      // 记录耗时
      result.duration = performance.now() - startTime

      // 缓存结果（如果启用）
      if (this.config.enableCache && !options.skipCache) {
        const cacheKey = createPermissionCacheKey(userId, resource, action, options.context)
        this.permissionCache.set(cacheKey, result)
      }

      // 触发检查后事件
      this.eventEmitter?.emitSync('permission:check:after', {
        userId,
        resource,
        action,
        result,
      })

      // 记录审计日志
      if (this.config.enableAudit && this.auditLogger) {
        this.auditLogger.logPermissionCheck(
          userId,
          resource,
          action,
          result.allowed,
          result.duration,
          options.context,
          result.reason
        )
      }

      // 记录性能指标
      this.performanceMonitor.recordCheck(
        userId,
        resource,
        action,
        result.duration || 0,
        result.allowed,
        result.fromCache || false
      )

      return result
    }
  }

  /**
   * 策略检查（私有辅助方法）
   */
  private checkWithPolicy(
      userId: string,
      resource: string,
      action: string,
      options: CheckOptions,
      startTime: number
    ): CheckResult {
    const userRoles = this.rbacEngine.getUserRoles(userId)

    if (userRoles.length > 0) {
      for (const role of userRoles) {
        const policyResult = this.policyEngine.isAllowed(role, resource, action, options.context)
        if (policyResult) {
          return {
            allowed: true,
            matchedRole: role,
            duration: performance.now() - startTime,
            fromCache: false,
          }
        }
      }
    }

    // 默认拒绝
    return {
      allowed: false,
      duration: performance.now() - startTime,
      reason: 'Access denied',
      fromCache: false,
    }
  }

  /**
   * 批量权限检查
   */
  checkMultiple(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    options: CheckOptions = {}
  ): CheckResult[] {
    return permissions.map(({ resource, action }) =>
      this.check(userId, resource, action, options)
    )
  }

  /**
   * 检查任意一个权限
   */
  checkAny(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    options: CheckOptions = {}
  ): boolean {
    return permissions.some(({ resource, action }) =>
      this.check(userId, resource, action, options).allowed
    )
  }

  /**
   * 检查所有权限
   */
  checkAll(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
    options: CheckOptions = {}
  ): boolean {
    return permissions.every(({ resource, action }) =>
      this.check(userId, resource, action, options).allowed
    )
  }

  /**
   * 便捷方法：检查权限字符串
   * @example checkPermission(userId, 'users:read')
   */
  checkPermission(userId: string, permission: string, options: CheckOptions = {}): boolean {
    const [resource, action] = permission.split(':')
    if (!resource || !action) {
      throw new Error(`Invalid permission format: "${permission}". Expected "resource:action"`)
    }

    return this.check(userId, resource, action, options).allowed
  }

  // ==================== 字段权限 ====================

  /**
   * 获取可访问的字段
   */
  getAccessibleFields(resource: string, action: string, context?: Context): string[] {
    const fullContext = this.contextManager.buildContext(context)
    return this.abacEngine.getAccessibleFields(resource, action, fullContext)
  }

  /**
   * 过滤对象字段
   */
  filterFields(obj: any, resource: string, action: string, context?: Context): any {
    const fullContext = this.contextManager.buildContext(context)
    return this.abacEngine.filterFields(obj, resource, action, fullContext)
  }

  // ==================== 工具方法 ====================

  /**
   * 获取 RBAC 引擎
   */
  getRBACEngine(): RBACEngine {
    return this.rbacEngine
  }

  /**
   * 获取 ABAC 引擎
   */
  getABACEngine(): ABACEngine {
    return this.abacEngine
  }

  /**
   * 获取策略引擎
   */
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine
  }

  /**
   * 获取上下文管理器
   */
  getContextManager(): ContextManager {
    return this.contextManager
  }

  /**
   * 导出所有数据
   */
  export(): string {
    return JSON.stringify({
      rbac: this.rbacEngine.export(),
      abac: this.abacEngine.export(),
      policy: this.policyEngine.export(),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 导入数据
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    if (parsed.rbac) {
      this.rbacEngine.import(parsed.rbac)
    }

    if (parsed.abac) {
      this.abacEngine.import(parsed.abac)
    }

    if (parsed.policy) {
      this.policyEngine.import(parsed.policy)
    }
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    await this.rbacEngine.clear()
    this.abacEngine.clearRules()
    this.policyEngine.clear()
    this.clearCurrentUser()
  }

  /**
   * 获取统计信息
   * 
   * @returns 完整的系统统计信息
   */
  getStats() {
    return {
      rbac: this.rbacEngine.getStats(),
      abac: this.abacEngine.getStats(),
      policy: this.policyEngine.getStats(),
      cache: this.permissionCache.getStats(),
      performance: this.performanceMonitor.getMetrics(),
      temporary: this.temporaryPermissionManager.getStats(),
      templates: this.templateManager.getStats(),
      currentUser: this.currentUser?.id,
      audit: this.auditLogger ? {
        enabled: true,
        stats: this.auditLogger.generateStats(),
      } : { enabled: false },
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 获取权限缓存实例
   * 
   * @returns 权限缓存实例
   */
  getPermissionCache(): PermissionCache {
    return this.permissionCache
  }

  /**
   * 清除所有权限缓存
   */
  clearCache(): void {
    this.permissionCache.clear()
  }

  /**
   * 清理过期的缓存项
   * 
   * @returns 清理的缓存项数量
   */
  cleanupCache(): number {
    return this.permissionCache.cleanup()
  }

  // ==================== 事件系统 ====================

  /**
   * 获取事件发射器
   * 
   * @returns 事件发射器实例（如果启用）
   */
  getEventEmitter(): EventEmitter | undefined {
    return this.eventEmitter
  }

  /**
   * 监听权限事件
   * 
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消监听的函数
   */
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventEmitter) {
      throw new Error('Event system is not enabled')
    }

    return this.eventEmitter.on(event, handler)
  }

  /**
   * 监听权限事件（一次性）
   * 
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消监听的函数
   */
  once(event: string, handler: (data: any) => void): () => void {
    if (!this.eventEmitter) {
      throw new Error('Event system is not enabled')
    }

    return this.eventEmitter.once(event, handler)
  }

  /**
   * 取消监听权限事件
   * 
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  off(event: string, handler: (data: any) => void): void {
    this.eventEmitter?.off(event, handler)
  }

  // ==================== 审计日志 ====================

  /**
   * 获取审计日志记录器
   * 
   * @returns 审计日志记录器实例（如果启用）
   */
  getAuditLogger(): AuditLogger | undefined {
    return this.auditLogger
  }

  /**
   * 查询审计日志
   * 
   * @param options - 查询选项
   * @returns 审计日志列表
   */
  queryAuditLogs(options?: any) {
    if (!this.auditLogger) {
      throw new Error('Audit logging is not enabled')
    }

    return this.auditLogger.query(options)
  }

  /**
   * 生成审计报告
   * 
   * @param startTime - 开始时间
   * @param endTime - 结束时间
   * @param name - 报告名称
   * @returns 审计报告
   */
  generateAuditReport(startTime: Date, endTime: Date, name?: string) {
    if (!this.auditLogger) {
      throw new Error('Audit logging is not enabled')
    }

    return this.auditLogger.generateReport(startTime, endTime, name)
  }

  // ==================== 临时权限管理 ====================

  /**
   * 获取临时权限管理器
   * 
   * @returns 临时权限管理器实例
   */
  getTemporaryPermissionManager(): TemporaryPermissionManager {
    return this.temporaryPermissionManager
  }

  /**
   * 授予临时权限
   * 
   * @param userId - 用户ID
   * @param resource - 资源
   * @param action - 操作
   * @param expiresAt - 过期时间
   * @param options - 可选项
   * @returns 临时权限ID
   */
  grantTemporaryPermission(
    userId: string,
    resource: string,
    action: string,
    expiresAt: Date,
    options?: {
      createdBy?: string
      metadata?: Record<string, any>
    }
  ): string {
    const id = this.temporaryPermissionManager.grantTemporaryPermission(
      userId,
      resource,
      action,
      expiresAt,
      options
    )

    // 清除用户缓存
    this.permissionCache.invalidateUser(userId)

    // 触发事件
    this.eventEmitter?.emitSync('permission:temporary:granted', {
      id,
      userId,
      resource,
      action,
      expiresAt,
    })

    return id
  }

  /**
   * 授予一次性权限
   * 
   * @param userId - 用户ID
   * @param resource - 资源
   * @param action - 操作
   * @param expiresAt - 可选的过期时间
   * @returns 一次性权限ID
   */
  grantOneTimePermission(
    userId: string,
    resource: string,
    action: string,
    expiresAt?: Date
  ): string {
    const id = this.temporaryPermissionManager.grantOneTimePermission(
      userId,
      resource,
      action,
      expiresAt
    )

    // 清除用户缓存
    this.permissionCache.invalidateUser(userId)

    // 触发事件
    this.eventEmitter?.emitSync('permission:one-time:granted', {
      id,
      userId,
      resource,
      action,
      expiresAt,
    })

    return id
  }

  /**
   * 撤销临时权限
   * 
   * @param id - 临时权限ID
   * @returns 是否成功撤销
   */
  revokeTemporaryPermission(id: string): boolean {
    const revoked = this.temporaryPermissionManager.revokeTemporaryPermission(id)

    if (revoked) {
      // 触发事件
      this.eventEmitter?.emitSync('permission:temporary:revoked', { id })
    }

    return revoked
  }

  /**
   * 获取用户的临时权限
   * 
   * @param userId - 用户ID
   * @returns 临时权限列表
   */
  getUserTemporaryPermissions(userId: string) {
    return this.temporaryPermissionManager.getUserTemporaryPermissions(userId)
  }

  // ==================== 性能监控 ====================

  /**
   * 获取性能监控器
   * 
   * @returns 性能监控器实例
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor
  }

  /**
   * 获取性能指标
   * 
   * @returns 性能指标对象
   */
  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * 获取慢查询列表
   * 
   * @param limit - 返回数量限制
   * @returns 慢查询列表
   */
  getSlowQueries(limit?: number) {
    return this.performanceMonitor.getSlowQueries(limit)
  }

  /**
   * 生成性能报告
   * 
   * @returns 性能报告文本
   */
  generatePerformanceReport(): string {
    return this.performanceMonitor.generateReport()
  }

  /**
   * 检查性能健康状况
   * 
   * @returns 健康状况和问题列表
   */
  checkPerformanceHealth() {
    return this.performanceMonitor.checkHealth()
  }

  /**
   * 获取性能趋势
   * 
   * @returns 性能趋势分析
   */
  getPerformanceTrend() {
    return this.performanceMonitor.getPerformanceTrend()
  }

  // ==================== 权限模板 ====================

  /**
   * 获取模板管理器
   * 
   * @returns 模板管理器实例
   */
  getTemplateManager(): PermissionTemplateManager {
    return this.templateManager
  }

  /**
   * 应用权限模板
   * 
   * 快速创建预定义的角色和权限
   * 
   * @param templateId - 模板ID
   * @param options - 应用选项
   * 
   * @example
   * ```typescript
   * // 应用基础 CRUD 模板
   * pm.applyTemplate('basic-crud')
   * // 现在拥有 viewer、editor、admin 三个角色
   * 
   * // 应用内容管理模板
   * pm.applyTemplate('content-management', {
   *   skipExisting: false // 覆盖已存在的角色
   * })
   * ```
   */
  applyTemplate(
    templateId: string,
    options?: {
      skipExisting?: boolean
      merge?: boolean
    }
  ): void {
    this.templateManager.apply(templateId, this, options)
  }

  /**
   * 获取所有可用模板
   * 
   * @returns 模板列表
   */
  getAvailableTemplates() {
    return this.templateManager.getAllTemplates()
  }

  /**
   * 根据标签查找模板
   * 
   * @param tag - 标签
   * @returns 匹配的模板列表
   */
  getTemplatesByTag(tag: string) {
    return this.templateManager.getTemplatesByTag(tag)
  }
}

/**
 * 创建权限管理器实例
 */
export function createPermissionManager(config?: PermissionConfig): PermissionManager {
  return new PermissionManager(config)
}



