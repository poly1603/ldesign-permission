# Permission 包快速参考

> 快速查找常用 API 和使用模式

---

## 🚀 快速开始

### 基础设置

```typescript
import { createPermissionManager } from '@ldesign/permission'

// 创建权限管理器
const pm = createPermissionManager({
  enableCache: true,   // 推荐开启
  enableAudit: true,   // 生产环境推荐
  enableEvents: true,  // 用于扩展
})

// 使用模板快速创建角色
pm.applyTemplate('basic-crud')

// 或手动创建
pm.createRole('admin')
pm.grantPermission('admin', 'users', '*')
pm.assignRole('user123', 'admin')

// 检查权限
const result = pm.check('user123', 'users', 'delete')
console.log(result.allowed) // true
```

---

## 📚 常用 API

### 角色管理

```typescript
// 创建角色
pm.createRole('editor', {
  displayName: '编辑',
  description: '内容编辑角色',
  inherits: ['user'] // 可选：继承其他角色
})

// 获取角色
const role = pm.getRole('editor')

// 获取所有角色
const roles = pm.getAllRoles()

// 删除角色
pm.deleteRole('editor')
```

### 权限管理

```typescript
// 授予权限
pm.grantPermission('editor', 'posts', 'write')
pm.grantPermission('admin', 'users', '*') // 所有操作

// 撤销权限
pm.revokePermission('editor', 'posts', 'delete')

// 获取角色权限
const permissions = pm.getRolePermissions('editor')
const permissionsWithInherited = pm.getRolePermissions('editor', true)
```

### 用户-角色

```typescript
// 分配角色
pm.assignRole('user123', 'editor')

// 移除角色
pm.unassignRole('user123', 'editor')

// 获取用户角色
const roles = pm.getUserRoles('user123')

// 检查用户是否有角色
pm.hasRole('user123', 'admin')
```

### 权限检查

```typescript
// 基本检查
const result = pm.check('user123', 'posts', 'delete')
console.log(result.allowed)   // 是否允许
console.log(result.duration)  // 耗时
console.log(result.fromCache) // 是否来自缓存

// 快捷检查（返回布尔值）
pm.checkPermission('user123', 'posts:delete')

// 批量检查
const results = pm.checkMultiple('user123', [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' }
])

// 检查任意一个
pm.checkAny('user123', [...])

// 检查所有
pm.checkAll('user123', [...])
```

---

## 🎨 缓存功能

### 缓存管理

```typescript
// 清除所有缓存
pm.clearCache()

// 清理过期缓存
const cleaned = pm.cleanupCache()

// 获取缓存统计
const stats = pm.getStats().cache
console.log('命中率:', stats.hitRate, '%')
console.log('缓存大小:', stats.size)
```

### 缓存配置

```typescript
const pm = createPermissionManager({
  enableCache: true,
  cache: {
    maxSize: 1000,        // 最大缓存数
    ttl: 5 * 60 * 1000,   // 5 分钟 TTL
  }
})
```

---

## ⏰ 临时权限

### 授予临时权限

```typescript
// 授予临时权限（1 小时后过期）
const permId = pm.grantTemporaryPermission(
  'user123',
  'sensitive-data',
  'read',
  new Date(Date.now() + 60 * 60 * 1000),
  {
    createdBy: 'admin',
    metadata: { reason: '临时审批' }
  }
)

// 授予一次性权限（用完自动撤销）
const oneTimeId = pm.grantOneTimePermission(
  'user456',
  'temp-resource',
  'access'
)

// 撤销临时权限
pm.revokeTemporaryPermission(permId)

// 查看用户的临时权限
const tempPerms = pm.getUserTemporaryPermissions('user123')
```

---

## 📡 事件系统

### 监听事件

