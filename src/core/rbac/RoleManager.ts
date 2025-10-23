/**
 * @ldesign/permission - 角色管理器
 * 
 * 负责角色继承、层级管理和权限合并
 */

import type { Role, RoleHierarchyNode, RBACConfig } from '../../types'
import { PermissionError, PermissionErrorType } from '../../types'

/**
 * 角色管理器类
 * 
 * 处理角色继承和层级关系
 */
export class RoleManager {
  /** 角色继承图（邻接表） */
  private inheritanceGraph: Map<string, Set<string>> = new Map()

  /** 角色层级缓存 */
  private hierarchyCache: Map<string, RoleHierarchyNode> = new Map()

  /** 配置 */
  private config: Required<RBACConfig>

  constructor(config: RBACConfig = {}) {
    this.config = {
      enableInheritance: config.enableInheritance ?? true,
      maxInheritanceDepth: config.maxInheritanceDepth ?? 10,
      detectCircular: config.detectCircular ?? true,
      cacheHierarchy: config.cacheHierarchy ?? true,
    }
  }

  // ==================== 角色继承管理 ====================

  /**
   * 设置角色继承关系
   * @param childRole 子角色
   * @param parentRoles 父角色列表
   */
  setInheritance(childRole: string, parentRoles: string[]): void {
    if (!this.config.enableInheritance) {
      throw new PermissionError(
        PermissionErrorType.INVALID_CONFIG,
        'Role inheritance is disabled'
      )
    }

    // 检测循环继承
    if (this.config.detectCircular) {
      for (const parent of parentRoles) {
        if (this.wouldCreateCycle(childRole, parent)) {
          throw new PermissionError(
            PermissionErrorType.CIRCULAR_INHERITANCE,
            `Setting ${parent} as parent of ${childRole} would create a circular inheritance`
          )
        }
      }
    }

    // 设置继承关系
    this.inheritanceGraph.set(childRole, new Set(parentRoles))

    // 清除缓存
    if (this.config.cacheHierarchy) {
      this.hierarchyCache.clear()
    }
  }

  /**
   * 添加父角色
   */
  addParent(childRole: string, parentRole: string): void {
    if (!this.config.enableInheritance) {
      return
    }

    // 检测循环继承
    if (this.config.detectCircular && this.wouldCreateCycle(childRole, parentRole)) {
      throw new PermissionError(
        PermissionErrorType.CIRCULAR_INHERITANCE,
        `Adding ${parentRole} as parent of ${childRole} would create a circular inheritance`
      )
    }

    if (!this.inheritanceGraph.has(childRole)) {
      this.inheritanceGraph.set(childRole, new Set())
    }

    this.inheritanceGraph.get(childRole)!.add(parentRole)

    // 清除缓存
    if (this.config.cacheHierarchy) {
      this.hierarchyCache.clear()
    }
  }

  /**
   * 移除父角色
   */
  removeParent(childRole: string, parentRole: string): boolean {
    const parents = this.inheritanceGraph.get(childRole)
    if (!parents) {
      return false
    }

    const deleted = parents.delete(parentRole)

    if (deleted && this.config.cacheHierarchy) {
      this.hierarchyCache.clear()
    }

    return deleted
  }

  /**
   * 获取直接父角色
   */
  getParents(role: string): string[] {
    const parents = this.inheritanceGraph.get(role)
    return parents ? Array.from(parents) : []
  }

  /**
   * 获取所有祖先角色（包括间接父角色）
   */
  getAncestors(role: string): string[] {
    const ancestors = new Set<string>()
    const visited = new Set<string>()
    const queue: string[] = [role]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      const parents = this.inheritanceGraph.get(current)
      if (parents) {
        for (const parent of parents) {
          ancestors.add(parent)
          queue.push(parent)
        }
      }
    }

