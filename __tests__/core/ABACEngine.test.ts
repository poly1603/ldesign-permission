/**
 * @ldesign/permission - ABACEngine 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ABACEngine } from '../../src/core/abac/ABACEngine'

describe('ABACEngine', () => {
  let abac: ABACEngine

  beforeEach(() => {
    abac = new ABACEngine()
  })

  describe('规则管理', () => {
    it('应该能够添加规则', () => {
      abac.addRule({
        action: 'read',
        subject: 'Post',
      })

      expect(abac.getAllRules()).toHaveLength(1)
    })

    it('应该能够移除规则', () => {
      abac.addRule({
        id: 'rule-1',
        action: 'read',
        subject: 'Post',
      })

      abac.removeRule('rule-1')
      expect(abac.getAllRules()).toHaveLength(0)
    })

    it('应该能够批量添加规则', () => {
      abac.addRules([
        { action: 'read', subject: 'Post' },
        { action: 'write', subject: 'Post' },
      ])

      expect(abac.getAllRules()).toHaveLength(2)
    })
  })

  describe('权限检查', () => {
    it('应该能够检查简单权限', () => {
      abac.addRule({
        action: 'read',
        subject: 'Post',
      })

      expect(abac.can('read', { type: 'Post' })).toBe(true)
      expect(abac.can('write', { type: 'Post' })).toBe(false)
    })

    it('应该支持通配符', () => {
      abac.addRule({
        action: '*',
        subject: 'Post',
      })

      expect(abac.can('read', { type: 'Post' })).toBe(true)
      expect(abac.can('write', { type: 'Post' })).toBe(true)
      expect(abac.can('delete', { type: 'Post' })).toBe(true)
    })
  })

  describe('条件权限', () => {
    it('应该支持简单条件', () => {
      abac.addRule({
        action: 'update',
        subject: 'Post',
        conditions: {
          field: 'authorId',
          operator: 'eq',
          value: 'user123',
        },
      })

      const context = {
        subject: { authorId: 'user123' },
      }

      expect(abac.can('update', { type: 'Post', authorId: 'user123' }, context)).toBe(true)
      expect(abac.can('update', { type: 'Post', authorId: 'user456' }, context)).toBe(false)
    })

    it('应该支持AND条件', () => {
      abac.addRule({
        action: 'delete',
        subject: 'Post',
        conditions: {
          operator: 'and',
          conditions: [
            { field: 'authorId', operator: 'eq', value: 'user123' },
            { field: 'status', operator: 'eq', value: 'draft' },
          ],
        },
      })

      const context1 = {
        subject: { authorId: 'user123', status: 'draft' },
      }

      const context2 = {
        subject: { authorId: 'user123', status: 'published' },
      }

      expect(abac.can('delete', { type: 'Post' }, context1)).toBe(true)
      expect(abac.can('delete', { type: 'Post' }, context2)).toBe(false)
    })

    it('应该支持OR条件', () => {
      abac.addRule({
        action: 'read',
        subject: 'Post',
        conditions: {
          operator: 'or',
          conditions: [
            { field: 'public', operator: 'eq', value: true },
            { field: 'authorId', operator: 'eq', value: 'user123' },
          ],
        },
      })

      const context1 = {
        subject: { public: true, authorId: 'user456' },
      }

      const context2 = {
        subject: { public: false, authorId: 'user123' },
      }

      const context3 = {
        subject: { public: false, authorId: 'user456' },
      }

      expect(abac.can('read', { type: 'Post' }, context1)).toBe(true)
      expect(abac.can('read', { type: 'Post' }, context2)).toBe(true)
      expect(abac.can('read', { type: 'Post' }, context3)).toBe(false)
    })
  })

  describe('比较运算符', () => {
    beforeEach(() => {
      abac.addRule({
        action: 'access',
        subject: 'Resource',
        conditions: {
          field: 'age',
          operator: 'gte',
          value: 18,
        },
      })
    })

    it('应该支持大于等于', () => {
      expect(abac.can('access', { type: 'Resource' }, { subject: { age: 18 } })).toBe(true)
      expect(abac.can('access', { type: 'Resource' }, { subject: { age: 20 } })).toBe(true)
      expect(abac.can('access', { type: 'Resource' }, { subject: { age: 16 } })).toBe(false)
    })
  })

  describe('字段级权限', () => {
    it('应该能够设置字段权限', () => {
      abac.setFieldPermission({
        subject: 'User',
        action: 'read',
        allowedFields: ['id', 'name', 'email'],
        deniedFields: ['password'],
      })

      const fields = abac.getAccessibleFields('User', 'read')
      expect(fields).toContain('id')
      expect(fields).toContain('name')
      expect(fields).not.toContain('password')
    })

    it('应该能够过滤对象字段', () => {
      abac.setFieldPermission({
        subject: 'User',
        action: 'read',
        allowedFields: ['id', 'name'],
      })

      const user = {
        id: '123',
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
      }

      const filtered = abac.filterFields(user, 'User', 'read')
      expect(filtered).toEqual({ id: '123', name: 'John' })
    })
  })

  describe('规则优先级', () => {
    it('应该按优先级排序规则', () => {
      abac.addRule({
        action: 'read',
        subject: 'Post',
        priority: 10,
      })

      abac.addRule({
        action: 'write',
        subject: 'Post',
        priority: 20,
      })

      const rules = abac.getAllRules()
      expect(rules[0].priority).toBe(20)
      expect(rules[1].priority).toBe(10)
    })
  })

  describe('反向规则', () => {
    it('应该支持拒绝规则', () => {
      abac.addRule({
        action: 'read',
        subject: 'Post',
        inverted: true,
      })

      expect(abac.can('read', { type: 'Post' })).toBe(false)
    })
  })
})



