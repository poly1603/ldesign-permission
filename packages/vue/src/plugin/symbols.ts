/**
 * Vue 权限插件符号和类型定义
 *
 * @module @ldesign/permission-vue/plugin
 * @author LDesign Team
 */

import type { InjectionKey } from 'vue'
import type {
  Permission,
  PermissionManager,
  PermissionManagerConfig,
  PolicyDefinition,
  Role,
  RoleDefinition,
} from '@ldesign/permission-core'

/**
 * 权限管理器注入键
 */
export const PERMISSION_MANAGER_KEY: InjectionKey<PermissionManager> = Symbol('PERMISSION_MANAGER')

/**
 * 权限插件配置注入键
 */
export const PERMISSION_OPTIONS_KEY: InjectionKey<PermissionPluginOptions> = Symbol('PERMISSION_OPTIONS')

/**
 * 权限数据提供者函数类型
 */
export type PermissionProvider = () => Permission[] | Promise<Permission[]>

/**
 * 角色数据提供者函数类型
 */
export type RoleProvider = () => Role[] | Promise<Role[]>

/**
 * 权限插件配置选项
 */
export interface PermissionPluginOptions extends PermissionManagerConfig {
  /**
   * 权限数据提供者
   * @description 用于动态获取用户权限
   */
  permissionProvider?: PermissionProvider

  /**
   * 角色数据提供者
   * @description 用于动态获取用户角色
   */
  roleProvider?: RoleProvider

  /**
   * 预定义角色
   * @description 初始化时定义的角色配置
   */
  roles?: RoleDefinition[]

  /**
   * 预定义策略
   * @description 初始化时定义的策略配置
   */
  policies?: PolicyDefinition[]

  /**
   * 是否设置路由守卫
   * @default true
   */
  setupRouterGuard?: boolean

  /**
   * 未授权重定向路由
   * @default '/403'
   */
  unauthorizedRoute?: string

  /**
   * 登录页路由
   * @default '/login'
   */
  loginRoute?: string

  /**
   * 白名单路由（不需要权限验证）
   */
  whiteList?: string[]

  /**
   * 权限检查失败回调
   */
  onUnauthorized?: (permission: Permission[], route?: unknown) => void

  /**
   * 权限检查成功回调
   */
  onAuthorized?: (permission: Permission[], route?: unknown) => void
}

