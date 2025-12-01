/**
 * usePermission Composable
 *
 * @description 提供权限检查的响应式方法
 *
 * @module @ldesign/permission-vue/composables
 * @author LDesign Team
 */

import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { computed, inject, ref, shallowRef, watchEffect } from 'vue'
import type { Permission, PermissionCheckOptions, PermissionCheckResult, PermissionManager } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY } from '../plugin/symbols'

/**
 * usePermission 返回值类型
 */
export interface UsePermissionReturn {
  /** 当前用户的所有权限（响应式） */
  permissions: ShallowRef<Permission[]>
  /** 是否正在加载权限 */
  isLoading: Ref<boolean>
  /** 刷新权限 */
  refresh: () => Promise<void>
  /** 检查是否拥有指定权限（异步） */
  hasPermission: (permissions: Permission | Permission[], options?: PermissionCheckOptions) => Promise<boolean>
  /** 检查权限并返回详细结果 */
  checkPermission: (permissions: Permission[], options?: PermissionCheckOptions) => Promise<PermissionCheckResult>
  /** 创建权限检查的计算属性 */
  can: (permissions: Permission | Permission[], options?: PermissionCheckOptions) => ComputedRef<boolean>
  /** 获取权限管理器实例 */
  getManager: () => PermissionManager
}

/**
 * 权限检查 Composable
 *
 * @returns 权限检查相关的方法和状态
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { usePermission } from '@ldesign/permission-vue'
 *
 * const { permissions, hasPermission, can, isLoading } = usePermission()
 *
 * // 响应式权限检查
 * const canCreateUser = can('user:create')
 * const canManageSystem = can(['system:read', 'system:write'], { mode: 'all' })
 *
 * // 异步权限检查
 * const checkPermissions = async () => {
 *   const canDelete = await hasPermission('user:delete')
 *   console.log('可以删除用户:', canDelete)
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isLoading">加载中...</div>
 *   <button v-if="canCreateUser" @click="createUser">创建用户</button>
 * </template>
 * ```
 */
export function usePermission(): UsePermissionReturn {
  const permissionManager = inject(PERMISSION_MANAGER_KEY)

  if (!permissionManager) {
    throw new Error(
      '[usePermission] PermissionManager 未提供。请确保在应用中使用了 createPermissionPlugin。',
    )
  }

  // 响应式状态
  const permissions = shallowRef<Permission[]>([])
  const isLoading = ref(false)

  // 加载权限
  const loadPermissions = async (): Promise<void> => {
    isLoading.value = true
    try {
      permissions.value = await permissionManager.getPermissions()
    }
    finally {
      isLoading.value = false
    }
  }

  // 初始化加载
  loadPermissions()

  // 刷新权限
  const refresh = async (): Promise<void> => {
    permissionManager.clearCache()
    await loadPermissions()
  }

  /**
   * 检查是否拥有指定权限（异步）
   */
  const hasPermission = async (
    perm: Permission | Permission[],
    options?: PermissionCheckOptions,
  ): Promise<boolean> => {
    return permissionManager.hasPermission(perm, options)
  }

  /**
   * 检查权限并返回详细结果
   */
  const checkPermission = async (
    perms: Permission[],
    options?: PermissionCheckOptions,
  ): Promise<PermissionCheckResult> => {
    return permissionManager.checkPermissions(perms, options)
  }

  /**
   * 创建权限检查的计算属性
   */
  const can = (
    requiredPermissions: Permission | Permission[],
    options?: PermissionCheckOptions,
  ): ComputedRef<boolean> => {
    const result = ref(false)

    watchEffect(async () => {
      // 依赖 permissions.value 使其响应式
      const _deps = permissions.value
      result.value = await permissionManager.hasPermission(requiredPermissions, options)
    })

    return computed(() => result.value)
  }

  /**
   * 获取权限管理器实例
   */
  const getManager = (): PermissionManager => permissionManager

  return {
    permissions,
    isLoading,
    refresh,
    hasPermission,
    checkPermission,
    can,
    getManager,
  }
}

