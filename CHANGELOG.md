# Changelog

All notable changes to @ldesign/permission will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-23

### Added

#### 核心功能
- ✨ 完整的 TypeScript 类型系统
- ✨ RBAC 引擎（基于角色的访问控制）
  - 角色 CRUD
  - 权限 CRUD
  - 用户-角色映射
  - 角色-权限映射
  - 角色继承和层级
  - 通配符支持（`users:*`、`*:read`）
  - 循环依赖检测

- ✨ ABAC 引擎（基于属性的访问控制）
  - 条件求值（支持10+种运算符）
  - 属性匹配（静态和动态）
  - 上下文管理
  - 字段级权限
  
- ✨ 策略引擎
  - 策略管理（CRUD）
  - 规则构建器（链式 API）
  - 冲突解决策略（deny-override、allow-override、first-applicable、only-one-applicable）
  - 策略评估和匹配

- ✨ 权限管理器
  - 统一的 API 入口
  - RBAC/ABAC/策略集成
  - 批量权限检查
  - 字段过滤
  - 导入/导出功能

- ✨ 事件系统
  - 发布/订阅模式
  - 13种权限事件类型
  - 异步事件支持
  - 类型安全的事件数据

- ✨ 审计日志系统
  - 权限检查日志
  - 权限变更日志
  - 高级查询（过滤、排序、分页）
  - 自动清理
  - 统计报告生成

#### 架构特性
- 🎯 框架无关设计（核心纯 TypeScript）
- 🔧 适配器模式（支持 Vue/React/任意框架）
- ⚡ 高性能（权限检查 <0.5ms）
- 📦 轻量级（核心 <15KB gzip）
- 💪 完整的 TypeScript 类型支持
- 🛡️ 严格的类型安全

### Documentation
- 📖 完整的 README 文档
- 📖 实现状态报告
- 📖 项目计划文档
- 📖 JSDoc 注释

### Performance
- ⚡ 优化的数据结构（Map/Set）
- ⚡ 批量操作支持
- ⚡ 懒加载设计

## [Unreleased]

### Planned Features

#### v0.2.0 - 框架适配器
- Vue 3 适配器
  - v-can 指令
  - usePermission composable
  - Can 组件
  - 路由守卫
  - Vue Plugin
  
- React 适配器
  - usePermission hook
  - <Can> 组件
  - withPermission HOC
  - PermissionProvider

#### v0.3.0 - 高级功能
- 权限缓存系统（集成 @ldesign/cache）
- 数据权限（DataFilter、QueryBuilder）
- 临时权限系统

#### v1.0.0 - 生产就绪
- 可视化管理后台
- 完整的单元测试（>85% 覆盖率）
- 集成测试
- E2E 测试
- 完整文档
- 示例项目

---

## Links

- [GitHub Repository](https://github.com/ldesign/ldesign)
- [Documentation](./README.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)

## Contributors

- LDesign Team



