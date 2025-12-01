/**
 * @ldesign/permission-core
 *
 * LDesign 权限系统核心模块 - 框架无关的权限管理、角色管理、策略引擎
 *
 * @packageDocumentation
 * @module @ldesign/permission-core
 * @author LDesign Team
 */

// ==================== 缓存 ====================
export {
  createPermissionCache,
  PermissionCache,
  type PermissionCacheConfig,
} from './cache'

// ==================== 权限管理 ====================
export {
  createPermissionManager,
  type PermissionDataProvider,
  PermissionManager,
} from './permission'

// ==================== 策略引擎 ====================
export {
  createPolicyEngine,
  PolicyEngine,
  type PolicyEngineConfig,
} from './policy'

// ==================== 角色管理 ====================
export {
  createRoleManager,
  RoleManager,
  type RoleManagerConfig,
} from './role'

// ==================== 类型定义 ====================
export * from './types'