```typescript
// 监听权限检查
pm.on('permission:check:after', ({ userId, resource, action, result }) => {
  console.log(`${userId} → ${resource}:${action}: ${result.allowed}`)
})

// 监听角色分配
pm.on('role:assigned', ({ userId, roleName }) => {
  console.log(`${roleName} 分配给 ${userId}`)
})

// 一次性监听
pm.once('permission:granted', (data) => {
  console.log('权限已授予:', data)
})

// 取消监听
const unsubscribe = pm.on('role:assigned', handler)
unsubscribe() // 取消

// 或
pm.off('role:assigned', handler)
```

### 事件列表

```typescript
'permission:check:before'        // 权限检查前
'permission:check:after'         // 权限检查后
'role:assigned'                  // 角色分配
'role:unassigned'                // 角色移除
'permission:granted'             // 权限授予
'permission:revoked'             // 权限撤销
'permission:temporary:granted'   // 临时权限授予
'permission:temporary:revoked'   // 临时权限撤销
'permission:one-time:granted'    // 一次性权限授予
```

---

## 📊 性能监控

### 获取性能指标

```typescript
// 获取性能指标
const metrics = pm.getPerformanceMetrics()
console.log('总检查次数:', metrics.totalChecks)
console.log('平均耗时:', metrics.avgDuration, 'ms')
console.log('缓存命中率:', metrics.cacheHitRate, '%')
console.log('慢查询数:', metrics.slowQueries)

// 获取慢查询
const slowQueries = pm.getSlowQueries(10)
slowQueries.forEach(query => {
  console.log(`${query.userId} → ${query.resource}:${query.action}`)
  console.log(`  耗时: ${query.duration}ms`)
})

// 检查性能健康
const health = pm.checkPerformanceHealth()
if (!health.healthy) {
  console.warn('性能问题:', health.issues)
}

// 获取性能趋势
const trend = pm.getPerformanceTrend()
console.log('趋势:', trend.trend) // 'improving' | 'stable' | 'degrading'
console.log('建议:', trend.recommendation)

// 生成性能报告
const report = pm.generatePerformanceReport()
console.log(report)
```

---

## 📋 权限模板

### 使用内置模板

```typescript
// 查看可用模板
const templates = pm.getAvailableTemplates()
console.log(templates.map(t => t.name))
// ['基础 CRUD 权限', '内容管理权限', '用户管理权限']

// 应用模板
pm.applyTemplate('basic-crud')
// 创建了: viewer, editor, admin

pm.applyTemplate('content-management')
// 创建了: reader, author, moderator, content-admin

pm.applyTemplate('user-management')
// 创建了: user, user-manager, super-admin

// 根据标签查找
const cmsTemplates = pm.getTemplatesByTag('cms')
```

### 创建自定义模板

```typescript
const templateMgr = pm.getTemplateManager()

templateMgr.addTemplate({
  id: 'my-template',
  name: '我的模板',
  description: '自定义权限模板',
  roles: [
    {
      name: 'custom-role',
      displayName: '自定义角色',
      permissions: ['resource:action'],
    }
  ],
  tags: ['custom'],
})
```

---

## 📊 审计日志

### 查询和报告

```typescript
// 查询审计日志
const logs = pm.queryAuditLogs({
  userId: 'user123',
  startTime: new Date('2025-10-24'),
  endTime: new Date('2025-10-25'),
})

// 生成审计报告
const report = pm.generateAuditReport(
  new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
  new Date(),
  '每日权限审计报告'
)

console.log('审计日志数:', report.logs.length)
console.log('统计信息:', report.stats)
```

---

## 🎯 ABAC（基于属性）

### 定义规则

```typescript
// 用户只能编辑自己的文章
pm.defineAbility([
  {
    action: 'update',
    subject: 'Post',
    conditions: {
      field: 'authorId',
      operator: 'eq',
      value: '{{userId}}'
    }
  }
])

// 工作时间限制
pm.defineAbility([
  {
    action: '*',
    subject: 'SensitiveData',
    conditions: {
      operator: 'and',
      conditions: [
        { field: 'environment.time.hour', operator: 'gte', value: 9 },
        { field: 'environment.time.hour', operator: 'lt', value: 18 }
      ]
    }
  }
])

// 检查能力
const context = {
  user: { id: 'user123' },
  resource: { authorId: 'user123' }
}
pm.can('update', { type: 'Post', authorId: 'user123' }, context)
```

