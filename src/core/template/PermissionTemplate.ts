/**
 * @ldesign/permission - 权限模板
 * 
 * 提供预定义的权限模板，快速创建常见角色
 */

import type { Role, RoleOptions } from '../../types/core'

/**
 * 权限模板定义
 */
export interface Template {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description?: string
  /** 角色列表 */
  roles: Array<{
    name: string
    displayName?: string
    description?: string
    permissions: string[] // resource:action 格式
    inherits?: string[]
  }>
  /** 版本 */
  version?: string
  /** 标签 */
  tags?: string[]
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 内置模板
 */
const BUILTIN_TEMPLATES: Template[] = [
  // 基础 CRUD 模板
  {
    id: 'basic-crud',
    name: '基础 CRUD 权限',
    description: '包含创建、读取、更新、删除的基础角色',
    roles: [
      {
        name: 'viewer',
        displayName: '查看者',
        description: '只能查看数据',
        permissions: ['*:read'],
      },
      {
        name: 'editor',
        displayName: '编辑者',
        description: '可以查看和编辑数据',
        permissions: ['*:read', '*:create', '*:update'],
        inherits: ['viewer'],
      },
      {
        name: 'admin',
        displayName: '管理员',
        description: '拥有所有权限',
        permissions: ['*:*'],
        inherits: ['editor'],
      },
    ],
    tags: ['basic', 'crud'],
  },

  // 内容管理模板
  {
    id: 'content-management',
    name: '内容管理权限',
    description: '适用于内容管理系统的角色',
    roles: [
      {
        name: 'reader',
        displayName: '读者',
        permissions: ['posts:read', 'comments:read'],
      },
      {
        name: 'author',
        displayName: '作者',
        description: '可以创建和编辑自己的内容',
        permissions: ['posts:create', 'posts:update', 'comments:create'],
        inherits: ['reader'],
      },
      {
        name: 'moderator',
        displayName: '版主',
        description: '可以审核内容',
        permissions: ['posts:delete', 'comments:delete', 'comments:moderate'],
        inherits: ['author'],
      },
      {
        name: 'content-admin',
        displayName: '内容管理员',
        permissions: ['posts:*', 'comments:*', 'categories:*'],
        inherits: ['moderator'],
      },
    ],
    tags: ['content', 'cms'],
  },

  // 用户管理模板
  {
    id: 'user-management',
    name: '用户管理权限',
    description: '适用于用户管理系统的角色',
    roles: [
      {
        name: 'user',
        displayName: '普通用户',
        permissions: ['profile:read', 'profile:update'],
      },
      {
        name: 'user-manager',
        displayName: '用户管理员',
        permissions: ['users:read', 'users:create', 'users:update'],
        inherits: ['user'],
      },
      {
        name: 'super-admin',
        displayName: '超级管理员',
        permissions: ['users:*', 'roles:*', 'permissions:*'],
        inherits: ['user-manager'],
      },
    ],
    tags: ['user', 'management'],
  },
]

/**
 * 权限模板管理器类
 * 
 * 功能：
 * - 管理预定义模板
 * - 创建自定义模板
 * - 应用模板到权限系统
 * - 模板继承和组合
 * 
 * @example
 * ```typescript
 * const templateMgr = new PermissionTemplateManager()
 * 
 * // 应用内置模板
 * const template = templateMgr.getTemplate('basic-crud')
 * templateMgr.apply(template, pm)
 * 
 * // 创建自定义模板
 * templateMgr.addTemplate({
 *   id: 'my-template',
 *   name: '我的模板',
 *   roles: [...]
 * })
 * ```
 */
export class PermissionTemplateManager {
  /** 模板存储 */
  private templates = new Map<string, Template>()

  constructor() {
    // 加载内置模板
    for (const template of BUILTIN_TEMPLATES) {
      this.templates.set(template.id, template)
    }
  }

