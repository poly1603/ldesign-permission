/**
 * @ldesign/permission - 权限存储
 * 
 * 负责权限数据的存储和持久化
 */

import type { Role, Permission, PermissionStorage } from '../../types'

/**
 * 权限存储数据结构
 */
interface PermissionStoreData {
  /** 角色集合 */
  roles: Map<string, Role>
  /** 用户-角色映射 */
  userRoles: Map<string, Set<string>>
  /** 角色-权限映射 */
  rolePermissions: Map<string, Set<string>>
  /** 版本号 */
  version: string
}

/**
 * 权限存储类
 * 
 * 提供内存存储和持久化接口
 */
export class PermissionStore {
  /** 角色存储 */
  private roles: Map<string, Role> = new Map()

  /** 用户-角色映射 */
  private userRoles: Map<string, Set<string>> = new Map()

  /** 角色-权限映射 */
  private rolePermissions: Map<string, Set<string>> = new Map()

  /** 持久化存储接口 */
  private storage?: PermissionStorage

  /** 存储键前缀 */
  private readonly storageKey: string = '@ldesign/permission'

  constructor(storage?: PermissionStorage) {
    this.storage = storage
  }

  // ==================== 角色管理 ====================

  /**
   * 添加角色
   */
  addRole(role: Role): void {
    this.roles.set(role.name, {
      ...role,
      createdAt: role.createdAt || new Date(),
      updatedAt: new Date(),
    })

    // 初始化角色权限集合
    if (!this.rolePermissions.has(role.name)) {
      this.rolePermissions.set(role.name, new Set(role.permissions || []))
    }
  }

