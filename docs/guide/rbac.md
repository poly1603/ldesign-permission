# RBAC - 基于角色的访问控制

RBAC (Role-Based Access Control) 是最常用的权限管理模型。通过角色来组织权限，然后将角色分配给用户。

## 核心概念

### 角色（Role）

角色是一组权限的集合：

```typescript
interface Role {
  name: string              // 角色名称（唯一）
  displayName?: string      // 显示名称
  description?: string      // 描述
  permissions: string[]     // 权限列表
  inherits?: string[]       // 继承的角色
  metadata?: any           // 元数据
}
```

### 权限（Permission）

权限定义了对资源的操作：

```typescript
// 格式：resource:action
'users:read'     // 读取用户
'posts:write'    // 写入文章
'admin:*'        // 所有管理操作
```

## 角色管理

### 创建角色

```typescript
// 基础创建
pm.createRole('admin')

// 带选项创建
pm.createRole('editor', {
  displayName: '编辑',
  description: '内容编辑人员',
  inherits: ['user'],
  metadata: { department: 'content' }
})
```

### 查询角色

```typescript
// 获取单个角色
const role = pm.getRole('admin')
console.log(role?.displayName)

// 获取所有角色
const roles = pm.getAllRoles()

// 检查角色是否存在
if (pm.getRBACEngine().hasRole('admin')) {
  // 角色存在
}
```

### 更新角色

```typescript
pm.getRBACEngine().updateRole('editor', {
  displayName: '高级编辑',
  description: '资深内容编辑'
})
```

### 删除角色

```typescript
pm.deleteRole('temp-role')
```

## 权限管理

### 授予权限

```typescript
// 授予单个权限
pm.grantPermission('editor', 'posts', 'read')
pm.grantPermission('editor', 'posts', 'write')

// 使用通配符
pm.grantPermission('admin', 'users', '*')     // 所有用户操作
pm.grantPermission('admin', '*', 'read')       // 读取所有资源
```

### 撤销权限

```typescript
pm.revokePermission('editor', 'posts', 'delete')
```

### 查询权限

```typescript
// 获取角色的权限
const permissions = pm.getRolePermissions('editor')
console.log(permissions)  // ['posts:read', 'posts:write']

// 包括继承的权限
const allPermissions = pm.getRolePermissions('editor', true)
```

## 用户-角色管理

### 分配角色

```typescript
// 给用户分配角色
pm.assignRole('user123', 'editor')

// 分配多个角色
pm.assignRole('user123', 'admin')
pm.assignRole('user123', 'moderator')
```

### 移除角色

```typescript
pm.unassignRole('user123', 'moderator')
```

### 查询用户角色

```typescript
// 获取用户的所有角色
const roles = pm.getUserRoles('user123')
console.log(roles)  // ['admin', 'editor']

// 检查用户是否有某角色
if (pm.hasRole('user123', 'admin')) {
  // 用户是管理员
}
```

## 角色继承

角色可以继承其他角色的权限，形成层级结构。

### 单继承

```typescript
// 基础角色
pm.createRole('user')
pm.grantPermission('user', 'posts', 'read')

// 继承角色
pm.createRole('editor', {
  inherits: ['user']
})
pm.grantPermission('editor', 'posts', 'write')

// editor 拥有：posts:read（继承）+ posts:write（自己）
```

### 多重继承

```typescript
pm.createRole('moderator')
pm.grantPermission('moderator', 'comments', 'delete')

pm.createRole('super-editor', {
  inherits: ['editor', 'moderator']
})

// super-editor 继承了 editor 和 moderator 的所有权限
```

### 多级继承

```typescript
pm.createRole('user')
pm.grantPermission('user', 'posts', 'read')

pm.createRole('editor', { inherits: ['user'] })
pm.grantPermission('editor', 'posts', 'write')

pm.createRole('admin', { inherits: ['editor'] })
pm.grantPermission('admin', 'users', '*')

// admin → editor → user
// admin 拥有所有三个角色的权限
```

### 循环继承保护

系统会自动检测循环继承并抛出错误：

```typescript
pm.createRole('role1')
pm.createRole('role2', { inherits: ['role1'] })

// ❌ 会抛出错误
pm.getRBACEngine().updateRole('role1', { 
  inherits: ['role2'] 
})
// Error: Circular inheritance detected
```

## 权限检查

### 基础检查

```typescript
// 检查用户是否有权限
const result = pm.check('user123', 'posts', 'write')
console.log(result.allowed)      // true/false
console.log(result.matchedRole)  // 匹配的角色
console.log(result.duration)     // 检查耗时
```

### 快速检查

```typescript
// 检查权限字符串
pm.checkPermission('user123', 'posts:write')  // true/false

// 检查角色
pm.hasRole('user123', 'admin')  // true/false
```

### 批量检查

```typescript
const results = pm.checkMultiple('user123', [
  { resource: 'users', action: 'read' },
  { resource: 'posts', action: 'write' },
  { resource: 'settings', action: 'update' }
])

results.forEach((result, index) => {
  console.log(`检查 ${index}: ${result.allowed}`)
})
```

