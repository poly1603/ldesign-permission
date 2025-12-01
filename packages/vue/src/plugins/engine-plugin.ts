/**
 * Vue 3 Permission Engine 插件
 *
 * 将 Vue Permission 功能集成到 LDesign Engine 中
 *
 * @module plugins/engine-plugin
 */

import type { Plugin } from '@ldesign/engine-core/types'
import type { PermissionManager, RoleDefinition, PolicyDefinition, Permission, Role } from '@ldesign/permission-core'
import { createPermissionPlugin } from '../plugin'
import type { PermissionPluginOptions } from '../plugin'

/**
 * Permission Engine 插件完整配置选项
 */
export interface PermissionEnginePluginOptions extends PermissionPluginOptions {
  /** 插件名称 */
  name?: string
  /** 插件版本 */
  version?: string
  /** 是否启用调试模式 */
  debug?: boolean
}

/**
 * Engine 接口（简化版）
 */
interface EngineLike {
  logger?: {
    info?: (...args: unknown[]) => void
    warn?: (...args: unknown[]) => void
    error?: (...args: unknown[]) => void
  }
  events?: {
    once?: (event: string, cb: () => void) => void
    emit?: (event: string, payload?: unknown) => void
    on?: (event: string, cb: (payload?: unknown) => void) => void
    off?: (event: string, cb?: (payload?: unknown) => void) => void
  }
  getApp?: () => unknown
  state?: {
    set?: (k: string, v: unknown) => void
    get?: (k: string) => unknown
    delete?: (k: string) => void
  }
  permission?: PermissionManager
  setPermission?: (permission: PermissionManager) => void
}

/** 标志，防止重复安装到 Vue 应用 */
let vueInstalled = false

/**
 * 创建 Vue 3 Permission Engine 插件
 *
 * @param options - 插件配置选项
 * @returns Engine 插件实例
 *
 * @example
 * ```typescript
 * const permissionPlugin = createPermissionEnginePlugin({
 *   superRole: 'admin',
 *   enableCache: true,
 *   roles: [
 *     { id: 'admin', name: '管理员', permissions: ['*'] },
 *   ],
 * })
 *
 * engine.use(permissionPlugin)
 * ```
 */
export function createPermissionEnginePlugin(
  options: PermissionEnginePluginOptions = {},
): Plugin {
  const {
    name = 'permission',
    version = '1.0.0',
    debug = false,
    ...permissionOptions
  } = options

  return {
    name,
    version,
    dependencies: [],

    async install(context: unknown) {
      try {
        if (debug) {
          console.log('[Permission Plugin] install method called')
        }

        const engine: EngineLike = (context as { engine?: EngineLike })?.engine || context as EngineLike

        if (!engine) {
          throw new Error('Engine instance not found in context')
        }

        engine.logger?.info?.('Installing Vue permission plugin...', { version })

        // 创建权限插件
        const permissionPlugin = createPermissionPlugin(permissionOptions)
        const permissionManager = permissionPlugin.getPermissionManager()

        // 将 permissionManager 暴露到 engine
        if (typeof engine.setPermission === 'function') {
          engine.setPermission(permissionManager)
        }
        else {
          (engine as EngineLike).permission = permissionManager
        }

        // 注册 permission 服务到容器
        try {
          const container = (context as { container?: { singleton?: (name: string, instance: unknown) => void } })?.container
            || (engine as { container?: { singleton?: (name: string, instance: unknown) => void } }).container
          if (container && typeof container.singleton === 'function') {
            container.singleton('permission', permissionManager)
            if (debug) {
              console.log('[Permission] Permission service registered to container')
            }
          }
        }
        catch (error) {
          if (debug) {
            console.log('[Permission] Failed to register permission service to container:', error)
          }
        }

        // 安装到 Vue 应用
        const app = engine.getApp?.()

        if (app && !vueInstalled) {
          (app as { use: (plugin: unknown) => void }).use(permissionPlugin)
          vueInstalled = true
        }
        else if (!vueInstalled) {
          engine.events?.once?.('app:created', () => {
            if (vueInstalled) return

            const app = engine.getApp?.()
            if (app) {
              (app as { use: (plugin: unknown) => void }).use(permissionPlugin)
              vueInstalled = true
            }
          })
        }

        engine.logger?.info?.('Vue permission plugin installed successfully')
      }
      catch (error) {
        console.error('[Permission Plugin] Error during installation:', error)
        const eng: EngineLike = (context as { engine?: EngineLike })?.engine || context as EngineLike
        eng?.logger?.error?.('Failed to install Vue permission plugin:', error)
        throw error
      }
    },

    async uninstall(context: unknown) {
      const engine: EngineLike = (context as { engine?: EngineLike })?.engine || context as EngineLike
      engine.logger?.info?.('Uninstalling Vue permission plugin...')

      // 销毁权限管理器
      if (engine.permission) {
        engine.permission.destroy()
      }

      engine.logger?.info?.('Vue permission plugin uninstalled')
    },
  }
}

export default createPermissionEnginePlugin