---

## 🛡️ 策略引擎

### 使用规则构建器

```typescript
import { allowRule, denyRule } from '@ldesign/permission'

// 创建允许规则
const rule = allowRule()
  .id('admin-access')
  .name('管理员访问')
  .subjects('admin')
  .resources('*')
  .actions('*')
  .priority(100)
  .build()

// 创建拒绝规则
const denyRule = denyRule()
  .subjects('*')
  .resources('sensitive-data')
  .actions('delete')
  .priority(200) // 优先级更高
  .build()

// 添加策略
pm.addPolicy({
  id: 'policy-1',
  name: '全局策略',
  rules: [rule, denyRule],
  conflictResolution: 'deny-override'
})
```

---

## 📊 系统统计

### 获取完整统计

```typescript
const stats = pm.getStats()

console.log('RBAC:', stats.rbac)
// { totalRoles: 5, totalUsers: 10, totalRolePermissions: 15 }

console.log('缓存:', stats.cache)
// { size: 234, maxSize: 1000, hits: 890, misses: 110, hitRate: 89.0 }

console.log('性能:', stats.performance)
// { totalChecks: 1000, avgDuration: 0.08, cacheHitRate: 82.5 }

console.log('临时权限:', stats.temporary)
// { permissions: { total: 5, active: 3, expired: 2 } }

console.log('模板:', stats.templates)
// { total: 4, builtin: 3, custom: 1 }
```

---

## 🔧 工具函数

### 路径访问

```typescript
import { getValueByPath, setValueByPath, hasValueByPath } from '@ldesign/permission'

const obj = { user: { profile: { name: 'John' } } }

getValueByPath(obj, 'user.profile.name')  // 'John'
setValueByPath(obj, 'user.profile.age', 30)
hasValueByPath(obj, 'user.profile.email') // false
```

### 输入验证

```typescript
import {
  validateString,
  validatePermissionString,
  validateNumber,
  validateArray
} from '@ldesign/permission'

try {
  validateString('', 'roleName', { minLength: 1 })
} catch (error) {
  console.error(error.message) // 参数 "roleName" 不能为空字符串
}

try {
  validatePermissionString('invalid')
} catch (error) {
  console.error(error.message) // 权限字符串格式不正确
}
```

---

## 🎯 实际场景示例

### 场景 1：博客系统

```typescript
// 1. 应用内容管理模板
pm.applyTemplate('content-management')

// 2. 分配角色
pm.assignRole('alice', 'content-admin')   // 管理员
pm.assignRole('bob', 'author')            // 作者
pm.assignRole('charlie', 'reader')        // 读者

// 3. ABAC 规则：只能编辑自己的文章
pm.defineAbility([{
  action: 'update',
  subject: 'Post',
  conditions: {
    field: 'authorId',
    operator: 'eq',
    value: '{{userId}}'
  }
}])

// 4. 使用
pm.check('alice', 'posts', 'delete')  // true（管理员）
pm.check('bob', 'posts', 'create')    // true（作者）
pm.check('charlie', 'posts', 'delete') // false（读者）

// 带上下文检查
pm.can('update', 
  { type: 'Post', authorId: 'bob' },
  { user: { id: 'bob' } }
) // true（自己的文章）
```

### 场景 2：临时访问权限

```typescript
// 用户申请临时访问
pm.grantTemporaryPermission(
  'contractor',
  'project-files',
  'read',
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
  { 
    createdBy: 'project-manager',
    metadata: { project: 'ProjectX' }
  }
)

// 7 天内可以访问
pm.check('contractor', 'project-files', 'read') // true

// 7 天后自动过期
```