### 条件检查

```typescript
// 检查任意权限
const hasAny = pm.checkAny('user123', [
  { resource: 'users', action: 'read' },
  { resource: 'posts', action: 'read' }
])
console.log(hasAny)  // true - 只要有一个满足

// 检查所有权限
const hasAll = pm.checkAll('user123', [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' }
])
console.log(hasAll)  // true/false - 必须全部满足
```

## 通配符

### 资源通配符

```typescript
// 所有资源的读取权限
pm.grantPermission('viewer', '*', 'read')

// 检查
pm.check('viewer_user', 'users', 'read').allowed     // true
pm.check('viewer_user', 'posts', 'read').allowed     // true
pm.check('viewer_user', 'comments', 'read').allowed  // true
```

### 操作通配符

```typescript
// 用户资源的所有操作
pm.grantPermission('admin', 'users', '*')

// 检查
pm.check('admin_user', 'users', 'read').allowed    // true
pm.check('admin_user', 'users', 'write').allowed   // true
pm.check('admin_user', 'users', 'delete').allowed  // true
```

### 完全通配符

```typescript
// 所有权限（谨慎使用！）
pm.grantPermission('superadmin', '*', '*')

// 拥有一切权限
```

## 最佳实践

### 1. 角色命名

```typescript
// ✅ 好的命名
'admin', 'editor', 'viewer', 'moderator'

// ❌ 避免的命名
'role1', 'temp', 'test'
```

### 2. 权限粒度

```typescript
// ✅ 细粒度控制
pm.grantPermission('editor', 'posts', 'create')
pm.grantPermission('editor', 'posts', 'update')
pm.grantPermission('editor', 'posts', 'delete')

// ⚠️ 过于粗粒度
pm.grantPermission('editor', '*', '*')
```

### 3. 角色层级

```typescript
// ✅ 清晰的层级
// guest → user → editor → admin → superadmin

// ❌ 混乱的层级
// role1 → role3 → role2 → role5
```

### 4. 使用继承

```typescript
// ✅ 利用继承减少重复
pm.createRole('user')
pm.grantPermission('user', 'posts', 'read')

pm.createRole('editor', { inherits: ['user'] })
pm.grantPermission('editor', 'posts', 'write')

// ❌ 重复定义
pm.createRole('user')
pm.grantPermission('user', 'posts', 'read')

pm.createRole('editor')
pm.grantPermission('editor', 'posts', 'read')  // 重复
pm.grantPermission('editor', 'posts', 'write')
```

### 5. 权限命名规范

```typescript
// ✅ REST 风格
'users:create', 'users:read', 'users:update', 'users:delete'
'posts:list', 'posts:view', 'posts:edit'

// ✅ CRUD 风格  
'users:c', 'users:r', 'users:u', 'users:d'

// 保持一致性
```

## 性能优化

### 1. 缓存权限检查

```typescript
const pm = createPermissionManager({
  enableCache: true,
  cache: {
    maxSize: 1000,
    ttl: 5 * 60 * 1000  // 5分钟
  }
})
```

### 2. 批量操作

```typescript
// ✅ 批量检查
pm.checkMultiple(userId, permissions)

// ❌ 多次单独检查
permissions.forEach(p => pm.check(userId, p.resource, p.action))
```

### 3. 预加载用户权限

```typescript
// 用户登录时预加载
async function onUserLogin(userId: string) {
  const roles = pm.getUserRoles(userId)
  // 触发权限加载到缓存
  roles.forEach(role => {
    pm.getRolePermissions(role, true)
  })
}
```

## 示例场景

### 博客系统

```typescript
// 定义角色
pm.createRole('guest')
pm.grantPermission('guest', 'posts', 'read')

pm.createRole('user', { inherits: ['guest'] })
pm.grantPermission('user', 'comments', 'create')

pm.createRole('author', { inherits: ['user'] })
pm.grantPermission('author', 'posts', 'create')
pm.grantPermission('author', 'posts', 'update')

pm.createRole('editor', { inherits: ['author'] })
pm.grantPermission('editor', 'posts', 'delete')
pm.grantPermission('editor', 'users', 'read')

pm.createRole('admin', { inherits: ['editor'] })
pm.grantPermission('admin', '*', '*')
```

### 企业系统

```typescript
// 部门角色
pm.createRole('employee')
pm.grantPermission('employee', 'documents', 'read')

pm.createRole('hr', { inherits: ['employee'] })
pm.grantPermission('hr', 'employees', '*')

pm.createRole('finance', { inherits: ['employee'] })
pm.grantPermission('finance', 'invoices', '*')
pm.grantPermission('finance', 'payments', '*')

pm.createRole('manager', { inherits: ['employee'] })
pm.grantPermission('manager', 'team', '*')
pm.grantPermission('manager', 'reports', 'read')
```

## 下一步

- [ABAC 指南](./abac.md) - 了解基于属性的权限
- [路由守卫](./route-guards.md) - 在路由中使用权限
- [API 文档](../api/) - 完整的 API 参考

