/**
 * Vue Router 权限守卫
 *
 * @module @ldesign/permission-vue/plugin
 * @author LDesign Team
 */

import type { Router, RouteLocationNormalized } from 'vue-router'
import type { Permission, PermissionManager, Role } from '@ldesign/permission-core'
import type { PermissionPluginOptions } from './symbols'

/**
 * 路由守卫配置
 */
export interface RouterGuardConfig {
  /** 未授权重定向路由 */
  unauthorizedRoute: string
  /** 登录页路由 */
  loginRoute: string
  /** 白名单路由 */
  whiteList: string[]
  /** 未授权回调 */
  onUnauthorized?: PermissionPluginOptions['onUnauthorized']
  /** 授权成功回调 */
  onAuthorized?: PermissionPluginOptions['onAuthorized']
}

/**
 * 路由权限元数据扩展
 */
export interface RoutePermissionMeta {
  /** 需要的权限 */
  permissions?: Permission[]
  /** 需要的角色 */
  roles?: Role[]
  /** 权限检查模式 */
  permissionMode?: 'all' | 'any'
  /** 角色检查模式 */
  roleMode?: 'all' | 'any'
  /** 是否跳过权限验证 */
  skipAuth?: boolean
}

/**
 * 设置路由权限守卫
 *
 * @param router - Vue Router 实例
 * @param permissionManager - 权限管理器实例
 * @param config - 守卫配置
 *
 * @example
 * ```ts
 * import { createRouter } from 'vue-router'
 * import { setupRouterGuard, createPermissionManager } from '@ldesign/permission-vue'
 *
 * const router = createRouter({ ... })
 * const manager = createPermissionManager()
 *
 * setupRouterGuard(router, manager, {
 *   unauthorizedRoute: '/403',
 *   loginRoute: '/login',
 *   whiteList: ['/login', '/register', '/404'],
 * })
 * ```
 */
export function setupRouterGuard(
  router: Router,
  permissionManager: PermissionManager,
  config: RouterGuardConfig,
): void {
  router.beforeEach(async (to, _from, next) => {
    // 检查白名单
    if (isWhitelisted(to, config.whiteList)) {
      return next()
    }

    // 获取路由权限配置
    const meta = to.meta as RoutePermissionMeta

    // 跳过权限验证
    if (meta.skipAuth) {
      return next()
    }

    try {
      // 验证权限
      const hasPermission = await checkRoutePermission(permissionManager, meta)

      if (hasPermission) {
        // 触发授权成功回调
        config.onAuthorized?.(meta.permissions ?? [], to)
        return next()
      }

      // 触发未授权回调
      config.onUnauthorized?.(meta.permissions ?? [], to)

      // 判断是未登录还是无权限
      const roles = await permissionManager.getRoles()
      if (roles.length === 0) {
        // 未登录，跳转登录页
        return next({
          path: config.loginRoute,
          query: { redirect: to.fullPath },
        })
      }

      // 已登录但无权限，跳转 403 页面
      return next(config.unauthorizedRoute)
    }
    catch (error) {
      console.error('[PermissionGuard] 权限验证失败:', error)
      return next(config.unauthorizedRoute)
    }
  })
}

/**
 * 检查路由是否在白名单中
 *
 * @private
 */
function isWhitelisted(route: RouteLocationNormalized, whiteList: string[]): boolean {
  return whiteList.some((path) => {
    // 精确匹配
    if (path === route.path) {
      return true
    }
    // 前缀匹配（以 * 结尾）
    if (path.endsWith('*')) {
      const prefix = path.slice(0, -1)
      return route.path.startsWith(prefix)
    }
    return false
  })
}

/**
 * 检查路由权限
 *
 * @private
 */
async function checkRoutePermission(
  manager: PermissionManager,
  meta: RoutePermissionMeta,
): Promise<boolean> {
  // 没有权限要求，直接通过
  if (!meta.permissions?.length && !meta.roles?.length) {
    return true
  }

  // 检查权限
  if (meta.permissions?.length) {
    const hasPermission = await manager.hasPermission(meta.permissions, {
      mode: meta.permissionMode ?? 'all',
    })
    if (!hasPermission) {
      return false
    }
  }

  // 检查角色
  if (meta.roles?.length) {
    const hasRole = await manager.hasRole(meta.roles, {
      mode: meta.roleMode ?? 'any',
    })
    if (!hasRole) {
      return false
    }
  }

  return true
}

/**
 * 创建权限路由守卫
 *
 * @param permissionManager - 权限管理器实例
 * @param options - 插件配置选项
 * @returns 守卫配置
 */
export function createRouterGuard(
  permissionManager: PermissionManager,
  options: PermissionPluginOptions,
): (router: Router) => void {
  return (router: Router) => {
    setupRouterGuard(router, permissionManager, {
      unauthorizedRoute: options.unauthorizedRoute ?? '/403',
      loginRoute: options.loginRoute ?? '/login',
      whiteList: options.whiteList ?? [],
      onUnauthorized: options.onUnauthorized,
      onAuthorized: options.onAuthorized,
    })
  }
}