  /**
   * 获取模板
   * 
   * @param id - 模板ID
   * @returns 模板对象，不存在则返回 undefined
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id)
  }

  /**
   * 获取所有模板
   * 
   * @returns 模板列表
   */
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values())
  }

  /**
   * 根据标签查找模板
   * 
   * @param tag - 标签
   * @returns 匹配的模板列表
   */
  getTemplatesByTag(tag: string): Template[] {
    return this.getAllTemplates().filter(template =>
      template.tags?.includes(tag)
    )
  }

  /**
   * 添加自定义模板
   * 
   * @param template - 模板定义
   */
  addTemplate(template: Template): void {
    if (this.templates.has(template.id)) {
      throw new Error(`模板 "${template.id}" 已存在`)
    }

    this.templates.set(template.id, template)
  }

  /**
   * 更新模板
   * 
   * @param id - 模板ID
   * @param updates - 更新内容
   * @returns 是否成功更新
   */
  updateTemplate(id: string, updates: Partial<Template>): boolean {
    const template = this.templates.get(id)
    if (!template) {
      return false
    }

    this.templates.set(id, {
      ...template,
      ...updates,
      id, // 保持ID不变
    })

    return true
  }

  /**
   * 删除模板
   * 
   * @param id - 模板ID
   * @returns 是否成功删除
   */
  deleteTemplate(id: string): boolean {
    return this.templates.delete(id)
  }

  /**
   * 应用模板
   * 
   * 将模板中定义的所有角色和权限应用到权限系统
   * 
   * @param template - 模板对象或模板ID
   * @param permissionManager - 权限管理器实例
   * @param options - 应用选项
   * @param options.skipExisting - 是否跳过已存在的角色
   * @param options.merge - 是否合并到现有角色（而非覆盖）
   */
  apply(
    template: Template | string,
    permissionManager: any,
    options: {
      skipExisting?: boolean
      merge?: boolean
    } = {}
  ): void {
    const tmpl = typeof template === 'string'
      ? this.getTemplate(template)
      : template

    if (!tmpl) {
      throw new Error(`模板不存在: ${template}`)
    }

    const { skipExisting = true, merge = false } = options

    // 应用角色
    for (const roleData of tmpl.roles) {
      const existingRole = permissionManager.getRole(roleData.name)

      if (existingRole && skipExisting) {
        continue
      }

      if (!existingRole) {
        // 创建新角色
        permissionManager.createRole(roleData.name, {
          displayName: roleData.displayName,
          description: roleData.description,
          inherits: roleData.inherits,
        })
      }

      // 授予权限
      for (const permission of roleData.permissions) {
        const [resource, action] = permission.split(':')

        if (!merge || !existingRole) {
          // 直接授予
          permissionManager.grantPermission(roleData.name, resource, action)
        } else {
          // 检查是否已有权限
          const hasPermission = permissionManager.getRolePermissions(roleData.name)
            .includes(permission)

          if (!hasPermission) {
            permissionManager.grantPermission(roleData.name, resource, action)
          }
        }
      }
    }
  }

  /**
   * 从权限系统导出为模板
   * 
   * @param permissionManager - 权限管理器实例
   * @param templateId - 模板ID
   * @param templateName - 模板名称
   * @param roleNames - 要导出的角色名称列表（不指定则导出所有）
   * @returns 导出的模板
   */
  exportFromSystem(
    permissionManager: any,
    templateId: string,
    templateName: string,
    roleNames?: string[]
  ): Template {
    const allRoles = permissionManager.getAllRoles()
    const rolesToExport = roleNames
      ? allRoles.filter((role: any) => roleNames.includes(role.name))
      : allRoles

    const template: Template = {
      id: templateId,
      name: templateName,
      description: `从权限系统导出的模板`,
      roles: rolesToExport.map((role: any) => ({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions || [],
        inherits: role.inherits,
      })),
      version: '1.0.0',
    }

    return template
  }

  /**
   * 导出所有模板
   * 
   * @returns JSON 格式的模板数据
   */
  export(): string {
    return JSON.stringify({
      templates: Array.from(this.templates.entries()),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 导入模板
   * 
   * @param data - JSON 格式的模板数据
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    for (const [id, template] of parsed.templates) {
      this.templates.set(id, template)
    }
  }

  /**
   * 清空自定义模板（保留内置模板）
   */
  clearCustomTemplates(): void {
    const builtinIds = BUILTIN_TEMPLATES.map(t => t.id)

    for (const id of this.templates.keys()) {
      if (!builtinIds.includes(id)) {
        this.templates.delete(id)
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const builtin = BUILTIN_TEMPLATES.length
    const custom = this.templates.size - builtin

    return {
      total: this.templates.size,
      builtin,
      custom,
    }
  }
}

/**
 * 获取内置模板列表
 * 
 * @returns 内置模板数组
 */
export function getBuiltinTemplates(): Template[] {
  return [...BUILTIN_TEMPLATES]
}

/**
 * 创建权限模板管理器实例
 * 
 * @returns 模板管理器实例
 */
export function createTemplateManager(): PermissionTemplateManager {
  return new PermissionTemplateManager()
}

