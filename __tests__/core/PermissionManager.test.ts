/**
 * @ldesign/permission - PermissionManager 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createPermissionManager } from '../../src/core/PermissionManager'

describe('PermissionManager', () => {
  let pm: ReturnType<typeof createPermissionManager>

  beforeEach(() => {
    pm = createPermissionManager()
  })

  describe('RBAC 功能', () => {
    it('应该能够创建角色', () => {
      const role = pm.createRole('admin', {
        displayName: '管理员',
        description: '系统管理员',
      })

      expect(role.name).toBe('admin')
      expect(role.displayName).toBe('管理员')
      expect(role.description).toBe('系统管理员')
    })

    it('应该能够授予权限', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')

      const permissions = pm.getRolePermissions('admin')
      expect(permissions).toContain('users:read')
    })

    it('应该能够分配角色给用户', () => {
      pm.createRole('admin')
      pm.assignRole('user123', 'admin')

      expect(pm.hasRole('user123', 'admin')).toBe(true)
    })

    it('应该能够检查权限', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      const result = pm.check('user123', 'users', 'read')
      expect(result.allowed).toBe(true)
    })

    it('应该支持通配符权限', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', '*')
      pm.assignRole('user123', 'admin')

      expect(pm.check('user123', 'users', 'read').allowed).toBe(true)
      expect(pm.check('user123', 'users', 'write').allowed).toBe(true)
      expect(pm.check('user123', 'users', 'delete').allowed).toBe(true)
    })

    it('应该拒绝未授权的访问', () => {
      pm.createRole('user')
      pm.grantPermission('user', 'posts', 'read')
      pm.assignRole('user456', 'user')

      const result = pm.check('user456', 'users', 'read')
      expect(result.allowed).toBe(false)
    })

    it('应该支持角色继承', () => {
      pm.createRole('user')
      pm.grantPermission('user', 'posts', 'read')

      pm.createRole('admin', { inherits: ['user'] })
      pm.grantPermission('admin', 'users', '*')
      pm.assignRole('user123', 'admin')

      // 继承的权限
      expect(pm.check('user123', 'posts', 'read').allowed).toBe(true)
      // 自己的权限
      expect(pm.check('user123', 'users', 'write').allowed).toBe(true)
    })
  })

  describe('ABAC 功能', () => {
    it('应该能够定义能力规则', () => {
      pm.defineAbility([
        {
          action: 'update',
          subject: 'Post',
          conditions: {
            field: 'authorId',
            operator: 'eq',
            value: 'user123',
          },
        },
      ])

      const rules = pm.getAllAbilityRules()
      expect(rules).toHaveLength(1)
      expect(rules[0].action).toBe('update')
    })

    it('应该能够检查基于属性的权限', () => {
      pm.defineAbility([
        {
          action: 'update',
          subject: 'Post',
          conditions: {
            field: 'authorId',
            operator: 'eq',
            value: 'user123',
          },
        },
      ])

      const post1 = { type: 'Post', authorId: 'user123' }
      const post2 = { type: 'Post', authorId: 'user456' }

      expect(pm.can('update', post1)).toBe(true)
      expect(pm.can('update', post2)).toBe(false)
    })

    it('应该支持复杂条件', () => {
      pm.defineAbility([
        {
          action: 'delete',
          subject: 'Post',
          conditions: {
            operator: 'and',
            conditions: [
              { field: 'authorId', operator: 'eq', value: 'user123' },
              { field: 'status', operator: 'eq', value: 'draft' },
            ],
          },
        },
      ])

      const draftPost = { type: 'Post', authorId: 'user123', status: 'draft' }
      const publishedPost = { type: 'Post', authorId: 'user123', status: 'published' }

      expect(pm.can('delete', draftPost)).toBe(true)
      expect(pm.can('delete', publishedPost)).toBe(false)
    })
  })

  describe('批量操作', () => {
    beforeEach(() => {
      pm.createRole('editor')
      pm.grantPermission('editor', 'posts', 'read')
      pm.grantPermission('editor', 'posts', 'write')
      pm.assignRole('user123', 'editor')
    })

    it('应该能够批量检查权限', () => {
      const results = pm.checkMultiple('user123', [
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'write' },
        { resource: 'posts', action: 'delete' },
      ])

      expect(results[0].allowed).toBe(true)
      expect(results[1].allowed).toBe(true)
      expect(results[2].allowed).toBe(false)
    })

    it('应该能够检查任意权限', () => {
      const hasAny = pm.checkAny('user123', [
        { resource: 'posts', action: 'read' },
        { resource: 'users', action: 'read' },
      ])

      expect(hasAny).toBe(true)
    })

    it('应该能够检查所有权限', () => {
      const hasAll = pm.checkAll('user123', [
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'write' },
      ])

      expect(hasAll).toBe(true)

      const hasAll2 = pm.checkAll('user123', [
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'delete' },
      ])

      expect(hasAll2).toBe(false)
    })
  })

  describe('策略引擎', () => {
    it('应该能够添加策略', () => {
      pm.addPolicy({
        id: 'policy-1',
        name: '测试策略',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            subjects: ['admin'],
            resources: ['users'],
            actions: ['read'],
          },
        ],
      })

      const policy = pm.getPolicy('policy-1')
      expect(policy).toBeDefined()
      expect(policy?.name).toBe('测试策略')
    })

    it('应该能够评估策略', () => {
      pm.createRole('admin')
      pm.assignRole('user123', 'admin')

      pm.addPolicy({
        id: 'policy-1',
        name: '管理员策略',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            subjects: ['admin'],
            resources: ['sensitive-data'],
            actions: ['read'],
          },
        ],
      })

      const result = pm.check('user123', 'sensitive-data', 'read')
      expect(result.allowed).toBe(true)
    })
  })

  describe('导入/导出', () => {
    it('应该能够导出权限数据', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      const exported = pm.export()
      expect(exported).toBeTruthy()
      expect(typeof exported).toBe('string')
    })

    it('应该能够导入权限数据', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      const exported = pm.export()

      const pm2 = createPermissionManager()
      pm2.import(exported)

      expect(pm2.hasRole('user123', 'admin')).toBe(true)
      expect(pm2.check('user123', 'users', 'read').allowed).toBe(true)
    })
  })

  describe('性能', () => {
    it('权限检查应该在0.5ms内完成', () => {
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      const result = pm.check('user123', 'users', 'read')

      expect(result.duration).toBeDefined()
      expect(result.duration!).toBeLessThan(0.5)
    })
  })

  describe('统计信息', () => {
    it('应该能够获取统计信息', () => {
      pm.createRole('admin')
      pm.createRole('user')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      const stats = pm.getStats()

      expect(stats.rbac.store.totalRoles).toBe(2)
      expect(stats.rbac.store.totalUsers).toBe(1)
    })
  })
})



