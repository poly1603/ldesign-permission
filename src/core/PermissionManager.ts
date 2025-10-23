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
   */
  assignRole(userId: string, roleName: string): void {
    this.rbacEngine.assignRole(userId, roleName)
  }

  /**
   * 从用户移除角色
   */
  unassignRole(userId: string, roleName: string): boolean {
    return this.rbacEngine.unassignRole(userId, roleName)
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
   */
  grantPermission(roleName: string, resource: string, action: string): void {
    this.rbacEngine.grantPermission(roleName, resource, action)
  }

  /**
   * 从角色撤销权限
   */
  revokePermission(roleName: string, resource: string, action: string): boolean {
    return this.rbacEngine.revokePermission(roleName, resource, action)
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
   * 优先级：
   * 1. RBAC 检查
   * 2. ABAC 检查
   * 3. 策略检查
   */
  check(userId: string, resource: string, action: string, options: CheckOptions = {}): CheckResult {
    const startTime = performance.now()

    // 1. RBAC 检查
    const rbacResult = this.rbacEngine.check(userId, resource, action)
    if (rbacResult.allowed) {
      return {
        ...rbacResult,
        fromCache: false,
      }
    }

    // 2. ABAC 检查（如果提供了上下文）
    if (options.context) {
      const fullContext = this.contextManager.buildContext({
        ...options.context,
        user: { id: userId },
      })

      const abacResult = this.abacEngine.check(action, { type: resource }, fullContext)
      if (abacResult.allowed) {
        return {
          ...abacResult,
          fromCache: false,
        }
      }
    }

    // 3. 策略检查
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
   */
  getStats() {
    return {
      rbac: this.rbacEngine.getStats(),
      abac: this.abacEngine.getStats(),
      policy: this.policyEngine.getStats(),
      currentUser: this.currentUser?.id,
    }
  }
}

/**
 * 创建权限管理器实例
 */
export function createPermissionManager(config?: PermissionConfig): PermissionManager {
  return new PermissionManager(config)
}



