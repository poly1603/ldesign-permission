/**
 * @ldesign/permission - 基础使用示例
 * 
 * 这个文件演示了权限系统的基础用法
 */

import { createPermissionManager } from '../src/index'

// ============================================================================
// 1. 创建权限管理器
// ============================================================================

const pm = createPermissionManager({
  enableCache: true,
  enableAudit: true,
  enableEvents: true,
  strict: false,
})

console.log('✅ 权限管理器已创建\n')

// ============================================================================
// 2. RBAC 示例 - 基于角色的访问控制
// ============================================================================

console.log('📋 RBAC 示例')
console.log('─'.repeat(50))

// 创建角色
pm.createRole('admin', {
  displayName: '管理员',
  description: '系统管理员，拥有所有权限',
})

pm.createRole('editor', {
  displayName: '编辑',
  description: '内容编辑，可以管理文章',
})

pm.createRole('user', {
  displayName: '普通用户',
  description: '普通用户，只能查看内容',
})

console.log('✅ 创建了 3 个角色: admin, editor, user')

// 授予权限
pm.grantPermission('admin', 'users', '*')      // 管理员：所有用户操作
pm.grantPermission('admin', 'posts', '*')      // 管理员：所有文章操作
pm.grantPermission('admin', 'settings', '*')   // 管理员：所有设置操作

pm.grantPermission('editor', 'posts', 'read')   // 编辑：读文章
pm.grantPermission('editor', 'posts', 'create') // 编辑：创建文章
pm.grantPermission('editor', 'posts', 'update') // 编辑：更新文章

pm.grantPermission('user', 'posts', 'read')     // 用户：只能读文章

console.log('✅ 权限已授予')

// 分配角色给用户
pm.assignRole('alice', 'admin')
pm.assignRole('bob', 'editor')
pm.assignRole('charlie', 'user')

console.log('✅ 角色已分配')
console.log('')

// 权限检查
const test1 = pm.check('alice', 'users', 'delete')
console.log(`Alice 能删除用户吗? ${test1.allowed ? '✅ 是' : '❌ 否'}`)

const test2 = pm.check('bob', 'posts', 'create')
console.log(`Bob 能创建文章吗? ${test2.allowed ? '✅ 是' : '❌ 否'}`)

const test3 = pm.check('charlie', 'posts', 'delete')
console.log(`Charlie 能删除文章吗? ${test3.allowed ? '✅ 是' : '❌ 否'}`)

console.log('')

// ============================================================================
// 3. 角色继承示例
// ============================================================================

console.log('📋 角色继承示例')
console.log('─'.repeat(50))

// 创建继承角色
pm.createRole('superadmin', {
  displayName: '超级管理员',
  description: '继承管理员的所有权限',
  inherits: ['admin'],
})

pm.assignRole('david', 'superadmin')

const test4 = pm.check('david', 'users', 'delete')
console.log(`David (superadmin) 能删除用户吗? ${test4.allowed ? '✅ 是' : '❌ 否'} (继承自 admin)`)

console.log('')

// ============================================================================
// 4. ABAC 示例 - 基于属性的访问控制
// ============================================================================

console.log('📋 ABAC 示例')
console.log('─'.repeat(50))

// 定义基于属性的规则
pm.defineAbility([
  {
    action: 'update',
    subject: 'Post',
    conditions: {
      field: 'authorId',
      operator: 'eq',
      value: 'bob', // 只能编辑自己的文章
    },
  },
  {
    action: 'delete',
    subject: 'Post',
    conditions: {
      operator: 'and',
      conditions: [
        { field: 'authorId', operator: 'eq', value: 'bob' },
        { field: 'status', operator: 'eq', value: 'draft' }, // 只能删除草稿
      ],
    },
  },
])

console.log('✅ ABAC 规则已定义')

