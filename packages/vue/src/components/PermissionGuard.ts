/**
 * PermissionGuard 组件
 *
 * @description 基于权限控制子组件渲染
 *
 * @module @ldesign/permission-vue/components
 * @author LDesign Team
 */

import { defineComponent, h, inject, ref, watchEffect, type PropType, type VNode } from 'vue'
import type { Permission } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY } from '../plugin/symbols'

/**
 * 权限守卫组件
 *
 * @description
 * 根据用户权限决定是否渲染子组件。
 * 支持 fallback 插槽显示无权限时的内容。
 *
 * @example
 * ```vue
 * <template>
 *   <PermissionGuard :permissions="['user:create']">
 *     <button @click="createUser">创建用户</button>
 *
 *     <template #fallback>
 *       <span>您没有创建用户的权限</span>
 *     </template>
 *   </PermissionGuard>
 *
 *   <!-- 多个权限，任一匹配 -->
 *   <PermissionGuard :permissions="['admin', 'manager']" mode="any">
 *     <AdminPanel />
 *   </PermissionGuard>
 * </template>
 * ```
 */
export const PermissionGuard = defineComponent({
  name: 'PermissionGuard',

  props: {
    /**
     * 需要的权限
     */
    permissions: {
      type: [String, Array] as PropType<Permission | Permission[]>,
      required: true,
    },

    /**
     * 检查模式
     * @default 'all'
     */
    mode: {
      type: String as PropType<'all' | 'any'>,
      default: 'all',
    },

    /**
     * 是否跳过缓存
     * @default false
     */
    skipCache: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { slots }) {
    const permissionManager = inject(PERMISSION_MANAGER_KEY)

    if (!permissionManager) {
      console.warn('[PermissionGuard] PermissionManager 未提供')
      return () => slots.fallback?.() ?? null
    }

    const hasPermission = ref(false)
    const isLoading = ref(true)

    // 监听权限变化
    watchEffect(async () => {
      isLoading.value = true
      try {
        const permissions = Array.isArray(props.permissions)
          ? props.permissions
          : [props.permissions]

        hasPermission.value = await permissionManager.hasPermission(permissions, {
          mode: props.mode,
          skipCache: props.skipCache,
        })
      }
      catch (error) {
        console.error('[PermissionGuard] 权限检查失败:', error)
        hasPermission.value = false
      }
      finally {
        isLoading.value = false
      }
    })

    return (): VNode | VNode[] | null => {
      // 加载中
      if (isLoading.value) {
        return slots.loading?.() ?? null
      }

      // 有权限
      if (hasPermission.value) {
        return slots.default?.() ?? null
      }

      // 无权限
      return slots.fallback?.() ?? null
    }
  },
})

export type PermissionGuardInstance = InstanceType<typeof PermissionGuard>

