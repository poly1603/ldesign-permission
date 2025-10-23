# @ldesign/permission 项目结构

本文档详细说明了项目的文件结构和组织方式。

---

## 📁 目录结构

```
packages/permission/
├── src/                          # 源代码
│   ├── types/                    # 类型定义（100% 完成）
│   │   ├── core.ts              # 核心类型
│   │   ├── rbac.ts              # RBAC 类型
│   │   ├── abac.ts              # ABAC 类型
│   │   ├── policy.ts            # 策略类型
│   │   ├── cache.ts             # 缓存类型
│   │   ├── audit.ts             # 审计类型
│   │   └── index.ts             # 类型导出
│   │
│   ├── core/                     # 核心模块（100% 完成）
│   │   ├── rbac/                # RBAC 引擎
│   │   │   ├── RBACEngine.ts    # RBAC 核心引擎
│   │   │   ├── RoleManager.ts   # 角色管理器
│   │   │   ├── PermissionStore.ts # 权限存储
│   │   │   └── index.ts
│   │   │
│   │   ├── abac/                # ABAC 引擎
│   │   │   ├── ABACEngine.ts    # ABAC 核心引擎
│   │   │   ├── ConditionEvaluator.ts # 条件求值器
│   │   │   ├── AttributeMatcher.ts   # 属性匹配器
│   │   │   ├── ContextManager.ts     # 上下文管理器
│   │   │   └── index.ts
│   │   │
│   │   ├── policy/              # 策略引擎
│   │   │   ├── PolicyEngine.ts  # 策略引擎
│   │   │   ├── PolicyStore.ts   # 策略存储
│   │   │   ├── RuleBuilder.ts   # 规则构建器
│   │   │   └── index.ts
│   │   │
│   │   ├── events/              # 事件系统
│   │   │   ├── EventEmitter.ts  # 事件发射器
│   │   │   ├── PermissionEvents.ts # 事件定义
│   │   │   └── index.ts
│   │   │
│   │   ├── audit/               # 审计日志
│   │   │   ├── AuditLogger.ts   # 审计记录器
│   │   │   ├── AuditStore.ts    # 审计存储
│   │   │   └── index.ts
│   │   │
│   │   ├── cache/               # 权限缓存（待实现）
│   │   ├── data/                # 数据权限（待实现）
│   │   └── temporary/           # 临时权限（待实现）
│   │
│   ├── adapters/                 # 框架适配器（待实现）
│   │   ├── vue/                 # Vue 3 适配器
│   │   ├── react/               # React 适配器
│   │   └── shared/              # 共享工具
│   │
│   ├── admin/                    # 管理后台（待实现）
│   │   ├── views/               # 页面
│   │   ├── components/          # 组件
│   │   └── api/                 # API
│   │
│   └── index.ts                  # 主入口
│
├── examples/                     # 示例代码
│   ├── basic-usage.ts           # 基础用法示例
│   └── README.md                # 示例说明
│
├── __tests__/                    # 测试（待实现）
│   ├── core/                    # 核心测试
│   ├── adapters/                # 适配器测试
│   └── integration/             # 集成测试
│
├── docs/                         # 文档（待完善）
│   ├── guide/                   # 使用指南
│   ├── api/                     # API 文档
│   └── examples/                # 示例文档
│
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 项目说明
├── CHANGELOG.md                  # 更新日志
├── IMPLEMENTATION_STATUS.md      # 实现状态
├── PROJECT_STRUCTURE.md          # 本文件
└── 🎉_CORE_COMPLETED.md         # 完成报告
```

---

## 📦 模块说明

### 1. 类型定义模块 (`src/types/`)

**职责**: 提供完整的 TypeScript 类型定义

**已完成**:
- ✅ 核心类型（Role、Permission、User、CheckResult等）
- ✅ RBAC 类型（RoleHierarchy、RoleInheritance等）
- ✅ ABAC 类型（Condition、Context、AbilityRule等）
- ✅ 策略类型（Policy、Rule、Effect等）
- ✅ 缓存类型（CacheStrategy、CacheEntry等）
- ✅ 审计类型（AuditLogEntry、AuditStats等）

**导出**: 所有类型通过 `types/index.ts` 统一导出

---

### 2. RBAC 引擎 (`src/core/rbac/`)

**职责**: 基于角色的访问控制

**核心文件**:

#### RBACEngine.ts
- 角色 CRUD
- 权限 CRUD
- 用户-角色管理
- 角色-权限管理
- 权限检查（支持通配符）
- 批量操作

#### RoleManager.ts
- 角色继承管理
- 角色层级计算
- 权限合并
- 循环依赖检测
- 继承图管理

#### PermissionStore.ts
- 内存存储
- 持久化接口
- 导入/导出
- 统计信息

**使用示例**:
```typescript
const rbac = new RBACEngine()
rbac.createRole('admin')
rbac.grantPermission('admin', 'users', '*')
rbac.assignRole('user123', 'admin')
```

---

### 3. ABAC 引擎 (`src/core/abac/`)

**职责**: 基于属性的访问控制

**核心文件**:

#### ABACEngine.ts
- 能力规则管理
- 条件求值
- 字段级权限
- 规则优先级

#### ConditionEvaluator.ts
- 比较运算符（eq、ne、gt、lt、gte、lte、in、contains等）
- 逻辑运算符（and、or、not）
- 嵌套条件
- 深度路径访问

#### AttributeMatcher.ts
- 静态属性匹配
- 动态属性计算
- 类型匹配（string、number、boolean、date、array、object）
- 自定义匹配器