  /**
   * 获取角色
   */
  getRole(name: string): Role | undefined {
    return this.roles.get(name)
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values())
  }

  /**
   * 删除角色
   */
  removeRole(name: string): boolean {
    const deleted = this.roles.delete(name)
    if (deleted) {
      this.rolePermissions.delete(name)

      // 从所有用户中移除该角色
      for (const [userId, roles] of this.userRoles.entries()) {
        if (roles.has(name)) {
          roles.delete(name)
          if (roles.size === 0) {
            this.userRoles.delete(userId)
          }
        }
      }
    }
    return deleted
  }

  /**
   * 更新角色
   */
  updateRole(name: string, updates: Partial<Role>): boolean {
    const role = this.roles.get(name)
    if (!role) {
      return false
    }

    this.roles.set(name, {
      ...role,
      ...updates,
      name, // 保持名称不变
      updatedAt: new Date(),
    })

    // 更新权限
    if (updates.permissions) {
      this.rolePermissions.set(name, new Set(updates.permissions))
    }

    return true
  }

  /**
   * 角色是否存在
   */
  hasRole(name: string): boolean {
    return this.roles.has(name)
  }

  // ==================== 用户-角色管理 ====================

  /**
   * 给用户分配角色
   */
  assignRoleToUser(userId: string, roleName: string): void {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set())
    }
    this.userRoles.get(userId)!.add(roleName)
  }

  /**
   * 从用户移除角色
   */
  removeRoleFromUser(userId: string, roleName: string): boolean {
    const roles = this.userRoles.get(userId)
    if (!roles) {
      return false
    }

    const deleted = roles.delete(roleName)
    if (roles.size === 0) {
      this.userRoles.delete(userId)
    }

    return deleted
  }

  /**
   * 获取用户的所有角色
   */
  getUserRoles(userId: string): string[] {
    const roles = this.userRoles.get(userId)
    return roles ? Array.from(roles) : []
  }

  /**
   * 用户是否拥有某个角色
   */
  userHasRole(userId: string, roleName: string): boolean {
    const roles = this.userRoles.get(userId)
    return roles ? roles.has(roleName) : false
  }

  /**
   * 获取拥有某个角色的所有用户
   */
  getUsersWithRole(roleName: string): string[] {
    const users: string[] = []
    for (const [userId, roles] of this.userRoles.entries()) {
      if (roles.has(roleName)) {
        users.push(userId)
      }
    }
    return users
  }

  // ==================== 角色-权限管理 ====================

  /**
   * 给角色授予权限
   */
  grantPermissionToRole(roleName: string, permission: string): void {
    if (!this.rolePermissions.has(roleName)) {
      this.rolePermissions.set(roleName, new Set())
    }
    this.rolePermissions.get(roleName)!.add(permission)

    // 同步更新角色对象
    const role = this.roles.get(roleName)
    if (role) {
      role.permissions = Array.from(this.rolePermissions.get(roleName)!)
      role.updatedAt = new Date()
    }
  }

  /**
   * 从角色撤销权限
   */
  revokePermissionFromRole(roleName: string, permission: string): boolean {
    const permissions = this.rolePermissions.get(roleName)
    if (!permissions) {
      return false
    }

    const deleted = permissions.delete(permission)

    // 同步更新角色对象
    const role = this.roles.get(roleName)
    if (role) {
      role.permissions = Array.from(permissions)
      role.updatedAt = new Date()
    }

    return deleted
  }

  /**
   * 获取角色的所有权限
   */
  getRolePermissions(roleName: string): string[] {
    const permissions = this.rolePermissions.get(roleName)
    return permissions ? Array.from(permissions) : []
  }

  /**
   * 角色是否拥有某个权限
   */
  roleHasPermission(roleName: string, permission: string): boolean {
    const permissions = this.rolePermissions.get(roleName)
    return permissions ? permissions.has(permission) : false
  }

  // ==================== 持久化 ====================

  /**
   * 保存到持久化存储
   */
  async save(): Promise<void> {
    if (!this.storage) {
      return
    }

    const data: PermissionStoreData = {
      roles: this.roles,
      userRoles: this.userRoles,
      rolePermissions: this.rolePermissions,
      version: '1.0.0',
    }

    // 转换为可序列化对象
    const serializable = {
      roles: Array.from(this.roles.entries()),
      userRoles: Array.from(this.userRoles.entries()).map(([userId, roles]) => [
        userId,
        Array.from(roles),
      ]),
      rolePermissions: Array.from(this.rolePermissions.entries()).map(
        ([role, perms]) => [role, Array.from(perms)]
      ),
      version: data.version,
    }

    await this.storage.save(this.storageKey, serializable)
  }

  /**
   * 从持久化存储加载
   */
  async load(): Promise<void> {
    if (!this.storage) {
      return
    }

    const data = await this.storage.load(this.storageKey)
    if (!data) {
      return
    }

    // 反序列化
    this.roles = new Map(data.roles)
    this.userRoles = new Map(
      data.userRoles.map(([userId, roles]: [string, string[]]) => [
        userId,
        new Set(roles),
      ])
    )
    this.rolePermissions = new Map(
      data.rolePermissions.map(([role, perms]: [string, string[]]) => [
        role,
        new Set(perms),
      ])
    )
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.roles.clear()
    this.userRoles.clear()
    this.rolePermissions.clear()

    if (this.storage) {
      await this.storage.remove(this.storageKey)
    }
  }

  /**
   * 导出数据（用于备份）
   */
  export(): string {
    return JSON.stringify({
      roles: Array.from(this.roles.entries()),
      userRoles: Array.from(this.userRoles.entries()).map(([userId, roles]) => [
        userId,
        Array.from(roles),
      ]),
      rolePermissions: Array.from(this.rolePermissions.entries()).map(
        ([role, perms]) => [role, Array.from(perms)]
      ),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 导入数据（用于恢复）
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    this.roles = new Map(parsed.roles)
    this.userRoles = new Map(
      parsed.userRoles.map(([userId, roles]: [string, string[]]) => [
        userId,
        new Set(roles),
      ])
    )
    this.rolePermissions = new Map(
      parsed.rolePermissions.map(([role, perms]: [string, string[]]) => [
        role,
        new Set(perms),
      ])
    )
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRoles: this.roles.size,
      totalUsers: this.userRoles.size,
      totalRolePermissions: Array.from(this.rolePermissions.values()).reduce(
        (sum, perms) => sum + perms.size,
        0
      ),
    }
  }
}



