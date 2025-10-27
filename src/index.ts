/**
 * @ldesign/permission - 权限管理系统
 * 
 * 企业级权限管理解决方案，支持 RBAC、ABAC 和策略引擎
 * 
 * @packageDocumentation
 * 
 * @example
 * ```typescript
 * import { createPermissionManager } from '@ldesign/permission'
 * 
 * const pm = createPermissionManager()
 * 
 * // RBAC - 创建角色和权限
 * pm.createRole('admin')
 * pm.grantPermission('admin', 'users', 'read')
 * pm.assignRole('user123', 'admin')
 * 
 * // 检查权限
 * const result = pm.check('user123', 'users', 'read')
 * console.log(result.allowed) // true
 * 
 * // ABAC - 基于属性的权限
 * pm.defineAbility([
 *   {
 *     action: 'update',
 *     subject: 'Post',
 *     conditions: { field: 'authorId', operator: 'eq', value: '{{userId}}' }
 *   }
 * ])
 * ```
 */

// ==================== 核心导出 ====================

export { PermissionManager, createPermissionManager } from './core/PermissionManager'

// ==================== 引擎导出 ====================

// RBAC 引擎
export { RBACEngine, RoleManager, PermissionStore } from './core/rbac'

// ABAC 引擎
export { ABACEngine, ConditionEvaluator, AttributeMatcher, ContextManager } from './core/abac'

// 策略引擎
export { PolicyEngine, PolicyStore, RuleBuilder, createRuleBuilder, allowRule, denyRule } from './core/policy'

// ==================== 高级功能导出 ====================

// 缓存系统
export { LRUCache, PermissionCache, generateContextHash, createPermissionCacheKey } from './core/cache'

// 事件系统
export { EventEmitter, PermissionEventType } from './core/events'
export type * from './core/events'

// 审计日志
export { AuditLogger, AuditStore } from './core/audit'

// 过期管理
export { ExpirationManager, TemporaryPermissionManager } from './core/expiration'

// 性能监控
export { PerformanceMonitor } from './core/monitor'
export type { PerformanceMetrics, SlowQuery, MonitorConfig } from './core/monitor'

// 权限模板
export { PermissionTemplateManager, getBuiltinTemplates, createTemplateManager } from './core/template'
export type { Template } from './core/template'

// ==================== 工具函数导出 ====================

export {
  getValueByPath,
  setValueByPath,
  hasValueByPath,
  clearPathCache,
  getPathCacheStats,
  deepClone,
  simpleHash,
  hashObject,
  throttle,
  debounce,
  isValidPermissionString,
  parsePermissionString,
  safeExecute,
  safeExecuteAsync,
} from './shared/utils'

export {
  validateString,
  validatePermissionString,
  validateObject,
  validateArray,
  validateNumber,
  validateBoolean,
  validateEnum,
  safeCall,
  safeCallAsync,
} from './shared/validators'

// ==================== 类型导出 ====================

export type * from './types'