#### ContextManager.ts
- 用户上下文
- 环境上下文
- 资源上下文
- 上下文合并

**使用示例**:
```typescript
const abac = new ABACEngine()
abac.addRule({
  action: 'update',
  subject: 'Post',
  conditions: {
    field: 'authorId',
    operator: 'eq',
    value: '{{userId}}'
  }
})
```

---

### 4. 策略引擎 (`src/core/policy/`)

**职责**: 统一的策略管理和求值

**核心文件**:

#### PolicyEngine.ts
- 策略注册
- 策略评估
- 冲突解决
- 规则匹配

#### PolicyStore.ts
- 策略 CRUD
- 策略查询
- 策略验证

#### RuleBuilder.ts
- 链式 API
- 条件构建
- 规则验证

**使用示例**:
```typescript
const rule = allowRule()
  .subjects('admin')
  .resources('*')
  .actions('*')
  .priority(100)
  .build()

policyEngine.addPolicy({
  id: 'policy-1',
  name: '管理员策略',
  rules: [rule]
})
```

---

### 5. 权限管理器 (`src/core/PermissionManager.ts`)

**职责**: 统一的权限管理入口，集成所有引擎

**核心功能**:
- RBAC API 集成
- ABAC API 集成
- 策略 API 集成
- 统一权限检查
- 批量检查
- 字段过滤
- 当前用户管理
- 导入/导出

**使用示例**:
```typescript
const pm = createPermissionManager()

// RBAC
pm.createRole('admin')
pm.grantPermission('admin', 'users', '*')
pm.assignRole('user123', 'admin')

// ABAC
pm.defineAbility([...])

// 统一检查
pm.check('user123', 'users', 'delete')
```

---

### 6. 事件系统 (`src/core/events/`)

**职责**: 权限变更实时通知

**核心文件**:

#### EventEmitter.ts
- 发布/订阅模式
- 一次性监听
- 异步事件
- 最大监听器限制

#### PermissionEvents.ts
- 13种事件类型定义
- 类型安全的事件数据

**事件类型**:
- permission:granted
- permission:revoked
- role:assigned
- role:removed
- role:created
- role:updated
- role:deleted
- ability:added
- ability:removed
- policy:added
- policy:updated
- policy:deleted
- permission:checked

---

### 7. 审计日志 (`src/core/audit/`)

**职责**: 完整的权限审计

**核心文件**:

#### AuditLogger.ts
- 事件记录
- 权限检查日志
- 访问审计
- 自动清理
- 统计报告

#### AuditStore.ts
- 日志存储
- 高级查询
- 日志导出
- 自动清理

**使用示例**:
```typescript
const logger = new AuditLogger({
  enabled: true,
  retentionDays: 90
})

logger.logPermissionCheck(userId, resource, action, allowed)
const report = logger.generateReport(startDate, endDate)
```

---

## 🔄 数据流

### 权限检查流程

```
用户请求
   ↓
PermissionManager.check()
   ↓
1. RBAC 检查
   ├─ 获取用户角色
   ├─ 获取角色权限（含继承）
   └─ 匹配权限（含通配符）
   ↓
2. ABAC 检查（如果RBAC未通过）
   ├─ 构建上下文
   ├─ 匹配规则
   ├─ 求值条件
   └─ 检查字段权限
   ↓
3. 策略检查（如果ABAC未通过）
   ├─ 查找相关策略
   ├─ 评估规则
   └─ 解决冲突
   ↓
返回 CheckResult
```

### 角色继承链计算

```
用户角色: superadmin
   ↓
RoleManager.getAncestors()
   ↓
superadmin → admin → editor → user
   ↓
RoleManager.mergePermissions()
   ↓
合并所有权限 + 去重
   ↓
返回完整权限集
```

---

## 🎯 设计模式

### 1. 适配器模式
- 核心引擎框架无关
- 通过适配器集成各框架
- Vue/React 适配器独立

### 2. 策略模式
- 多种冲突解决策略
- 可扩展的权限检查策略
- 灵活的匹配策略

### 3. 观察者模式
- 事件系统
- 发布/订阅
- 权限变更通知

### 4. 建造者模式
- RuleBuilder
- 链式 API
- 流畅的规则构建

### 5. 单例模式
- PermissionManager
- 全局权限管理器
- 统一的入口点

---

## 📝 命名规范

### 文件命名
- PascalCase: `RBACEngine.ts`
- kebab-case: `permission-events.ts`（某些情况）

### 类命名
- PascalCase: `PermissionManager`
- 以功能命名: `RoleManager`、`PolicyEngine`

### 接口命名
- PascalCase: `Permission`
- I前缀（接口类）: `IAuditLogStore`

### 类型命名
- PascalCase: `CheckResult`
- 描述性: `PermissionGrantedEvent`

### 函数命名
- camelCase: `createRole`、`hasPermission`
- 动词开头: `check`、`grant`、`revoke`

---

## 🔧 开发指南

### 添加新功能

1. 在 `src/types/` 添加类型定义
2. 在相应模块实现功能
3. 在 `index.ts` 导出
4. 添加测试
5. 更新文档

### 修改核心引擎

1. 保持向后兼容
2. 更新类型定义
3. 添加单元测试
4. 更新 CHANGELOG

### 添加适配器

1. 在 `src/adapters/` 创建目录
2. 实现适配器逻辑
3. 导出到主入口
4. 添加示例

---

**文档版本**: 1.0  
**最后更新**: 2025-10-23



