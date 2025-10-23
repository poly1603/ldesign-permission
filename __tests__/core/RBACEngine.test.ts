/**
 * @ldesign/permission - RBACEngine 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RBACEngine } from '../../src/core/rbac/RBACEngine'

describe('RBACEngine', () => {
  let rbac: RBACEngine

  beforeEach(() => {
    rbac = new RBACEngine()
  })

  describe('角色管理', () => {
    it('应该能够创建角色', () => {
      const role = rbac.createRole('admin')
      expect(role.name).toBe('admin')
      expect(rbac.hasRole('admin')).toBe(true)
    })

    it('应该能够获取角色', () => {
      rbac.createRole('admin', { displayName: '管理员' })
      const role = rbac.getRole('admin')

      expect(role).toBeDefined()
      expect(role?.displayName).toBe('管理员')
    })

    it('应该能够删除角色', () => {
      rbac.createRole('admin')
      expect(rbac.hasRole('admin')).toBe(true)

      rbac.deleteRole('admin')
      expect(rbac.hasRole('admin')).toBe(false)
    })

    it('不应该创建重复的角色', () => {
      rbac.createRole('admin')
      expect(() => rbac.createRole('admin')).toThrow()
    })
  })

  describe('用户-角色', () => {
    beforeEach(() => {
      rbac.createRole('admin')
      rbac.createRole('user')
    })

    it('应该能够分配角色', () => {
      rbac.assignRole('user123', 'admin')
      expect(rbac.userHasRole('user123', 'admin')).toBe(true)
    })

    it('应该能够移除角色', () => {
      rbac.assignRole('user123', 'admin')
      rbac.unassignRole('user123', 'admin')
      expect(rbac.userHasRole('user123', 'admin')).toBe(false)
    })

    it('应该能够获取用户角色', () => {
      rbac.assignRole('user123', 'admin')
      rbac.assignRole('user123', 'user')

      const roles = rbac.getUserRoles('user123')
      expect(roles).toContain('admin')
      expect(roles).toContain('user')
      expect(roles).toHaveLength(2)
    })
  })

  describe('角色-权限', () => {
    beforeEach(() => {
      rbac.createRole('admin')
    })

    it('应该能够授予权限', () => {
      rbac.grantPermission('admin', 'users', 'read')
      const permissions = rbac.getRolePermissions('admin')
      expect(permissions).toContain('users:read')
    })

    it('应该能够撤销权限', () => {
      rbac.grantPermission('admin', 'users', 'read')
      rbac.revokePermission('admin', 'users', 'read')
      const permissions = rbac.getRolePermissions('admin')
      expect(permissions).not.toContain('users:read')
    })

    it('应该支持通配符权限', () => {
      rbac.grantPermission('admin', 'users', '*')
      expect(rbac.roleHasPermission('admin', 'users', 'read')).toBe(true)
      expect(rbac.roleHasPermission('admin', 'users', 'write')).toBe(true)
      expect(rbac.roleHasPermission('admin', 'users', 'delete')).toBe(true)
    })
  })

  describe('权限检查', () => {
    beforeEach(() => {
      rbac.createRole('admin')
      rbac.grantPermission('admin', 'users', 'read')
      rbac.grantPermission('admin', 'posts', '*')
      rbac.assignRole('user123', 'admin')
    })

    it('应该正确检查权限', () => {
      const result = rbac.check('user123', 'users', 'read')
      expect(result.allowed).toBe(true)
      expect(result.matchedRole).toBe('admin')
    })

    it('应该拒绝未授权的权限', () => {
      const result = rbac.check('user123', 'users', 'write')
      expect(result.allowed).toBe(false)
    })

    it('应该支持通配符匹配', () => {
      expect(rbac.check('user123', 'posts', 'read').allowed).toBe(true)
      expect(rbac.check('user123', 'posts', 'write').allowed).toBe(true)
      expect(rbac.check('user123', 'posts', 'delete').allowed).toBe(true)
    })

    it('应该返回检查耗时', () => {
      const result = rbac.check('user123', 'users', 'read')
      expect(result.duration).toBeDefined()
      expect(result.duration).toBeGreaterThan(0)
    })
  })

  describe('角色继承', () => {
    it('应该支持角色继承', () => {
      rbac.createRole('user')
      rbac.grantPermission('user', 'posts', 'read')

      rbac.createRole('editor', { inherits: ['user'] })
      rbac.grantPermission('editor', 'posts', 'write')

      rbac.assignRole('user123', 'editor')

      // 继承的权限
      expect(rbac.check('user123', 'posts', 'read').allowed).toBe(true)
      // 自己的权限
      expect(rbac.check('user123', 'posts', 'write').allowed).toBe(true)
    })

    it('应该支持多级继承', () => {
      rbac.createRole('user')
      rbac.grantPermission('user', 'posts', 'read')

      rbac.createRole('editor', { inherits: ['user'] })
      rbac.grantPermission('editor', 'posts', 'write')

      rbac.createRole('admin', { inherits: ['editor'] })
      rbac.grantPermission('admin', 'users', '*')

      rbac.assignRole('user123', 'admin')

      expect(rbac.check('user123', 'posts', 'read').allowed).toBe(true)
      expect(rbac.check('user123', 'posts', 'write').allowed).toBe(true)
      expect(rbac.check('user123', 'users', 'delete').allowed).toBe(true)
    })

    it('应该检测循环继承', () => {
      rbac.createRole('role1')
      rbac.createRole('role2', { inherits: ['role1'] })

      expect(() => {
        rbac.updateRole('role1', { inherits: ['role2'] })
      }).toThrow()
    })
  })

  describe('批量操作', () => {
    beforeEach(() => {
      rbac.createRole('editor')
      rbac.grantPermission('editor', 'posts', 'read')
      rbac.grantPermission('editor', 'posts', 'write')
      rbac.assignRole('user123', 'editor')
    })

    it('应该支持批量检查', () => {
      const results = rbac.checkMultiple('user123', [
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'write' },
        { resource: 'posts', action: 'delete' },
      ])

      expect(results[0].allowed).toBe(true)
      expect(results[1].allowed).toBe(true)
      expect(results[2].allowed).toBe(false)
    })

    it('应该支持checkAny', () => {
      expect(
        rbac.checkAny('user123', [
          { resource: 'posts', action: 'read' },
          { resource: 'users', action: 'read' },
        ])
      ).toBe(true)
    })

    it('应该支持checkAll', () => {
      expect(
        rbac.checkAll('user123', [
          { resource: 'posts', action: 'read' },
          { resource: 'posts', action: 'write' },
        ])
      ).toBe(true)

      expect(
        rbac.checkAll('user123', [
          { resource: 'posts', action: 'read' },
          { resource: 'posts', action: 'delete' },
        ])
      ).toBe(false)
    })
  })
})



