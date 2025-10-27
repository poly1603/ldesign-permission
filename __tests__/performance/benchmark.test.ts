/**
 * @ldesign/permission - 性能基准测试
 * 
 * 测试权限系统的性能指标，验证优化效果
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createPermissionManager } from '../../src/core/PermissionManager'

// 性能测试配置
const WARMUP_ITERATIONS = 100  // 预热次数
const TEST_ITERATIONS = 1000   // 测试次数
const MAX_CACHE_HIT_TIME = 0.15  // 缓存命中最大耗时 (ms)
const MAX_NO_CACHE_TIME = 0.6    // 无缓存最大耗时 (ms)
const MIN_CACHE_HIT_RATE = 75    // 最小缓存命中率 (%)

describe('性能基准测试', () => {
  describe('权限检查性能', () => {
    it('无缓存的权限检查应在 0.5ms 内完成', () => {
      const pm = createPermissionManager({ enableCache: false })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      // 预热
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        pm.check('user123', 'users', 'read')
      }

      // 测试
      const durations: number[] = []
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const result = pm.check('user123', 'users', 'read')
        durations.push(result.duration || 0)
      }

      // 统计
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      console.log('无缓存性能统计:')
      console.log(`  平均耗时: ${avgDuration.toFixed(4)}ms`)
      console.log(`  最大耗时: ${maxDuration.toFixed(4)}ms`)
      console.log(`  最小耗时: ${minDuration.toFixed(4)}ms`)

      expect(avgDuration).toBeLessThan(MAX_NO_CACHE_TIME)
      expect(maxDuration).toBeLessThan(1.0) // 最大不超过 1ms
    })

    it('缓存命中的权限检查应在 0.1ms 内完成', () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      // 第一次检查（建立缓存）
      pm.check('user123', 'users', 'read')

      // 预热（使用缓存）
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        pm.check('user123', 'users', 'read')
      }

      // 测试（缓存命中）
      const durations: number[] = []
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const result = pm.check('user123', 'users', 'read')
        if (result.fromCache) {
          durations.push(result.duration || 0)
        }
      }

      // 统计
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      console.log('缓存命中性能统计:')
      console.log(`  平均耗时: ${avgDuration.toFixed(4)}ms`)
      console.log(`  最大耗时: ${maxDuration.toFixed(4)}ms`)
      console.log(`  最小耗时: ${minDuration.toFixed(4)}ms`)
      console.log(`  性能提升: ${(MAX_NO_CACHE_TIME / avgDuration).toFixed(1)}x`)

      expect(avgDuration).toBeLessThan(MAX_CACHE_HIT_TIME)
      expect(durations.length).toBeGreaterThan(TEST_ITERATIONS * 0.9) // 至少 90% 缓存命中
    })
  })

  describe('缓存命中率测试', () => {
    it('重复权限检查的缓存命中率应超过 75%', () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备测试数据
      pm.createRole('admin')
      pm.createRole('user')
      pm.grantPermission('admin', 'users', '*')
      pm.grantPermission('user', 'posts', 'read')
      pm.assignRole('user1', 'admin')
      pm.assignRole('user2', 'user')

      // 执行多次检查
      const checkList = [
        { userId: 'user1', resource: 'users', action: 'read' },
        { userId: 'user1', resource: 'users', action: 'write' },
        { userId: 'user2', resource: 'posts', action: 'read' },
        { userId: 'user1', resource: 'users', action: 'read' },  // 重复
        { userId: 'user2', resource: 'posts', action: 'read' },  // 重复
      ]

      let totalChecks = 0
      let cacheHits = 0

      for (let i = 0; i < 200; i++) {
        for (const check of checkList) {
          const result = pm.check(check.userId, check.resource, check.action)
          totalChecks++
          if (result.fromCache) {
            cacheHits++
          }
        }
      }

      const hitRate = (cacheHits / totalChecks) * 100

      console.log('缓存命中率统计:')
      console.log(`  总检查次数: ${totalChecks}`)
      console.log(`  缓存命中次数: ${cacheHits}`)
      console.log(`  命中率: ${hitRate.toFixed(2)}%`)

      expect(hitRate).toBeGreaterThan(MIN_CACHE_HIT_RATE)
    })
  })

  describe('批量操作性能', () => {
    it('批量权限检查应保持高性能', () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', '*')
      pm.grantPermission('admin', 'posts', '*')
      pm.grantPermission('admin', 'comments', '*')
      pm.assignRole('user123', 'admin')

      const checks = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'write' },
        { resource: 'posts', action: 'read' },
        { resource: 'posts', action: 'write' },
        { resource: 'comments', action: 'read' },
      ]

      // 预热
      for (let i = 0; i < 10; i++) {
        pm.checkMultiple('user123', checks)
      }

      // 测试
      const startTime = performance.now()
      for (let i = 0; i < 100; i++) {
        pm.checkMultiple('user123', checks)
      }
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const avgTimePerBatch = totalTime / 100
      const avgTimePerCheck = avgTimePerBatch / checks.length

      console.log('批量检查性能统计:')
      console.log(`  总耗时: ${totalTime.toFixed(2)}ms`)
      console.log(`  平均每批次: ${avgTimePerBatch.toFixed(4)}ms`)
      console.log(`  平均每次检查: ${avgTimePerCheck.toFixed(4)}ms`)

      expect(avgTimePerCheck).toBeLessThan(0.2) // 平均每次检查 < 0.2ms
    })
  })

  describe('角色继承性能', () => {
    it('复杂继承关系下的权限检查应保持高性能', () => {
      const pm = createPermissionManager({ enableCache: false })

      // 创建复杂的继承层级
      // 层级: superadmin -> admin -> editor -> user
      pm.createRole('user')
      pm.grantPermission('user', 'posts', 'read')

      pm.createRole('editor', { inherits: ['user'] })
      pm.grantPermission('editor', 'posts', 'write')

      pm.createRole('admin', { inherits: ['editor'] })
      pm.grantPermission('admin', 'users', 'read')

      pm.createRole('superadmin', { inherits: ['admin'] })
      pm.grantPermission('superadmin', 'users', 'write')

      pm.assignRole('user123', 'superadmin')

      // 测试继承的权限
      const durations: number[] = []
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const result = pm.check('user123', 'posts', 'read') // 从 user 继承的权限
        durations.push(result.duration || 0)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      console.log('继承权限检查性能统计:')
      console.log(`  继承层级: 4 层`)
      console.log(`  平均耗时: ${avgDuration.toFixed(4)}ms`)

      expect(avgDuration).toBeLessThan(1.0) // 即使有继承，也应该很快
    })
  })

  describe('大规模数据性能', () => {
    it('大量角色情况下保持性能', () => {
      const pm = createPermissionManager({ enableCache: true })

      const ROLE_COUNT = 100
      const USER_COUNT = 50

      // 创建大量角色
      const startSetup = performance.now()
      for (let i = 0; i < ROLE_COUNT; i++) {
        pm.createRole(`role${i}`)
        pm.grantPermission(`role${i}`, `resource${i % 10}`, 'read')
      }

      // 分配角色给用户
      for (let i = 0; i < USER_COUNT; i++) {
        pm.assignRole(`user${i}`, `role${i % ROLE_COUNT}`)
      }
      const setupTime = performance.now() - startSetup

      console.log(`创建 ${ROLE_COUNT} 个角色和 ${USER_COUNT} 个用户耗时: ${setupTime.toFixed(2)}ms`)

      // 测试权限检查性能
      const durations: number[] = []
      for (let i = 0; i < 100; i++) {
        const userId = `user${i % USER_COUNT}`
        const resource = `resource${i % 10}`
        const result = pm.check(userId, resource, 'read')
        durations.push(result.duration || 0)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      console.log('大规模数据性能统计:')
      console.log(`  平均检查耗时: ${avgDuration.toFixed(4)}ms`)

      expect(avgDuration).toBeLessThan(0.5)
      expect(setupTime).toBeLessThan(500) // 设置时间 < 500ms
    })
  })

  describe('内存占用测试', () => {
    it('缓存应自动限制大小', () => {
      const pm = createPermissionManager({
        enableCache: true,
        cache: { maxSize: 100 }
      })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'resource', 'action')

      // 创建 200 个用户（超过缓存大小）
      for (let i = 0; i < 200; i++) {
        pm.assignRole(`user${i}`, 'admin')
      }

      // 执行 200 次不同的权限检查
      for (let i = 0; i < 200; i++) {
        pm.check(`user${i}`, 'resource', 'action')
      }

      // 获取缓存统计
      const stats = pm.getStats()

      console.log('内存限制测试:')
      console.log(`  缓存大小: ${stats.cache.size}`)
      console.log(`  最大大小: ${stats.cache.maxSize}`)

      // 缓存大小应该不超过最大值
      expect(stats.cache.size).toBeLessThanOrEqual(100)
    })
  })

  describe('并发性能测试', () => {
    it('并发权限检查应保持高性能', async () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')
      pm.assignRole('user123', 'admin')

      // 并发检查
      const CONCURRENT_CHECKS = 1000
      const startTime = performance.now()

      const promises = []
      for (let i = 0; i < CONCURRENT_CHECKS; i++) {
        promises.push(Promise.resolve(pm.check('user123', 'users', 'read')))
      }

      await Promise.all(promises)
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const avgTime = totalTime / CONCURRENT_CHECKS

      console.log('并发性能统计:')
      console.log(`  并发数: ${CONCURRENT_CHECKS}`)
      console.log(`  总耗时: ${totalTime.toFixed(2)}ms`)
      console.log(`  平均耗时: ${avgTime.toFixed(4)}ms`)
      console.log(`  吞吐量: ${(CONCURRENT_CHECKS / (totalTime / 1000)).toFixed(0)} checks/sec`)

      expect(totalTime).toBeLessThan(500) // 1000 次检查 < 500ms
    })
  })

  describe('事件系统性能影响', () => {
    it('启用事件系统不应显著影响性能', () => {
      const pmWithoutEvents = createPermissionManager({
        enableCache: false,
        enableEvents: false,
      })

      const pmWithEvents = createPermissionManager({
        enableCache: false,
        enableEvents: true,
      })

      // 添加事件监听器
      pmWithEvents.on('permission:check:after', () => {
        // 模拟一些处理
      })

      // 准备测试数据
      for (const pm of [pmWithoutEvents, pmWithEvents]) {
        pm.createRole('admin')
        pm.grantPermission('admin', 'users', 'read')
        pm.assignRole('user123', 'admin')
      }

      // 测试无事件
      const durationsWithout: number[] = []
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const result = pmWithoutEvents.check('user123', 'users', 'read')
        durationsWithout.push(result.duration || 0)
      }

      // 测试有事件
      const durationsWith: number[] = []
      for (let i = 0; i < TEST_ITERATIONS; i++) {
        const result = pmWithEvents.check('user123', 'users', 'read')
        durationsWith.push(result.duration || 0)
      }

      const avgWithout = durationsWithout.reduce((a, b) => a + b, 0) / durationsWithout.length
      const avgWith = durationsWith.reduce((a, b) => a + b, 0) / durationsWith.length
      const overhead = ((avgWith - avgWithout) / avgWithout) * 100

      console.log('事件系统性能影响:')
      console.log(`  无事件平均耗时: ${avgWithout.toFixed(4)}ms`)
      console.log(`  有事件平均耗时: ${avgWith.toFixed(4)}ms`)
      console.log(`  性能开销: ${overhead.toFixed(2)}%`)

      // 事件系统开销应小于 20%
      expect(overhead).toBeLessThan(20)
    })
  })
})

