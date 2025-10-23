# 快速开始

欢迎使用 @ldesign/permission！本指南将帮助你快速上手这个强大的权限管理系统。

## 安装

```bash
# pnpm
pnpm add @ldesign/permission

# npm
npm install @ldesign/permission

# yarn
yarn add @ldesign/permission
```

## 基础概念

@ldesign/permission 支持三种权限模型：

1. **RBAC（基于角色）** - 通过角色管理权限
2. **ABAC（基于属性）** - 通过条件和属性控制权限
3. **策略引擎** - 通过策略规则管理权限

## 第一个例子

### 1. 创建权限管理器

```typescript
import { createPermissionManager } from '@ldesign/permission'

const pm = createPermissionManager({
  enableCache: true,    // 启用缓存
  enableAudit: true,    // 启用审计
  enableEvents: true,   // 启用事件
})
```

### 2. 创建角色和权限

```typescript
// 创建角色
pm.createRole('admin', {
  displayName: '管理员',
  description: '系统管理员，拥有所有权限'
})

pm.createRole('user', {
  displayName: '普通用户',
  description: '只能查看内容'
})

// 授予权限
pm.grantPermission('admin', 'users', '*')      // 管理员：所有用户操作
pm.grantPermission('admin', 'posts', '*')      // 管理员：所有文章操作
pm.grantPermission('user', 'posts', 'read')    // 用户：只能读文章
```

### 3. 分配角色

```typescript
// 给用户分配角色
pm.assignRole('alice', 'admin')
pm.assignRole('bob', 'user')
```

### 4. 检查权限

```typescript
// 检查权限
const result = pm.check('alice', 'users', 'delete')
console.log(result.allowed)  // true

const result2 = pm.check('bob', 'users', 'delete')
console.log(result2.allowed) // false

// 快速检查
pm.checkPermission('alice', 'users:read')  // true
pm.hasRole('alice', 'admin')               // true
```

## 权限格式

权限使用 `resource:action` 格式：

```typescript
'users:read'     // 读取用户
'posts:write'    // 写入文章
'admin:*'        // 管理员所有操作
'*:read'         // 读取所有资源
```

## 角色继承

角色可以继承其他角色的权限：

```typescript
// 创建基础角色
pm.createRole('user')
pm.grantPermission('user', 'posts', 'read')

// 创建继承角色
pm.createRole('editor', {
  inherits: ['user']  // 继承 user 的所有权限
})
pm.grantPermission('editor', 'posts', 'write')

// editor 现在拥有 read 和 write 权限
pm.assignRole('charlie', 'editor')
pm.check('charlie', 'posts', 'read').allowed   // true（继承的）
pm.check('charlie', 'posts', 'write').allowed  // true（自己的）
```

## ABAC - 基于属性的权限

```typescript
// 定义规则：用户只能编辑自己的文章
pm.defineAbility([
  {
    action: 'update',
    subject: 'Post',
    conditions: {
      field: 'authorId',
      operator: 'eq',
      value: '{{userId}}'  // 动态值
    }
  }
])

// 检查
const post = { type: 'Post', authorId: 'alice' }
pm.can('update', post, { user: { id: 'alice' } })  // true
pm.can('update', post, { user: { id: 'bob' } })    // false
```

## 批量操作

```typescript
// 批量检查
const results = pm.checkMultiple('alice', [
  { resource: 'users', action: 'read' },
  { resource: 'posts', action: 'write' },
])

// 检查任意一个
pm.checkAny('alice', [
  { resource: 'users', action: 'read' },
  { resource: 'posts', action: 'read' },
])  // true - 只要有一个满足

// 检查所有
pm.checkAll('bob', [
  { resource: 'posts', action: 'read' },
  { resource: 'posts', action: 'write' },
])  // false - 必须全部满足
```

## 下一步

- [RBAC 详细指南](./rbac.md) - 深入了解基于角色的权限
- [ABAC 详细指南](./abac.md) - 深入了解基于属性的权限
- [API 文档](../api/) - 完整的 API 参考
- [示例项目](../../examples/) - 更多实用示例

## 常见问题

### 如何定义资源和操作？

资源和操作完全由你定义，建议遵循 REST 风格：

```typescript
// 资源示例
'users', 'posts', 'comments', 'settings'

// 操作示例
'read', 'write', 'create', 'update', 'delete'

// 组合
'users:read', 'posts:create', 'settings:update'
```

### 通配符如何使用？

```typescript
'users:*'   // 用户的所有操作
'*:read'    // 所有资源的读取操作
'*:*'       // 所有权限（慎用！）
```

### 如何持久化权限数据？

```typescript
// 导出
const data = pm.export()
localStorage.setItem('permissions', data)

// 导入
const data = localStorage.getItem('permissions')
if (data) {
  pm.import(data)
}
```

## 性能提示

1. **启用缓存** - 可以显著提高权限检查速度
2. **批量检查** - 使用 `checkMultiple` 而不是多次单独检查
3. **预加载权限** - 在用户登录时加载所有权限

## 获取帮助

- [GitHub Issues](https://github.com/ldesign/ldesign/issues)
- [文档](../README.md)
- [示例项目](../../examples/)

