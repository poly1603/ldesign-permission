# @ldesign/permission 完整项目计划书

<div align="center">

# 🔒 @ldesign/permission v0.1.0

**权限管理系统 - RBAC/ABAC、路由权限守卫、按钮级权限控制**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](./tsconfig.json)
[![Models](https://img.shields.io/badge/models-RBAC%2BABAC-green.svg)](#功能清单)
[![Integration](https://img.shields.io/badge/integration-Router%2BCache-blue.svg)](#技术栈)

</div>

---

## 🚀 快速导航

| 想要... | 查看章节 | 预计时间 |
|---------|---------|---------|
| 📖 了解权限系统 | [项目概览](#项目概览) | 3 分钟 |
| 🔍 查看参考项目 | [参考项目分析](#参考项目深度分析) | 15 分钟 |
| ✨ 查看功能清单 | [功能清单](#功能清单) | 20 分钟 |
| 🏗️ 了解架构 | [架构设计](#架构设计) | 12 分钟 |
| 🗺️ 查看路线图 | [开发路线图](#开发路线图) | 10 分钟 |

---

## 📊 项目全景图

```
┌──────────────────────────────────────────────────────────────┐
│            @ldesign/permission - 权限系统全景                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🎯 核心能力                                                  │
│  ├─ 👥 RBAC（基于角色的访问控制）                            │
│  ├─ 🎯 ABAC（基于属性的访问控制）                            │
│  ├─ 🛡️ 路由权限守卫                                          │
│  ├─ 🔘 按钮级权限控制                                         │
│  └─ 📊 数据权限过滤                                           │
│                                                              │
│  🔐 权限模型                                                  │
│  ├─ 角色（Role）                                             │
│  │   └─ admin, user, guest, custom...                      │
│  ├─ 权限（Permission）                                       │
│  │   └─ resource:action (users:read, posts:write)          │
│  ├─ 资源（Resource）                                         │
│  │   └─ users, posts, settings, ...                        │
│  └─ 操作（Action）                                           │
│      └─ create, read, update, delete, *                    │
│                                                              │
│  ⚡ 性能特性                                                  │
│  ├─ 💨 权限缓存（LRU Cache）                                 │
│  ├─ 🚀 快速检查（<1ms）                                      │
│  ├─ 📦 权限预加载                                            │
│  └─ 🔄 变更监听（实时更新）                                  │
│                                                              │
│  🔧 高级功能                                                  │
│  ├─ 🎨 权限可视化配置                                         │
│  ├─ 📋 权限矩阵管理                                           │
│  ├─ 🔗 权限继承                                              │
│  ├─ ⏱️ 临时权限                                              │
│  └─ 📊 权限审计日志                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 项目概览

### 核心价值主张

@ldesign/permission 是一个**企业级权限管理系统**，提供：

1. **双权限模型** - RBAC + ABAC，灵活强大
2. **细粒度控制** - 路由、按钮、数据三级权限
3. **高性能** - 权限缓存，<1ms 检查速度
4. **实时更新** - 权限变更实时生效
5. **框架集成** - Vue/React 指令和组件
6. **可视化配置** - 权限管理后台

### 解决的问题

- ❌ **权限散落各处** - 权限检查代码重复，难以维护
- ❌ **缺少统一模型** - 没有标准的权限模型
- ❌ **细粒度控制难** - 按钮级权限难以实现
- ❌ **权限配置复杂** - 需要编写大量代码
- ❌ **变更不实时** - 权限更新需要刷新

### 我们的解决方案

- ✅ **统一权限中心** - 集中管理所有权限
- ✅ **RBAC + ABAC** - 灵活的双模型
- ✅ **三级权限** - 路由/按钮/数据全覆盖
- ✅ **声明式配置** - 简单的配置语法
- ✅ **实时生效** - 权限变更立即生效

---

## 📚 参考项目深度分析

### 1. casbin (★★★★★)

**项目信息**:
- GitHub: https://github.com/casbin/casbin
- Stars: 17,000+
- 定位: 权限管理框架
- 语言: Go（有 Node.js 版本）

**核心特点**:
- ✅ 多种权限模型（RBAC/ABAC/RESTful）
- ✅ 策略语言（PERM）
- ✅ 适配器模式（支持多种存储）
- ✅ 强大的规则引擎
- ✅ 权限继承
- ✅ 角色层级

**借鉴要点**:
1. **PERM 模型** - Subject, Object, Action
2. **策略规则** - p, alice, data1, read
3. **角色分配** - g, alice, admin
4. **匹配器** - m = r.sub == p.sub && r.obj == p.obj
5. **效果** - e = some(where (p.eft == allow))

**功能借鉴**:
- [ ] RBAC 模型完整实现
- [ ] ABAC 属性权限
- [ ] 策略语言设计
- [ ] 适配器模式
- [ ] 规则引擎

**改进方向**:
- ➕ 更简洁的 API（casbin 较复杂）
- ➕ 浏览器优化
- ➕ Vue/React 深度集成
- ➕ 可视化配置

### 2. accesscontrol (★★★★☆)

**项目信息**:
- GitHub: https://github.com/onury/accesscontrol
- Stars: 2,200+
- 定位: Node.js RBAC 库
- 特色: 链式 API

**核心特点**:
- ✅ 纯 RBAC 实现
- ✅ 链式 API
- ✅ 属性过滤（field filtering）
- ✅ 角色继承
- ✅ 权限合并
- ✅ TypeScript 支持

**借鉴要点**:
1. **Grant 对象** - ac.grant('admin').createOwn('post')
2. **链式 API** - ac.can('user').createOwn('post')
3. **属性过滤** - 过滤返回字段
4. **继承机制** - 角色继承
5. **权限合并** - extend() 合并权限

**功能借鉴**:
- [x] RBAC 基础（已实现）
- [ ] 链式 API
- [ ] 属性过滤
- [ ] 角色继承
- [ ] 权限合并

**改进方向**:
- ➕ ABAC 支持（accesscontrol 只有 RBAC）
- ➕ 路由集成
- ➕ 缓存优化

### 3. casl (★★★★★)

**项目信息**:
- GitHub: https://github.com/stalniy/casl
- Stars: 5,000+
- 定位: ABAC 权限库
- 特色: 灵活强大

**核心特点**:
- ✅ ABAC 完整实现
- ✅ 条件权限（condition-based）
- ✅ 字段级权限
- ✅ 多框架支持（Vue/React/Angular）
- ✅ MongoDB 查询风格
- ✅ TypeScript 完整支持

**借鉴要点**:
1. **Ability 类** - defineAbility() 定义权限
2. **条件权限** - can('update', 'Post', { authorId: userId })
3. **字段权限** - can('read', 'User', ['email', 'name'])
4. **规则构建器** - 链式定义规则
5. **Vue/React 集成** - <Can I="read" a="Post">

**功能借鉴**:
- [ ] ABAC 模型实现
- [ ] 条件权限
- [ ] 字段级权限
- [ ] 规则构建器
- [ ] 框架指令/组件

**改进方向**:
- ➕ RBAC 集成（casl 主要 ABAC）
- ➕ 路由守卫
- ➕ 权限缓存

### 4. vue-acl (★★★☆☆)

**项目信息**:
- GitHub: https://github.com/leonardovilarinho/vue-acl
- Stars: 400+
- 定位: Vue 权限插件

**核心特点**:
- ✅ Vue 2/3 支持
- ✅ 路由守卫
- ✅ v-can 指令
- ✅ 角色和权限
- ✅ 简单易用

**借鉴要点**:
1. **v-can 指令** - v-can:read="'posts'"
2. **路由 meta** - meta: { permission: 'admin' }
3. **全局守卫** - router.beforeEach 集成
4. **Plugin API** - Vue.use(VueAcl)
5. **$can 方法** - this.$can('read', 'posts')

**功能借鉴**:
- [ ] Vue 指令（v-can）
- [ ] 路由守卫集成
- [ ] Vue Plugin API
- [ ] 全局 $can 方法

**改进方向**:
- ➕ React 支持
- ➕ ABAC 模型
- ➕ 更强大的规则引擎

### 5. react-rbac (★★★☆☆)

**项目信息**:
- GitHub: 多个实现
- 定位: React RBAC 组件

**核心特点**:
- ✅ React 组件
- ✅ HOC 支持
- ✅ Hooks API
- ✅ 权限上下文

**借鉴要点**:
1. **<Can> 组件** - <Can I="read" a="posts">
2. **usePermission Hook** - const canRead = usePermission('read', 'posts')
3. **withPermission HOC** - withPermission('admin')(Component)
4. **PermissionProvider** - Context 提供者
5. **权限检查** - 声明式 + 命令式

**功能借鉴**:
- [ ] React 组件（<Can>）
- [ ] usePermission Hook
- [ ] withPermission HOC
- [ ] PermissionProvider
- [ ] 权限上下文

**改进方向**:
- ➕ Vue 支持
- ➕ ABAC 模型
- ➕ 路由集成

### 参考项目功能对比

| 功能 | casbin | accesscontrol | casl | vue-acl | react-rbac | **@ldesign/permission** |
|------|--------|---------------|------|---------|------------|------------------------|
| RBAC | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| ABAC | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ 🎯 |
| 条件权限 | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ 🎯 |
| 字段权限 | ⚠️ | ✅ | ✅ | ❌ | ❌ | ✅ 🎯 |
| Vue 支持 | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ 🎯 |
| React 支持 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ 🎯 |
| 路由守卫 | ❌ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ 🎯 |
| 权限缓存 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 🎯 |
| 可视化配置 | 有(第三方) | ❌ | ❌ | ❌ | ❌ | ✅ 计划 🎯 |
| TypeScript | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |

**总结**: @ldesign/permission 结合 RBAC（casbin/accesscontrol）+ ABAC（casl）+ 框架集成（vue-acl/react-rbac）。

---

## ✨ 功能清单

### P0 核心功能（20项）

#### RBAC 基础

- [x] **角色管理** - Role Management（参考: accesscontrol）
  - ✅ 添加角色
  - ✅ 删除角色
  - [ ] 角色列表
  - [ ] 角色查询

- [x] **权限管理** - Permission Management（参考: casbin）
  - ✅ 添加权限（resource:action）
  - ✅ 删除权限
  - [ ] 权限列表
  - [ ] 批量添加

- [x] **权限检查** - Permission Check（参考: 所有）
  - ✅ hasPermission(resource, action)
  - ✅ 通配符支持（resource:*）
  - [ ] 批量检查
  - [ ] 缓存检查结果

- [ ] **角色分配** - Role Assignment（参考: casbin）
  - 用户 → 角色映射
  - addRoleToUser(userId, role)
  - removeRoleFromUser(userId, role)
  - getUserRoles(userId)

- [ ] **权限分配** - Permission Assignment（参考: accesscontrol）
  - 角色 → 权限映射
  - grantPermission(role, resource, action)
  - revokePermission(role, resource, action)
  - getRolePermissions(role)

#### ABAC 基础

- [ ] **属性权限** - Attribute-Based（参考: casl）
  - can('update', 'Post', { authorId: currentUserId })
  - 条件表达式
  - 属性匹配

- [ ] **上下文权限** - Context-Based（参考: casl）
  - 基于时间（工作时间）
  - 基于位置（IP/地理位置）
  - 基于环境（生产/测试）

- [ ] **字段级权限** - Field-Level（参考: casl, accesscontrol）
  - 可见字段控制
  - 可编辑字段控制
  - 字段过滤

#### 路由权限

- [ ] **路由守卫** - Route Guard（参考: vue-acl）
  - Vue Router 集成
  - beforeEach 守卫
  - 路由 meta 配置
  - 未授权重定向

- [ ] **路由权限配置** - Route Permission（参考: vue-acl）
  ```typescript
  {
    path: '/admin',
    meta: { 
      permission: 'admin',
      // 或
      permissions: ['users:read', 'posts:read']
    }
  }
  ```

#### 组件级权限

- [ ] **Vue 指令** - v-can（参考: vue-acl）
  - v-can="'users:read'"
  - v-can:read="'users'"
  - v-can.any="['users:read', 'posts:read']"
  - v-can.all="['users:read', 'users:write']"

- [ ] **React 组件** - <Can>（参考: casl, react-rbac）
  ```tsx
  <Can I="read" a="users">
    <UserList />
  </Can>
  ```

- [ ] **React Hook** - usePermission（参考: react-rbac）
  ```tsx
  const canRead = usePermission('read', 'users')
  ```

- [ ] **Vue Composable** - usePermission（参考: casl + vue）
  ```typescript
  const { can, cannot } = usePermission()
  const canRead = can('read', 'users')
  ```

#### 数据权限

- [ ] **数据过滤** - Data Filtering（参考: casl）
  - 过滤列表数据
  - 过滤对象字段
  - 查询条件生成

### P1 高级功能（15项）

#### 高级 RBAC

- [ ] **角色继承** - Role Inheritance（参考: accesscontrol）
  - 父子角色
  - 权限继承
  - 多重继承
  - 继承链查询

- [ ] **角色层级** - Role Hierarchy（参考: casbin）
  - 层级定义
  - 层级权限计算
  - 层级可视化

- [ ] **权限合并** - Permission Merge（参考: accesscontrol）
  - 多角色权限合并
  - 权限冲突解决
  - 优先级处理

#### 高级 ABAC

- [ ] **复杂条件** - Complex Conditions（参考: casl）
  - AND/OR/NOT 逻辑
  - 嵌套条件
  - 条件表达式

- [ ] **动态属性** - Dynamic Attributes（参考: casl）
  - 运行时属性
  - 计算属性
  - 属性函数

#### 权限缓存

- [ ] **LRU 缓存** - Permission Cache（参考: 自研 + @ldesign/cache）
  - 检查结果缓存
  - 自动失效
  - 缓存统计

- [ ] **预加载** - Permission Preload
  - 用户权限预加载
  - 角色权限预加载
  - 智能预测

#### 权限变更

- [ ] **实时更新** - Real-time Update（参考: @ldesign/websocket）
  - WebSocket 推送
  - 权限变更通知
  - 自动刷新缓存

- [ ] **变更监听** - Change Listener
  - on('permissionChanged')
  - on('roleChanged')
  - 响应式权限

#### 审计日志

- [ ] **权限审计** - Permission Audit（参考: casbin）
  - 权限检查日志
  - 权限变更日志
  - 审计报告

### P2 扩展功能（12项）

#### 可视化配置

- [ ] **权限管理后台** - Admin Panel
  - 角色管理界面
  - 权限管理界面
  - 用户-角色分配
  - 角色-权限分配

- [ ] **权限矩阵** - Permission Matrix
  - 表格展示所有权限
  - 拖拽分配权限
  - 批量操作

- [ ] **可视化规则编辑器** - Rule Editor
  - 拖拽构建规则
  - 条件表达式编辑
  - 实时预览

#### 高级特性

- [ ] **临时权限** - Temporary Permission
  - 时间限制权限
  - 自动过期
  - 临时提权

- [ ] **权限模板** - Permission Template
  - 预定义角色模板
  - 快速分配
  - 模板市场

- [ ] **权限导入导出** - Import/Export
  - JSON 格式
  - Excel 格式
  - 权限迁移

#### 集成功能

- [ ] **与 @ldesign/auth 集成** - Auth Integration
  - 自动加载用户权限
  - Token 中携带权限
  - 权限同步

- [ ] **与 @ldesign/router 集成** - Router Integration
  - 路由守卫自动注册
  - 动态路由生成
  - 菜单权限过滤

---

## 🏗️ 架构设计

### 整体架构

```
┌────────────────────────────────────────────────────────┐
│              @ldesign/permission                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ PermissionManager│ ────▶│  PolicyEngine   │       │
│  │                  │      │                  │       │
│  │ - addPermission()│      │ - evaluate()     │       │
│  │ - hasPermission()│      │ - match()        │       │
│  │ - addRole()      │      │ - resolve()      │       │
│  └──────────────────┘      └──────────────────┘       │
│         │                           │                  │
│         ▼                           ▼                  │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   RBACEngine     │      │   ABACEngine     │       │
│  │                  │      │                  │       │
│  │ - Role 管理      │      │ - Attribute 匹配 │       │
│  │ - Permission 管理│      │ - Condition 求值 │       │
│  │ - Inheritance    │      │ - Context 处理   │       │
│  └──────────────────┘      └──────────────────┘       │
│                                                        │
│  ┌────────────────────────────────────────────┐      │
│  │           辅助系统                          │      │
│  ├─ PermissionCache（缓存）                    │      │
│  ├─ PermissionStore（存储）                    │      │
│  ├─ EventEmitter（事件）                       │      │
│  └─ AuditLogger（审计）                        │      │
│  └────────────────────────────────────────────┘      │
│                                                        │
│  ┌────────────────────────────────────────────┐      │
│  │          框架集成层                         │      │
│  ├─ Vue 指令（v-can）                          │      │
│  ├─ Vue Composable（usePermission）            │      │
│  ├─ React Component（<Can>）                   │      │
│  ├─ React Hook（usePermission）                │      │
│  └─ Router 守卫                                │      │
│  └────────────────────────────────────────────┘      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 核心类设计

```typescript
// 权限管理器
class PermissionManager {
  // RBAC
  addRole(role: string, permissions?: string[]): void
  removeRole(role: string): void
  addRoleToUser(userId: string, role: string): void
  hasRole(userId: string, role: string): boolean
  
  // 权限
  addPermission(resource: string, action: string): void
  hasPermission(resource: string, action: string): boolean
  checkPermission(permission: Permission): boolean
  
  // ABAC
  can(action: string, resource: string, attributes?: object): boolean
  cannot(action: string, resource: string, attributes?: object): boolean
  
  // 高级
  defineAbility(rules: AbilityRule[]): void
  checkAbility(ability: Ability, subject: Subject): boolean
}

// 策略引擎
class PolicyEngine {
  evaluate(policy: Policy, context: Context): boolean
  match(rule: Rule, request: Request): boolean
  resolve(conflicts: Permission[]): Permission
}

// RBAC 引擎
class RBACEngine {
  private roles: Map<string, Role>
  private permissions: Map<string, Permission>
  
  grant(role: string, permission: string): void
  revoke(role: string, permission: string): void
  check(roles: string[], permission: string): boolean
  inherit(child: string, parent: string): void
}

// ABAC 引擎
class ABACEngine {
  private rules: AbilityRule[]
  
  evaluate(action: string, subject: any, context: Context): boolean
  matchAttributes(rule: Rule, subject: any): boolean
  evaluateCondition(condition: Condition, context: Context): boolean
}
```

### 数据模型

```typescript
// 角色
interface Role {
  name: string
  permissions: Permission[]
  inherit?: string[]
  metadata?: object
}

// 权限
interface Permission {
  resource: string
  action: string
  conditions?: Condition[]
  fields?: string[]
}

// ABAC 规则
interface AbilityRule {
  action: string
  subject: string
  conditions?: Condition[]
  fields?: string[]
  inverted?: boolean
  reason?: string
}

// 条件
interface Condition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains'
  value: any
}

// 上下文
interface Context {
  user: User
  time?: Date
  ip?: string
  location?: string
  [key: string]: any
}
```

---

## 🛠️ 技术栈

### 核心技术

- **TypeScript 5.7+**
- **权限模型**: RBAC + ABAC
- **缓存策略**: LRU Cache

### 内部依赖

```json
{
  "dependencies": {
    "@ldesign/auth": "workspace:*",      // 用户认证
    "@ldesign/router": "workspace:*",    // 路由守卫
    "@ldesign/cache": "workspace:*",     // 权限缓存
    "@ldesign/shared": "workspace:*"     // 工具函数
  }
}
```

---

## 🗺️ 开发路线图

### v0.1.0 - MVP（当前）✅

**已完成**:
- [x] PermissionManager 基础类
- [x] RBAC 基础（角色、权限）
- [x] 权限检查（hasPermission）
- [x] 基础类型定义

**待完善**:
- [ ] 角色管理完整
- [ ] 用户-角色关联
- [ ] 单元测试
- [ ] 文档

**Bundle**: ~15KB

### v0.2.0 - RBAC 完整（3-4周）

**功能**:
- [ ] 完整的 RBAC 实现
  - 角色 CRUD
  - 权限 CRUD
  - 用户-角色关联
  - 角色-权限关联

- [ ] 角色继承
  - 父子角色
  - 继承链
  - 权限合并

- [ ] 权限缓存
  - LRU 缓存
  - 缓存失效
  - 性能优化

- [ ] Vue 集成
  - v-can 指令
  - usePermission composable
  - 路由守卫

- [ ] 完整测试和文档

**Bundle**: <20KB

### v0.3.0 - ABAC 支持（4-5周）

**功能**:
- [ ] ABAC 引擎
  - 属性权限
  - 条件表达式
  - 上下文处理

- [ ] 字段级权限
  - 字段可见性
  - 字段过滤
  - 字段验证

- [ ] React 集成
  - <Can> 组件
  - usePermission hook
  - withPermission HOC

- [ ] 高级路由守卫
  - 动态路由
  - 菜单权限过滤

- [ ] 数据权限
  - 数据过滤
  - 查询条件生成

**Bundle**: <25KB

### v1.0.0 - 生产就绪（10-12周）

**功能**:
- [ ] 权限管理后台
  - 可视化配置
  - 权限矩阵
  - 规则编辑器

- [ ] 高级特性
  - 临时权限
  - 权限模板
  - 导入导出

- [ ] 完整集成
  - Auth 集成
  - Router 集成
  - 审计日志

- [ ] 性能优化
  - 权限预加载
  - 智能缓存
  - 批量检查

- [ ] 完整文档
  - API 文档
  - 使用指南
  - 最佳实践

**Bundle**: <30KB

---

## 📋 详细任务分解

### Week 1-2: v0.1.0 完善

#### Week 1: RBAC 完整实现

**Day 1-2**: 角色管理（16h）
- [ ] Role 类实现
- [ ] 角色 CRUD API
- [ ] 角色存储
- [ ] 单元测试

**Day 3-4**: 用户-角色关联（16h）
- [ ] UserRole 映射
- [ ] addRoleToUser/removeRoleFromUser
- [ ] getUserRoles
- [ ] 单元测试

**Day 5**: 权限分配（8h）
- [ ] 角色-权限映射
- [ ] grantPermission/revokePermission
- [ ] 单元测试

#### Week 2: 缓存和文档

**Day 1-2**: 权限缓存（16h）
- [ ] LRU Cache 集成
- [ ] 缓存键设计
- [ ] 缓存失效策略
- [ ] 性能测试

**Day 3-5**: 文档（24h）
- [ ] README 完善
- [ ] API 文档
- [ ] 使用指南
- [ ] 示例代码

### Week 3-6: v0.2.0 Vue 集成

#### Week 3: v-can 指令

**Day 1-3**: 指令实现（24h）
- [ ] v-can 基础指令
- [ ] 修饰符支持（.any/.all）
- [ ] 表达式解析
- [ ] 单元测试

**Day 4-5**: 指令高级功能（16h）
- [ ] 动态权限
- [ ] 条件渲染
- [ ] 性能优化

#### Week 4: Composable

**Day 1-3**: usePermission（24h）
- [ ] usePermission composable
- [ ] 响应式权限
- [ ] 权限订阅
- [ ] 单元测试

**Day 4-5**: 其他 Composables（16h）
- [ ] useRole
- [ ] useAbility
- [ ] 文档

#### Week 5: 路由守卫

**Day 1-3**: 路由集成（24h）
- [ ] Router 守卫实现
- [ ] Meta 配置解析
- [ ] 未授权处理
- [ ] E2E 测试

**Day 4-5**: 高级路由（16h）
- [ ] 动态路由
- [ ] 菜单过滤
- [ ] 面包屑权限

#### Week 6: 测试和文档

**Day 1-3**: 完整测试（24h）
- [ ] 单元测试补充
- [ ] 集成测试
- [ ] E2E 测试

**Day 4-5**: 完整文档（16h）
- [ ] Vue 集成文档
- [ ] 示例补充
- [ ] 最佳实践

### Week 7-11: v0.3.0 ABAC + React

#### Week 7-8: ABAC 引擎（80h）

**任务 7.1**: ABAC 核心（40h）
- [ ] AbilityRule 定义
- [ ] 属性匹配算法
- [ ] 条件求值引擎
- [ ] 单元测试

**任务 8.1**: 字段权限（40h）
- [ ] 字段级控制
- [ ] 字段过滤器
- [ ] 数据脱敏
- [ ] 测试

#### Week 9-10: React 集成（80h）

**任务 9.1**: React 组件（40h）
- [ ] <Can> 组件
- [ ] <Cannot> 组件
- [ ] 单元测试

**任务 10.1**: React Hooks（40h）
- [ ] usePermission hook
- [ ] useAbility hook
- [ ] useRole hook
- [ ] 文档

#### Week 11: 数据权限（40h）

- [ ] 数据过滤器
- [ ] 查询条件生成
- [ ] 集成测试
- [ ] 文档

### Week 12-20: v1.0.0 完整功能

#### Week 12-14: 管理后台（120h）

**任务 12.1**: 角色管理（40h）
- [ ] 角色列表
- [ ] 角色编辑
- [ ] 权限分配

**任务 13.1**: 权限矩阵（40h）
- [ ] 矩阵展示
- [ ] 批量编辑
- [ ] 导入导出

**任务 14.1**: 规则编辑器（40h）
- [ ] 可视化编辑
- [ ] 条件构建
- [ ] 实时预览

#### Week 15-16: 高级功能（80h）

- [ ] 临时权限（20h）
- [ ] 权限模板（20h）
- [ ] 审计日志（20h）
- [ ] 性能优化（20h）

#### Week 17-19: 完善和优化（120h）

- [ ] 完整测试（40h）
- [ ] 性能优化（40h）
- [ ] 文档完善（40h）

#### Week 20: 发布准备（40h）

- [ ] 版本发布
- [ ] NPM 发布
- [ ] 文档网站

---

## 🧪 测试策略

### 单元测试

**覆盖率目标**: >85%

**测试内容**:
- PermissionManager 所有方法
- RBACEngine 权限检查
- ABACEngine 条件求值
- 缓存系统
- Vue 指令
- React 组件和 Hooks

**示例**:
```typescript
describe('PermissionManager', () => {
  it('checks permission correctly', () => {
    const pm = new PermissionManager()
    pm.addPermission('users', 'read')
    
    expect(pm.hasPermission('users', 'read')).toBe(true)
    expect(pm.hasPermission('users', 'write')).toBe(false)
  })
  
  it('supports wildcard', () => {
    pm.addPermission('users', '*')
    expect(pm.hasPermission('users', 'read')).toBe(true)
    expect(pm.hasPermission('users', 'write')).toBe(true)
  })
})
```

### 集成测试

**测试场景**:
- Vue 项目集成
- React 项目集成
- Router 集成
- Auth 集成

### E2E 测试

**工具**: Playwright

**场景**:
- 路由权限守卫
- 按钮权限控制
- 页面元素显示/隐藏
- 权限变更实时生效

---

## 📊 性能目标

### 性能基准

| 版本 | 权限检查 | 缓存命中 | Bundle 大小 |
|------|---------|---------|------------|
| v0.1.0 | <5ms | N/A | ~15KB |
| v0.2.0 | <2ms | <0.5ms | <20KB |
| v0.3.0 | <1ms | <0.3ms | <25KB |
| v1.0.0 | **<0.5ms** | **<0.1ms** | **<30KB** |

### 性能优化策略

1. **权限缓存** - LRU 缓存检查结果
2. **权限预加载** - 登录时预加载用户权限
3. **批量检查** - 一次检查多个权限
4. **惰性求值** - 遇到允许即返回
5. **位运算优化** - 使用位运算加速检查

---

## 📦 API 设计预览

### 基础 API

```typescript
import { createPermissionManager } from '@ldesign/permission'

const permission = createPermissionManager()

// RBAC
permission.addRole('admin')
permission.addRoleToUser('user123', 'admin')
permission.grantPermission('admin', 'users', 'read')

if (permission.hasPermission('users', 'read')) {
  // 允许操作
}

// ABAC
permission.defineAbility([
  {
    action: 'update',
    subject: 'Post',
    conditions: { authorId: '{{ userId }}' }
  }
])

if (permission.can('update', post)) {
  // 允许更新
}
```

### Vue 集成

```vue
<template>
  <!-- 指令方式 -->
  <button v-can="'users:write'">编辑用户</button>
  <button v-can:delete="'users'">删除用户</button>
  
  <!-- Composable 方式 -->
  <button v-if="canWrite">编辑</button>
</template>

<script setup>
import { usePermission } from '@ldesign/permission/vue'

const { can, cannot } = usePermission()
const canWrite = can('write', 'users')
</script>
```

### React 集成

```tsx
import { Can, usePermission } from '@ldesign/permission/react'

function UserList() {
  const canWrite = usePermission('write', 'users')
  
  return (
    <div>
      {/* 组件方式 */}
      <Can I="write" a="users">
        <button>编辑用户</button>
      </Can>
      
      {/* Hook 方式 */}
      {canWrite && <button>编辑</button>}
    </div>
  )
}
```

### 路由守卫

```typescript
// Vue Router
import { createPermissionGuard } from '@ldesign/permission/vue'

router.beforeEach(createPermissionGuard({
  permission: permission,
  redirect: '/403'
}))

// 路由配置
{
  path: '/admin',
  meta: {
    permission: 'admin',
    // 或
    permissions: ['users:read', 'posts:read'],
    // 或 ABAC
    ability: { action: 'access', subject: 'AdminPanel' }
  }
}
```

---

## ✅ 开发检查清单

### 功能完成度

**v0.1.0** (当前):
- [x] 基础功能: 5/20 (25%)
- [ ] RBAC: 3/10 (30%)
- [ ] ABAC: 0/8 (0%)
- [ ] 框架集成: 0/6 (0%)

**v0.2.0** (目标):
- [ ] RBAC: 0/10 (100%)
- [ ] 缓存: 0/3
- [ ] Vue 集成: 0/6
- [ ] 测试: 0/85%

**v0.3.0** (目标):
- [ ] ABAC: 0/8 (100%)
- [ ] React 集成: 0/5
- [ ] 数据权限: 0/4

**v1.0.0** (目标):
- [ ] 管理后台: 0/1
- [ ] 高级功能: 0/8
- [ ] 完整文档: 0/100%

### 质量指标

- [ ] 测试覆盖率: 0% / >85%
- [ ] 权限检查性能: 当前 未测 / 目标 <0.5ms
- [ ] 文档完整性: 20% / 100%
- [ ] TypeScript 类型: 30% / 100%

---

**文档版本**: 1.0  
**创建时间**: 2025-10-22  
**预计完成**: v1.0.0 在 Week 20