// 测试 ABAC
const post1 = { type: 'Post', authorId: 'bob', status: 'draft' }
const post2 = { type: 'Post', authorId: 'alice', status: 'draft' }
const post3 = { type: 'Post', authorId: 'bob', status: 'published' }

const context = { user: { id: 'bob' } }

console.log(`Bob 能更新自己的文章吗? ${pm.can('update', post1, context) ? '✅ 是' : '❌ 否'}`)
console.log(`Bob 能更新 Alice 的文章吗? ${pm.can('update', post2, context) ? '✅ 是' : '❌ 否'}`)
console.log(`Bob 能删除自己的草稿吗? ${pm.can('delete', post1, context) ? '✅ 是' : '❌ 否'}`)
console.log(`Bob 能删除自己的已发布文章吗? ${pm.can('delete', post3, context) ? '✅ 是' : '❌ 否'}`)

console.log('')

// ============================================================================
// 5. 批量检查示例
// ============================================================================

console.log('📋 批量检查示例')
console.log('─'.repeat(50))

const permissions = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'write' },
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' },
]

const results = pm.checkMultiple('bob', permissions)
console.log('Bob 的权限检查结果:')
results.forEach((result, index) => {
  const perm = permissions[index]
  console.log(`  ${perm.resource}:${perm.action} → ${result.allowed ? '✅ 允许' : '❌ 拒绝'}`)
})

console.log('')

// ============================================================================
// 6. 策略引擎示例
// ============================================================================

console.log('📋 策略引擎示例')
console.log('─'.repeat(50))

import { allowRule, denyRule } from '../src/index'

// 创建策略规则
const workingHoursRule = allowRule()
  .id('working-hours-access')
  .name('工作时间访问')
  .subjects('employee')
  .resources('sensitive-data')
  .actions('read')
  .when({
    field: 'environment.time.hour',
    operator: 'gte',
    value: 9,
  })
  .and({
    field: 'environment.time.hour',
    operator: 'lt',
    value: 18,
  })
  .priority(100)
  .build()

const denyWeekendRule = denyRule()
  .id('no-weekend-access')
  .name('禁止周末访问')
  .subjects('*')
  .resources('sensitive-data')
  .actions('*')
  .when({
    field: 'environment.time.day',
    operator: 'in',
    value: [0, 6], // 周日和周六
  })
  .priority(200) // 更高优先级
  .build()

// 添加策略
pm.addPolicy({
  id: 'policy-1',
  name: '敏感数据访问策略',
  description: '控制敏感数据的访问时间',
  rules: [workingHoursRule, denyWeekendRule],
  conflictResolution: 'deny-override',
})

console.log('✅ 策略已添加')
console.log('')

// ============================================================================
// 7. 导出/导入示例
// ============================================================================

console.log('📋 导出/导入示例')
console.log('─'.repeat(50))

// 导出所有权限数据
const exported = pm.export()
console.log('✅ 权限数据已导出')
console.log(`数据大小: ${(exported.length / 1024).toFixed(2)} KB`)

// 可以保存到文件或数据库
// fs.writeFileSync('permissions.json', exported)

// 导入
// const data = fs.readFileSync('permissions.json', 'utf-8')
// pm.import(data)

console.log('')

// ============================================================================
// 8. 统计信息
// ============================================================================

console.log('📋 统计信息')
console.log('─'.repeat(50))

const stats = pm.getStats()
console.log('RBAC 统计:')
console.log(`  总角色数: ${stats.rbac.store.totalRoles}`)
console.log(`  总用户数: ${stats.rbac.store.totalUsers}`)
console.log(`  总权限数: ${stats.rbac.store.totalRolePermissions}`)

console.log('\nABAC 统计:')
console.log(`  总规则数: ${stats.abac.totalRules}`)

console.log('\n策略统计:')
console.log(`  总策略数: ${stats.policy.totalPolicies}`)
console.log(`  启用策略: ${stats.policy.enabledPolicies}`)

console.log('')
console.log('🎉 示例完成！')



