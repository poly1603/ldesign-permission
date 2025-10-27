/**
 * @ldesign/permission - 临时权限管理器
 * 
 * 提供临时权限和一次性权限的管理功能
 */

import type {
  TemporaryPermission,
  TemporaryRoleAssignment,
  ExpirationConfig,
} from '../../types/expiration'
import type { CheckResult } from '../../types/core'
import { ExpirationManager } from './ExpirationManager'

/**
 * 临时权限管理器类
 * 
 * 功能：
 * - 临时权限授予（带过期时间）
 * - 一次性权限（使用后自动撤销）
 * - 临时角色分配
 * - 自动清理过期权限
 * 
 * @example
 * ```typescript
 * const tempMgr = new TemporaryPermissionManager()
 * 
 * // 授予临时权限（1小时后过期）
 * tempMgr.grantTemporaryPermission(
 *   'user123',
 *   'sensitive-data',
 *   'read',
 *   new Date(Date.now() + 60 * 60 * 1000)
 * )
 * 
 * // 授予一次性权限
 * tempMgr.grantOneTimePermission('user123', 'temp-resource', 'access')
 * 
 * // 检查临时权限
 * const hasPermission = tempMgr.checkTemporaryPermission('user123', 'sensitive-data', 'read')
 * ```
 */
export class TemporaryPermissionManager {
  /** 临时权限存储 */
  private permissions = new Map<string, TemporaryPermission>()

  /** 临时角色分配存储 */
  private roleAssignments = new Map<string, TemporaryRoleAssignment>()

  /** 过期管理器 */
  private expirationManager: ExpirationManager

  /** 配置 */
  private config: Required<ExpirationConfig>

  /**
   * 创建临时权限管理器实例
   * 
   * @param config - 配置选项
   */
  constructor(config: ExpirationConfig = {}) {
    this.config = {
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 60 * 1000, // 1 分钟
      notifyBefore: config.notifyBefore ?? 5 * 60 * 1000,   // 5 分钟
      enableNotify: config.enableNotify ?? false,
    }

    this.expirationManager = new ExpirationManager(
      this.config.cleanupInterval,
      this.config.notifyBefore
    )

    // 启动自动清理
    if (this.config.autoCleanup) {
      this.expirationManager.startAutoCleanup()
    }

    // 启动过期通知
    if (this.config.enableNotify) {
      this.expirationManager.startExpirationNotify()
    }

    // 注册清理回调
    this.setupCleanupCallbacks()
  }

