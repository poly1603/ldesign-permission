/**
 * @ldesign/permission - 压力测试
 * 
 * 测试权限系统在极端情况下的稳定性和性能
 */

import { describe, it, expect } from 'vitest'
import { createPermissionManager } from '../../src/core/PermissionManager'

describe('压力测试', () => {
  describe('大量角色测试', () => {
    it('应支持 1000+ 角色无性能下降', () => {
      const pm = createPermissionManager({ enableCache: true })

      const ROLE_COUNT = 1000
      const startTime = performance.now()

      // 创建 1000 个角色
      for (let i = 0; i < ROLE_COUNT; i++) {
        pm.createRole(`role${i}`, {
          displayName: `角色 ${i}`,
        })
        pm.grantPermission(`role${i}`, `resource${i % 100}`, 'read')
      }

      const setupTime = performance.now() - startTime

      console.log(`创建 ${ROLE_COUNT} 个角色耗时: ${setupTime.toFixed(2)}ms`)
      console.log(`平均每个角色: ${(setupTime / ROLE_COUNT).toFixed(4)}ms`)

      // 测试查询性能
      const queryStart = performance.now()
      const roles = pm.getAllRoles()
      const queryTime = performance.now() - queryStart

      console.log(`查询所有角色耗时: ${queryTime.toFixed(2)}ms`)

      expect(roles.length).toBe(ROLE_COUNT)
      expect(setupTime).toBeLessThan(5000) // 5 秒内完成设置
      expect(queryTime).toBeLessThan(100)  // 查询 < 100ms
    })
  })

  describe('大量用户测试', () => {
    it('应支持 5000+ 用户权限检查', () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备测试数据
      pm.createRole('admin')
      pm.createRole('user')
      pm.grantPermission('admin', 'users', '*')
      pm.grantPermission('user', 'posts', 'read')

      const USER_COUNT = 5000

      // 分配角色
      const startAssign = performance.now()
      for (let i = 0; i < USER_COUNT; i++) {
        pm.assignRole(`user${i}`, i % 2 === 0 ? 'admin' : 'user')
      }
      const assignTime = performance.now() - startAssign

      console.log(`为 ${USER_COUNT} 个用户分配角色耗时: ${assignTime.toFixed(2)}ms`)

      // 测试权限检查（包含缓存）
      const checkStart = performance.now()
      let successCount = 0

      for (let i = 0; i < USER_COUNT; i++) {
        const result = pm.check(`user${i}`, 'users', 'read')
        if (result.allowed) {
          successCount++
        }
      }

      const checkTime = performance.now() - checkStart
      const avgCheckTime = checkTime / USER_COUNT

      console.log(`${USER_COUNT} 次权限检查耗时: ${checkTime.toFixed(2)}ms`)
      console.log(`平均每次检查: ${avgCheckTime.toFixed(4)}ms`)
      console.log(`成功次数: ${successCount}`)

      // 获取缓存统计
      const stats = pm.getStats()
      console.log(`缓存命中率: ${stats.cache.hitRate.toFixed(2)}%`)

      expect(avgCheckTime).toBeLessThan(0.5)
      expect(stats.cache.hitRate).toBeGreaterThan(0) // 应该有缓存命中
    })
  })

  describe('复杂继承链测试', () => {
    it('应支持 10 层继承深度', () => {
      const pm = createPermissionManager({ enableCache: false })

      const DEPTH = 10

      // 创建继承链
      pm.createRole('role0')
      pm.grantPermission('role0', 'resource0', 'read')

      for (let i = 1; i < DEPTH; i++) {
        pm.createRole(`role${i}`, { inherits: [`role${i - 1}`] })
        pm.grantPermission(`role${i}`, `resource${i}`, 'read')
      }

      pm.assignRole('testUser', `role${DEPTH - 1}`)

      // 测试继承的权限（从最底层继承）
      const durations: number[] = []

      for (let i = 0; i < DEPTH; i++) {
        const result = pm.check('testUser', `resource${i}`, 'read')
        durations.push(result.duration || 0)
        expect(result.allowed).toBe(true) // 应该继承所有权限
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)

      console.log(`${DEPTH} 层继承链性能:`)
      console.log(`  平均检查耗时: ${avgDuration.toFixed(4)}ms`)
      console.log(`  最大检查耗时: ${maxDuration.toFixed(4)}ms`)

      expect(avgDuration).toBeLessThan(2.0) // 即使 10 层继承，平均也应该 < 2ms
    })
  })

  describe('大量权限测试', () => {
    it('应支持角色拥有 1000+ 权限', () => {
      const pm = createPermissionManager({ enableCache: true })

      const PERMISSION_COUNT = 1000
      pm.createRole('superadmin')

      // 授予大量权限
      const startGrant = performance.now()
      for (let i = 0; i < PERMISSION_COUNT; i++) {
        pm.grantPermission('superadmin', `resource${i}`, 'read')
      }
      const grantTime = performance.now() - startGrant

      console.log(`授予 ${PERMISSION_COUNT} 个权限耗时: ${grantTime.toFixed(2)}ms`)

      pm.assignRole('testUser', 'superadmin')

      // 测试权限检查
      const durations: number[] = []
      for (let i = 0; i < 100; i++) {
        const result = pm.check('testUser', `resource${i}`, 'read')
        durations.push(result.duration || 0)
        expect(result.allowed).toBe(true)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      console.log(`大量权限检查性能:`)
      console.log(`  平均耗时: ${avgDuration.toFixed(4)}ms`)

      expect(grantTime).toBeLessThan(1000) // 授予 < 1s
      expect(avgDuration).toBeLessThan(0.5) // 检查 < 0.5ms
    })
  })

  describe('内存泄漏测试', () => {
    it('长时间运行不应发生内存泄漏', () => {
      const pm = createPermissionManager({
        enableCache: true,
        cache: { maxSize: 500 }
      })

      // 准备测试数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'users', 'read')

      const ITERATIONS = 10000
      const CHECK_INTERVAL = 1000

      // 模拟长时间运行
      for (let i = 0; i < ITERATIONS; i++) {
        // 动态创建用户ID
        const userId = `user${i % 100}`
        pm.assignRole(userId, 'admin')
        pm.check(userId, 'users', 'read')

        // 定期检查缓存大小
        if (i > 0 && i % CHECK_INTERVAL === 0) {
          const stats = pm.getStats()

          // 缓存大小应该稳定在最大值附近
          expect(stats.cache.size).toBeLessThanOrEqual(500)

          if (i === CHECK_INTERVAL) {
            console.log(`${i} 次迭代后缓存大小: ${stats.cache.size}`)
          }
        }
      }

      const finalStats = pm.getStats()

      console.log('长时间运行测试:')
      console.log(`  总迭代次数: ${ITERATIONS}`)
      console.log(`  最终缓存大小: ${finalStats.cache.size}`)
      console.log(`  缓存命中率: ${finalStats.cache.hitRate.toFixed(2)}%`)

      // 缓存大小应该被限制
      expect(finalStats.cache.size).toBeLessThanOrEqual(500)
    })
  })

  describe('高频更新测试', () => {
    it('频繁的权限变更不应导致性能下降', () => {
      const pm = createPermissionManager({ enableCache: true })

      pm.createRole('admin')
      pm.assignRole('testUser', 'admin')

      const ITERATIONS = 500
      const durations: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        // 授予权限
        pm.grantPermission('admin', `resource${i}`, 'read')

        // 立即检查
        const result = pm.check('testUser', `resource${i}`, 'read')
        durations.push(result.duration || 0)

        // 撤销权限
        pm.revokePermission('admin', `resource${i}`, 'read')
      }

      // 分析性能趋势
      const firstHalf = durations.slice(0, ITERATIONS / 2)
      const secondHalf = durations.slice(ITERATIONS / 2)

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      const degradation = ((avgSecond - avgFirst) / avgFirst) * 100

      console.log('高频更新性能:')
      console.log(`  前半段平均: ${avgFirst.toFixed(4)}ms`)
      console.log(`  后半段平均: ${avgSecond.toFixed(4)}ms`)
      console.log(`  性能下降: ${degradation.toFixed(2)}%`)

      // 性能下降应小于 30%
      expect(Math.abs(degradation)).toBeLessThan(30)
    })
  })

  describe('ABAC 复杂条件性能', () => {
    it('复杂条件评估应保持高性能', () => {
      const pm = createPermissionManager({ enableCache: true })

      // 定义复杂规则
      pm.defineAbility([
        {
          action: 'access',
          subject: 'SensitiveData',
          conditions: {
            operator: 'and',
            conditions: [
              {
                operator: 'or',
                conditions: [
                  { field: 'user.department', operator: 'eq', value: 'IT' },
                  { field: 'user.department', operator: 'eq', value: 'Security' },
                ],
              },
              { field: 'user.level', operator: 'gte', value: 5 },
              {
                operator: 'and',
                conditions: [
                  { field: 'environment.time.hour', operator: 'gte', value: 9 },
                  { field: 'environment.time.hour', operator: 'lt', value: 18 },
                ],
              },
            ],
          },
        },
      ])

      const context = {
        user: { department: 'IT', level: 7 },
        environment: { time: { hour: 14 } },
      }

      // 预热
      for (let i = 0; i < 100; i++) {
        pm.can('access', { type: 'SensitiveData' }, context)
      }

      // 测试
      const durations: number[] = []
      for (let i = 0; i < 1000; i++) {
        const start = performance.now()
        pm.can('access', { type: 'SensitiveData' }, context)
        durations.push(performance.now() - start)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      console.log('复杂条件评估性能:')
      console.log(`  平均耗时: ${avgDuration.toFixed(4)}ms`)

      expect(avgDuration).toBeLessThan(0.3) // 即使复杂条件，也应该 < 0.3ms
    })
  })

  describe('极限并发测试', () => {
    it('应支持 10000+ 并发权限检查', async () => {
      const pm = createPermissionManager({ enableCache: true })

      // 准备数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'resource', 'action')
      pm.assignRole('testUser', 'admin')

      const CONCURRENT_COUNT = 10000

      // 预热缓存
      pm.check('testUser', 'resource', 'action')

      const startTime = performance.now()

      // 创建大量并发 Promise
      const promises = []
      for (let i = 0; i < CONCURRENT_COUNT; i++) {
        promises.push(Promise.resolve(pm.check('testUser', 'resource', 'action')))
      }

      const results = await Promise.all(promises)
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const throughput = CONCURRENT_COUNT / (totalTime / 1000)

      console.log('极限并发测试:')
      console.log(`  并发数: ${CONCURRENT_COUNT}`)
      console.log(`  总耗时: ${totalTime.toFixed(2)}ms`)
      console.log(`  吞吐量: ${throughput.toFixed(0)} checks/sec`)
      console.log(`  平均耗时: ${(totalTime / CONCURRENT_COUNT).toFixed(4)}ms`)

      // 验证所有结果
      expect(results.length).toBe(CONCURRENT_COUNT)
      expect(results.every(r => r.allowed)).toBe(true)
      expect(throughput).toBeGreaterThan(50000) // 吞吐量 > 50000 checks/sec
    })
  })

  describe('混合场景压力测试', () => {
    it('混合读写操作应保持稳定', () => {
      const pm = createPermissionManager({ enableCache: true })

      const OPERATIONS = 2000
      const operations = []

      const startTime = performance.now()

      for (let i = 0; i < OPERATIONS; i++) {
        const op = i % 10

        switch (op) {
          case 0:
          case 1:
          case 2:
          case 3:
          case 4:
            // 50% 权限检查
            pm.createRole(`temp_role_${i}`, { displayName: `临时角色${i}` })
            pm.assignRole(`user${i}`, `temp_role_${i}`)
            const checkResult = pm.check(`user${i}`, 'resource', 'action')
            operations.push({ type: 'check', duration: checkResult.duration })
            break

          case 5:
          case 6:
            // 20% 授予权限
            if (pm.getRole(`temp_role_${i - 1}`)) {
              pm.grantPermission(`temp_role_${i - 1}`, 'resource', 'action')
              operations.push({ type: 'grant', duration: 0 })
            }
            break

          case 7:
          case 8:
            // 20% 分配角色
            if (pm.getRole(`temp_role_${i - 2}`)) {
              pm.assignRole(`user${i + 100}`, `temp_role_${i - 2}`)
              operations.push({ type: 'assign', duration: 0 })
            }
            break

          case 9:
            // 10% 创建角色
            pm.createRole(`persistent_role_${i}`)
            operations.push({ type: 'create', duration: 0 })
            break
        }
      }

      const totalTime = performance.now() - startTime

      // 统计各类操作
      const checkOps = operations.filter(op => op.type === 'check')
      const avgCheckDuration = checkOps.reduce((sum, op) => sum + (op.duration || 0), 0) / checkOps.length

      console.log('混合场景压力测试:')
      console.log(`  总操作数: ${OPERATIONS}`)
      console.log(`  总耗时: ${totalTime.toFixed(2)}ms`)
      console.log(`  平均每操作: ${(totalTime / OPERATIONS).toFixed(4)}ms`)
      console.log(`  权限检查操作: ${checkOps.length}`)
      console.log(`  权限检查平均耗时: ${avgCheckDuration.toFixed(4)}ms`)

      const stats = pm.getStats()
      console.log(`  最终角色数: ${stats.rbac.store.totalRoles}`)
      console.log(`  最终用户数: ${stats.rbac.store.totalUsers}`)
      console.log(`  缓存大小: ${stats.cache.size}`)

      expect(totalTime).toBeLessThan(5000) // 2000 次混合操作 < 5s
    })
  })

  describe('缓存淘汰测试', () => {
    it('LRU 淘汰机制应正常工作', () => {
      const pm = createPermissionManager({
        enableCache: true,
        cache: { maxSize: 50 }
      })

      // 准备数据
      pm.createRole('admin')
      pm.grantPermission('admin', 'resource', 'action')

      // 创建 100 个用户（超过缓存容量 2 倍）
      for (let i = 0; i < 100; i++) {
        pm.assignRole(`user${i}`, 'admin')
        pm.check(`user${i}`, 'resource', 'action')
      }

      const stats1 = pm.getStats()
      console.log(`第一轮后缓存大小: ${stats1.cache.size}`)

      // 再次检查前 50 个用户（应该被淘汰）
      let oldEntriesCached = 0
      for (let i = 0; i < 50; i++) {
        const result = pm.check(`user${i}`, 'resource', 'action')
        if (result.fromCache) {
          oldEntriesCached++
        }
      }

      console.log(`早期用户缓存命中: ${oldEntriesCached}/50`)

      // 检查最近 50 个用户（应该在缓存中）
      let recentEntriesCached = 0
      for (let i = 50; i < 100; i++) {
        const result = pm.check(`user${i}`, 'resource', 'action')
        if (result.fromCache) {
          recentEntriesCached++
        }
      }

      console.log(`最近用户缓存命中: ${recentEntriesCached}/50`)

      // LRU 应该淘汰了早期的缓存
      expect(recentEntriesCached).toBeGreaterThan(oldEntriesCached)
      expect(stats1.cache.size).toBeLessThanOrEqual(50)
    })
  })

  describe('审计日志性能影响', () => {
    it('启用审计日志不应显著影响性能', () => {
      const pmNoAudit = createPermissionManager({
        enableCache: false,
        enableAudit: false,
      })

      const pmWithAudit = createPermissionManager({
        enableCache: false,
        enableAudit: true,
      })

      // 准备数据
      for (const pm of [pmNoAudit, pmWithAudit]) {
        pm.createRole('admin')
        pm.grantPermission('admin', 'users', 'read')
        pm.assignRole('user123', 'admin')
      }

      const ITERATIONS = 1000

      // 测试无审计
      const startNoAudit = performance.now()
      for (let i = 0; i < ITERATIONS; i++) {
        pmNoAudit.check('user123', 'users', 'read')
      }
      const timeNoAudit = performance.now() - startNoAudit

      // 测试有审计
      const startWithAudit = performance.now()
      for (let i = 0; i < ITERATIONS; i++) {
        pmWithAudit.check('user123', 'users', 'read')
      }
      const timeWithAudit = performance.now() - startWithAudit

      const overhead = ((timeWithAudit - timeNoAudit) / timeNoAudit) * 100

      console.log('审计日志性能影响:')
      console.log(`  无审计: ${timeNoAudit.toFixed(2)}ms`)
      console.log(`  有审计: ${timeWithAudit.toFixed(2)}ms`)
      console.log(`  性能开销: ${overhead.toFixed(2)}%`)

      // 审计开销应小于 30%
      expect(overhead).toBeLessThan(30)
    })
  })
})