### 场景 3：性能监控

```typescript
// 监听权限检查
let checkCount = 0
pm.on('permission:check:after', ({ result }) => {
  checkCount++
  if (checkCount % 1000 === 0) {
    // 每 1000 次检查后查看性能
    const metrics = pm.getPerformanceMetrics()
    console.log(`已检查 ${checkCount} 次`)
    console.log(`平均耗时: ${metrics.avgDuration}ms`)
    console.log(`缓存命中率: ${metrics.cacheHitRate}%`)
    
    // 检查健康状况
    const health = pm.checkPerformanceHealth()
    if (!health.healthy) {
      console.warn('性能预警:', health.issues)
    }
  }
})
```

---

## 📈 性能优化技巧

### 1. 启用缓存

```typescript
// ✅ 好
const pm = createPermissionManager({ enableCache: true })

// ❌ 不推荐（除非有特殊原因）
const pm = createPermissionManager({ enableCache: false })
```

### 2. 重复检查同一权限

```typescript
// ✅ 好：第二次会从缓存读取（< 0.1ms）
pm.check('user123', 'posts', 'read')
pm.check('user123', 'posts', 'read') // 缓存命中 ⚡

// ℹ️ 提示：相同的 userId + resource + action 会命中缓存
```

### 3. 批量检查

```typescript
// ✅ 好：使用批量方法
const results = pm.checkMultiple('user123', [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' },
  { resource: 'posts', action: 'delete' }
])

// ⚠️ 可以但不推荐
const r1 = pm.check('user123', 'posts', 'read')
const r2 = pm.check('user123', 'posts', 'write')
const r3 = pm.check('user123', 'posts', 'delete')
```

### 4. 使用模板

```typescript
// ✅ 好：使用模板快速创建
pm.applyTemplate('basic-crud')

// ⚠️ 可以但繁琐
pm.createRole('viewer')
pm.grantPermission('viewer', '*', 'read')
pm.createRole('editor', { inherits: ['viewer'] })
pm.grantPermission('editor', '*', 'create')
// ...
```

---

## ⚠️ 常见问题

### Q1: 权限检查很慢？

```typescript
// 检查性能指标
const metrics = pm.getPerformanceMetrics()
console.log('平均耗时:', metrics.avgDuration)
console.log('缓存命中率:', metrics.cacheHitRate)

// 如果缓存命中率低，检查配置
const config = pm.getStats().cache
console.log('缓存启用:', config.enabled)
console.log('缓存大小:', config.size, '/', config.maxSize)

// 解决方案：
// 1. 确保启用缓存
// 2. 增大缓存大小
// 3. 查看慢查询原因
const slowQueries = pm.getSlowQueries()
```

### Q2: 内存占用过高？

```typescript
// 查看缓存大小
const stats = pm.getStats()
console.log('缓存大小:', stats.cache.size)

// 解决方案：
// 1. 减小缓存 maxSize
// 2. 减小 TTL
// 3. 定期清理
pm.cleanupCache()
```

### Q3: 角色权限不生效？

```typescript
// 检查用户角色
const roles = pm.getUserRoles('user123')
console.log('用户角色:', roles)

// 检查角色权限
const permissions = pm.getRolePermissions('admin', true)
console.log('角色权限:', permissions)

// 检查详细结果
const result = pm.check('user123', 'users', 'read')
console.log('允许:', result.allowed)
console.log('匹配角色:', result.matchedRole)
console.log('原因:', result.reason)
```

---

## 📖 更多文档

- [README.md](./README.md) - 完整使用文档
- [FINAL_OPTIMIZATION_REPORT.md](./FINAL_OPTIMIZATION_REPORT.md) - 优化报告
- [examples/basic-usage.ts](./examples/basic-usage.ts) - 示例代码

---

## 🎉 快速参考完毕！

Permission 包功能强大但易于使用，祝您使用愉快！