    return Array.from(ancestors)
  }

  /**
   * 获取直接子角色
   */
  getChildren(role: string): string[] {
    const children: string[] = []

    for (const [child, parents] of this.inheritanceGraph.entries()) {
      if (parents.has(role)) {
        children.push(child)
      }
    }

    return children
  }

  /**
   * 获取所有后代角色（包括间接子角色）
   */
  getDescendants(role: string): string[] {
    const descendants = new Set<string>()
    const visited = new Set<string>()
    const queue: string[] = [role]

    while (queue.length > 0) {
      const current = queue.shift()!

      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      const children = this.getChildren(current)
      for (const child of children) {
        descendants.add(child)
        queue.push(child)
      }
    }

    return Array.from(descendants)
  }

  /**
   * 检查是否存在继承关系
   */
  inheritsFrom(child: string, parent: string): boolean {
    const ancestors = this.getAncestors(child)
    return ancestors.includes(parent)
  }

  // ==================== 权限合并 ====================

  /**
   * 合并角色的所有权限（包括继承的）
   */
  mergePermissions(role: Role, allRoles: Map<string, Role>): Set<string> {
    if (!this.config.enableInheritance) {
      return new Set(role.permissions)
    }

    const merged = new Set<string>(role.permissions)
    const ancestors = this.getAncestors(role.name)

    for (const ancestorName of ancestors) {
      const ancestorRole = allRoles.get(ancestorName)
      if (ancestorRole) {
        for (const perm of ancestorRole.permissions) {
          merged.add(perm)
        }
      }
    }

    return merged
  }

  /**
   * 获取角色的层级深度
   */
  getDepth(role: string): number {
    const ancestors = this.getAncestors(role)
    return ancestors.length
  }

  /**
   * 构建角色层级树
   */
  buildHierarchyTree(roles: Map<string, Role>): Map<string, RoleHierarchyNode> {
    const tree = new Map<string, RoleHierarchyNode>()

    for (const [roleName, role] of roles.entries()) {
      const node: RoleHierarchyNode = {
        name: roleName,
        role,
        children: [],
        depth: this.getDepth(roleName),
        inheritedPermissions: this.mergePermissions(role, roles),
      }

      tree.set(roleName, node)
    }

    // 建立父子关系
    for (const [roleName, node] of tree.entries()) {
      const children = this.getChildren(roleName)
      node.children = children.map(child => tree.get(child)!).filter(Boolean)

      const parents = this.getParents(roleName)
      if (parents.length > 0) {
        node.parent = tree.get(parents[0])
      }
    }

    return tree
  }

  // ==================== 循环检测 ====================

  /**
   * 检查添加继承关系是否会创建循环
   */
  private wouldCreateCycle(child: string, parent: string): boolean {
    // 如果子角色已经是父角色的祖先，则会创建循环
    return this.inheritsFrom(parent, child)
  }

  /**
   * 检测当前继承图中是否存在循环
   */
  detectCycles(): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (node: string, path: string[]): void => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const parents = this.inheritanceGraph.get(node)
      if (parents) {
        for (const parent of parents) {
          if (!visited.has(parent)) {
            dfs(parent, [...path])
          } else if (recursionStack.has(parent)) {
            // 发现循环
            const cycleStart = path.indexOf(parent)
            cycles.push([...path.slice(cycleStart), parent])
          }
        }
      }

      recursionStack.delete(node)
    }

    for (const node of this.inheritanceGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  // ==================== 工具方法 ====================

  /**
   * 获取继承图的统计信息
   */
  getStats() {
    const totalRoles = this.inheritanceGraph.size
    const totalInheritanceLinks = Array.from(this.inheritanceGraph.values()).reduce(
      (sum, parents) => sum + parents.size,
      0
    )

    const depths = Array.from(this.inheritanceGraph.keys()).map(role =>
      this.getDepth(role)
    )

    return {
      totalRoles,
      totalInheritanceLinks,
      maxDepth: depths.length > 0 ? Math.max(...depths) : 0,
      avgDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
    }
  }

  /**
   * 清空继承图
   */
  clear(): void {
    this.inheritanceGraph.clear()
    this.hierarchyCache.clear()
  }

  /**
   * 导出继承图
   */
  export(): string {
    return JSON.stringify({
      inheritanceGraph: Array.from(this.inheritanceGraph.entries()).map(
        ([child, parents]) => [child, Array.from(parents)]
      ),
      version: '1.0.0',
    })
  }

  /**
   * 导入继承图
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    this.inheritanceGraph = new Map(
      parsed.inheritanceGraph.map(([child, parents]: [string, string[]]) => [
        child,
        new Set(parents),
      ])
    )

    this.hierarchyCache.clear()
  }
}