  // ==================== 临时权限管理 ====================

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
    options: {
      createdBy?: string
      metadata?: Record<string, any>
    } = {}
  ): string {
    const id = this.generateId('perm')

    const permission: TemporaryPermission = {
      id,
      userId,
      resource,
      action,
      expiresAt,
      createdAt: new Date(),
      createdBy: options.createdBy,
      oneTime: false,
      usedCount: 0,
      metadata: options.metadata,
    }

    this.permissions.set(id, permission)

    // 添加到过期管理器
    this.expirationManager.add(id, expiresAt, {
      type: 'permission',
      userId,
      resource,
      action,
    })

    return id
  }

  /**
   * 授予一次性权限
   * 
   * 权限使用后会自动撤销
   * 
   * @param userId - 用户ID
   * @param resource - 资源
   * @param action - 操作
   * @param expiresAt - 可选的过期时间
   * @returns 临时权限ID
   */
  grantOneTimePermission(
    userId: string,
    resource: string,
    action: string,
    expiresAt?: Date
  ): string {
    const id = this.generateId('onetime')

    const permission: TemporaryPermission = {
      id,
      userId,
      resource,
      action,
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 默认 24 小时
      createdAt: new Date(),
      oneTime: true,
      usedCount: 0,
    }

    this.permissions.set(id, permission)

    // 添加到过期管理器
    if (expiresAt) {
      this.expirationManager.add(id, expiresAt, {
        type: 'one-time-permission',
        userId,
        resource,
        action,
      })
    }

    return id
  }

  /**
   * 检查临时权限
   * 
   * @param userId - 用户ID
   * @param resource - 资源
   * @param action - 操作
   * @returns 是否拥有临时权限
   */
  checkTemporaryPermission(userId: string, resource: string, action: string): boolean {
    const now = new Date()

    for (const permission of this.permissions.values()) {
      // 检查用户匹配
      if (permission.userId !== userId) {
        continue
      }

      // 检查权限匹配
      const resourceMatch = permission.resource === resource || permission.resource === '*'
      const actionMatch = permission.action === action || permission.action === '*'

      if (!resourceMatch || !actionMatch) {
        continue
      }

      // 检查是否过期
      if (permission.expiresAt < now) {
        continue
      }

      // 一次性权限：标记已使用并撤销
      if (permission.oneTime) {
        permission.usedCount = (permission.usedCount || 0) + 1
        this.permissions.delete(permission.id)
        this.expirationManager.remove(permission.id)
      }

      return true
    }

    return false
  }

  /**
   * 撤销临时权限
   * 
   * @param id - 权限ID
   * @returns 是否成功撤销
   */
  revokeTemporaryPermission(id: string): boolean {
    const removed = this.permissions.delete(id)
    if (removed) {
      this.expirationManager.remove(id)
    }
    return removed
  }

  /**
   * 获取用户的所有临时权限
   * 
   * @param userId - 用户ID
   * @returns 临时权限列表
   */
  getUserTemporaryPermissions(userId: string): TemporaryPermission[] {
    const now = new Date()
    const userPermissions: TemporaryPermission[] = []

    for (const permission of this.permissions.values()) {
      if (permission.userId === userId && permission.expiresAt >= now) {
        userPermissions.push(permission)
      }
    }

    return userPermissions
  }

  // ==================== 临时角色分配 ====================

  /**
   * 临时分配角色
   * 
   * @param userId - 用户ID
   * @param roleName - 角色名称
   * @param expiresAt - 过期时间
   * @param options - 可选项
   * @returns 分配ID
   */
  assignTemporaryRole(
    userId: string,
    roleName: string,
    expiresAt: Date,
    options: {
      assignedBy?: string
      metadata?: Record<string, any>
    } = {}
  ): string {
    const id = this.generateId('role')

    const assignment: TemporaryRoleAssignment = {
      id,
      userId,
      roleName,
      expiresAt,
      assignedAt: new Date(),
      assignedBy: options.assignedBy,
      metadata: options.metadata,
    }

    this.roleAssignments.set(id, assignment)

    // 添加到过期管理器
    this.expirationManager.add(id, expiresAt, {
      type: 'role-assignment',
      userId,
      roleName,
    })

    return id
  }

  /**
   * 检查临时角色
   * 
   * @param userId - 用户ID
   * @param roleName - 角色名称
   * @returns 是否拥有临时角色
   */
  hasTemporaryRole(userId: string, roleName: string): boolean {
    const now = new Date()

    for (const assignment of this.roleAssignments.values()) {
      if (assignment.userId === userId &&
        assignment.roleName === roleName &&
        assignment.expiresAt >= now) {
        return true
      }
    }

    return false
  }

  /**
   * 获取用户的临时角色
   * 
   * @param userId - 用户ID
   * @returns 临时角色列表
   */
  getUserTemporaryRoles(userId: string): string[] {
    const now = new Date()
    const roles: string[] = []

    for (const assignment of this.roleAssignments.values()) {
      if (assignment.userId === userId && assignment.expiresAt >= now) {
        roles.push(assignment.roleName)
      }
    }

    return roles
  }

  /**
   * 撤销临时角色分配
   * 
   * @param id - 分配ID
   * @returns 是否成功撤销
   */
  unassignTemporaryRole(id: string): boolean {
    const removed = this.roleAssignments.delete(id)
    if (removed) {
      this.expirationManager.remove(id)
    }
    return removed
  }

  // ==================== 工具方法 ====================

  /**
   * 清理所有过期项
   * 
   * @returns 清理的项数量
   */
  cleanup(): number {
    let count = 0
    const now = new Date()

    // 清理过期权限
    for (const [id, perm] of this.permissions.entries()) {
      if (perm.expiresAt < now) {
        this.permissions.delete(id)
        count++
      }
    }

    // 清理过期角色分配
    for (const [id, assignment] of this.roleAssignments.entries()) {
      if (assignment.expiresAt < now) {
        this.roleAssignments.delete(id)
        count++
      }
    }

    // 清理过期管理器
    count += this.expirationManager.cleanup()

    return count
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = new Date()

    // 统计临时权限
    let activePerms = 0
    let expiredPerms = 0
    let oneTimePerms = 0

    for (const perm of this.permissions.values()) {
      if (perm.expiresAt >= now) {
        activePerms++
        if (perm.oneTime) {
          oneTimePerms++
        }
      } else {
        expiredPerms++
      }
    }

    // 统计临时角色
    let activeRoles = 0
    let expiredRoles = 0

    for (const assignment of this.roleAssignments.values()) {
      if (assignment.expiresAt >= now) {
        activeRoles++
      } else {
        expiredRoles++
      }
    }

    return {
      permissions: {
        total: this.permissions.size,
        active: activePerms,
        expired: expiredPerms,
        oneTime: oneTimePerms,
      },
      roleAssignments: {
        total: this.roleAssignments.size,
        active: activeRoles,
        expired: expiredRoles,
      },
      expiration: this.expirationManager.getStats(),
    }
  }

  /**
   * 清空所有临时权限
   */
  clear(): void {
    this.permissions.clear()
    this.roleAssignments.clear()
    this.expirationManager.clear()
  }

  /**
   * 导出数据
   */
  export(): string {
    return JSON.stringify({
      permissions: Array.from(this.permissions.entries()),
      roleAssignments: Array.from(this.roleAssignments.entries()),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 导入数据
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    this.permissions = new Map(parsed.permissions || [])
    this.roleAssignments = new Map(parsed.roleAssignments || [])

    // 重新注册过期项
    for (const [id, perm] of this.permissions.entries()) {
      this.expirationManager.add(id, new Date(perm.expiresAt), {
        type: 'permission',
        userId: perm.userId,
      })
    }

    for (const [id, assignment] of this.roleAssignments.entries()) {
      this.expirationManager.add(id, new Date(assignment.expiresAt), {
        type: 'role-assignment',
        userId: assignment.userId,
      })
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.expirationManager.destroy()
    this.clear()
  }

  // ==================== 私有方法 ====================

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 设置清理回调
   */
  private setupCleanupCallbacks(): void {
    // 可以在这里设置过期通知回调
  }
}

