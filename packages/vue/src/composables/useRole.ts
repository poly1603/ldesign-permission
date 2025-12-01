/**
 * useRole Composable
 *
 * @description 提供角色检查的响应式方法
 *
 * @module @ldesign/permission-vue/composables
 * @author LDesign Team
 */

import type { ComputedRef, Ref, ShallowRef } from 'vue'
import { computed, inject, ref, shallowRef, watchEffect } from 'vue'
import type { PermissionManager, Role, RoleCheckOptions, RoleCheckResult } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY } from '../plugin/symbols'

/**
 * useRole 返回值类型
 */
export interface UseRoleReturn {
  /** 当前用户的所有角色（响应式） */
  roles: ShallowRef<Role[]>
  /** 是否正在加载角色 */
  isLoading: Ref<boolean>
  /** 刷新角色 */
  refresh: () => Promise<void>
  /** 检查是否拥有指定角色（异步） */
  hasRole: (roles: Role | Role[], options?: RoleCheckOptions) => Promise<boolean>
  /** 检查角色并返回详细结果 */
  checkRole: (roles: Role[], options?: RoleCheckOptions) => Promise<RoleCheckResult>
  /** 创建角色检查的计算属性 */
  is: (roles: Role | Role[], options?: RoleCheckOptions) => ComputedRef<boolean>
  /** 检查是否是超级管理员 */
  isSuperAdmin: ComputedRef<boolean>
  /** 获取权限管理器实例 */
  getManager: () => PermissionManager
}

/**
 * 角色检查 Composable
 *
 * @returns 角色检查相关的方法和状态
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRole } from '@ldesign/permission-vue'
 *
 * const { roles, hasRole, is, isSuperAdmin, isLoading } = useRole()
 *
 * // 响应式角色检查
 * const isAdmin = is('admin')
 * const isManager = is(['admin', 'manager'], { mode: 'any' })
 *
 * // 异步角色检查
 * const checkRoles = async () => {
 *   const isEditor = await hasRole('editor')
 *   console.log('是编辑者:', isEditor)
 * }
 * </script>
 *
 * <template>
 *   <div v-if="isLoading">加载中...</div>
 *   <div v-if="isSuperAdmin">超级管理员面板</div>
 *   <div v-if="isAdmin">管理员面板</div>
 * </template>
 * ```
 */
export function useRole(): UseRoleReturn {
  const permissionManager = inject(PERMISSION_MANAGER_KEY)

  if (!permissionManager) {
    throw new Error(
      '[useRole] PermissionManager 未提供。请确保在应用中使用了 createPermissionPlugin。',
    )
  }

  // 响应式状态
  const roles = shallowRef<Role[]>([])
  const isLoading = ref(false)

  // 加载角色
  const loadRoles = async (): Promise<void> => {
    isLoading.value = true
    try {
      roles.value = await permissionManager.getRoles()
    }
    finally {
      isLoading.value = false
    }
  }

  // 初始化加载
  loadRoles()

  // 刷新角色
  const refresh = async (): Promise<void> => {
    permissionManager.clearCache()
    await loadRoles()
  }

  /**
   * 检查是否拥有指定角色（异步）
   */
  const hasRole = async (
    role: Role | Role[],
    options?: RoleCheckOptions,
  ): Promise<boolean> => {
    return permissionManager.hasRole(role, options)
  }

  /**
   * 检查角色并返回详细结果
   */
  const checkRole = async (
    roleList: Role[],
    options?: RoleCheckOptions,
  ): Promise<RoleCheckResult> => {
    return permissionManager.checkRoles(roleList, options)
  }

  /**
   * 创建角色检查的计算属性
   */
  const is = (
    requiredRoles: Role | Role[],
    options?: RoleCheckOptions,
  ): ComputedRef<boolean> => {
    const result = ref(false)

    watchEffect(async () => {
      // 依赖 roles.value 使其响应式
      const _deps = roles.value
      result.value = await permissionManager.hasRole(requiredRoles, options)
    })

    return computed(() => result.value)
  }

  /**
   * 检查是否是超级管理员
   */
  const isSuperAdmin = computed(() => {
    const roleManager = permissionManager.getRoleManager()
    return roles.value.some(role => roleManager.isSuperRole(role))
  })

  /**
   * 获取权限管理器实例
   */
  const getManager = (): PermissionManager => permissionManager

  return {
    roles,
    isLoading,
    refresh,
    hasRole,
    checkRole,
    is,
    isSuperAdmin,
    getManager,
  }
}

