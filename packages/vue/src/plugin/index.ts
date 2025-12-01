/**
 * 权限插件模块
 *
 * @module @ldesign/permission-vue/plugin
 */

export {
  createPermissionPlugin,
  type PermissionPlugin,
} from './plugin'

export {
  setupRouterGuard,
  createRouterGuard,
  type RouterGuardConfig,
  type RoutePermissionMeta,
} from './guard'

export {
  PERMISSION_MANAGER_KEY,
  PERMISSION_OPTIONS_KEY,
  type PermissionPluginOptions,
  type PermissionProvider,
  type RoleProvider,
} from './symbols'

