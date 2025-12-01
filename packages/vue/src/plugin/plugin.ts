/**
 * Vue 权限插件
 *
 * @description 提供 Vue 3 的权限系统集成
 *
 * @module @ldesign/permission-vue/plugin
 * @author LDesign Team
 */

import type { App, Plugin } from 'vue'
import type { Router } from 'vue-router'
import { createPermissionManager } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY, PERMISSION_OPTIONS_KEY, type PermissionPluginOptions } from './symbols'
import { setupRouterGuard } from './guard'
import { createPermissionDirective } from '../directives/vPermission'
import { createRoleDirective } from '../directives/vRole'

/**
 * 创建权限插件
 *
 * @param options - 插件配置选项
 * @returns Vue 插件
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { createRouter } from 'vue-router'
 * import { createPermissionPlugin } from '@ldesign/permission-vue'
 *
 * const app = createApp(App)
 * const router = createRouter({ ... })
 *
 * const permissionPlugin = createPermissionPlugin({
 *   superRole: 'admin',
 *   enableCache: true,
 *   roles: [
 *     { id: 'admin', name: '管理员', permissions: ['*'] },
 *     { id: 'editor', name: '编辑者', permissions: ['article:read', 'article:write'] },
 *   ],
 *   permissionProvider: () => authStore.permissions,
 *   roleProvider: () => authStore.roles,
 *   setupRouterGuard: true,
 *   unauthorizedRoute: '/403',
 * })
 *
 * app.use(router)
 * app.use(permissionPlugin, { router })
 * ```
 */
export function createPermissionPlugin(options: PermissionPluginOptions = {}): PermissionPlugin {
  // 创建权限管理器
  const permissionManager = createPermissionManager({
    enableCache: options.enableCache ?? true,
    cacheTTL: options.cacheTTL,
    cacheMaxSize: options.cacheMaxSize,
    superPermission: options.superPermission,
    superRole: options.superRole,
    debug: options.debug,
  })

  // 设置数据提供者
  if (options.permissionProvider || options.roleProvider) {
    permissionManager.setDataProvider({
      getPermissions: options.permissionProvider ?? (() => []),
      getRoles: options.roleProvider ?? (() => []),
    })
  }

  // 预定义角色
  if (options.roles?.length) {
    permissionManager.defineRoles(options.roles)
  }

  // 预定义策略
  if (options.policies?.length) {
    const policyEngine = permissionManager.getPolicyEngine()
    policyEngine.addPolicies(options.policies)
  }

  const plugin: Plugin = {
    install(app: App, installOptions?: { router?: Router }) {
      // 提供权限管理器
      app.provide(PERMISSION_MANAGER_KEY, permissionManager)
      app.provide(PERMISSION_OPTIONS_KEY, options)

      // 全局属性
      app.config.globalProperties.$permission = permissionManager

      // 自动注册指令
      app.directive('permission', createPermissionDirective(permissionManager))
      app.directive('role', createRoleDirective(permissionManager))

      // 设置路由守卫
      if (options.setupRouterGuard !== false && installOptions?.router) {
        setupRouterGuard(installOptions.router, permissionManager, {
          unauthorizedRoute: options.unauthorizedRoute ?? '/403',
          loginRoute: options.loginRoute ?? '/login',
          whiteList: options.whiteList ?? [],
          onUnauthorized: options.onUnauthorized,
          onAuthorized: options.onAuthorized,
        })
      }
    },
  }

  return {
    ...plugin,
    install: plugin.install!,
    /**
     * 获取权限管理器实例
     */
    getPermissionManager: () => permissionManager,
  }
}

/**
 * 权限插件类型
 */
export interface PermissionPlugin extends Plugin {
  /**
   * 获取权限管理器实例
   */
  getPermissionManager: () => ReturnType<typeof createPermissionManager>
}

