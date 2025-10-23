/**
 * @ldesign/permission - 权限管理系统
 */

export interface Permission {
  resource: string
  action: string
}

export class PermissionManager {
  private permissions: Set<string> = new Set()

  addPermission(resource: string, action: string) {
    this.permissions.add(`${resource}:${action}`)
  }

  hasPermission(resource: string, action: string): boolean {
    return this.permissions.has(`${resource}:${action}`) || this.permissions.has(`${resource}:*`)
  }

  checkPermission(permission: Permission): boolean {
    return this.hasPermission(permission.resource, permission.action)
  }
}

export function createPermissionManager() {
  return new PermissionManager()
}



