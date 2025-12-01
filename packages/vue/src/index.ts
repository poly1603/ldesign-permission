/**
 * @ldesign/permission-vue
 *
 * LDesign 权限系统 Vue 3 适配器 - 提供 Composables、指令和组件
 *
 * @packageDocumentation
 * @module @ldesign/permission-vue
 * @author LDesign Team
 */

// ==================== Engine 插件 ====================
export {
  createPermissionEnginePlugin,
  type PermissionEnginePluginOptions,
} from './plugins'

// ==================== Vue 插件 ====================
export {
  createPermissionPlugin,
  setupRouterGuard,
  createRouterGuard,
  PERMISSION_MANAGER_KEY,
  PERMISSION_OPTIONS_KEY,
  type PermissionPlugin,
  type PermissionPluginOptions,
  type PermissionProvider,
  type RoleProvider,
  type RouterGuardConfig,
  type RoutePermissionMeta,
} from './plugin'

// ==================== Composables ====================
export {
  usePermission,
  useRole,
  type UsePermissionReturn,
  type UseRoleReturn,
} from './composables'

// ==================== 指令 ====================
export {
  createPermissionDirective,
  createRoleDirective,
  vPermission,
  vRole,
  type PermissionDirectiveValue,
  type PermissionDirectiveModifiers,
  type RoleDirectiveValue,
  type RoleDirectiveModifiers,
} from './directives'

// ==================== 组件 ====================
export {
  PermissionGuard,
  RoleGuard,
  type PermissionGuardInstance,
  type RoleGuardInstance,
} from './components'

// ==================== 重导出核心类型 ====================
export type {
  Permission,
  Role,
  Resource,
  Action,
  PermissionMode,
  PermissionCheckOptions,
  PermissionCheckResult,
  RoleCheckOptions,
  RoleCheckResult,
  RoleDefinition,
  PolicyDefinition,
  PolicyContext,
  PolicyEffect,
  PolicyEvaluationResult,
  PermissionManagerConfig,
} from '@ldesign/permission-core'

