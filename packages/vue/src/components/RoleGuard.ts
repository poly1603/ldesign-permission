/**
 * RoleGuard 组件
 *
 * @description 基于角色控制子组件渲染
 *
 * @module @ldesign/permission-vue/components
 * @author LDesign Team
 */

import { defineComponent, h, inject, ref, watchEffect, type PropType, type VNode } from 'vue'
import type { Role } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY } from '../plugin/symbols'

/**
 * 角色守卫组件
 *
 * @description
 * 根据用户角色决定是否渲染子组件。
 * 支持 fallback 插槽显示无权限时的内容。
 *
 * @example
 * ```vue
 * <template>
 *   <RoleGuard :roles="'admin'">
 *     <AdminPanel />
 *
 *     <template #fallback>
 *       <span>仅管理员可见</span>
 *     </template>
 *   </RoleGuard>
 *
 *   <!-- 多个角色，任一匹配 -->
 *   <RoleGuard :roles="['admin', 'manager']" mode="any">
 *     <ManagementPanel />
 *   </RoleGuard>
 * </template>
 * ```
 */
export const RoleGuard = defineComponent({
  name: 'RoleGuard',

  props: {
    /**
     * 需要的角色
     */
    roles: {
      type: [String, Array] as PropType<Role | Role[]>,
      required: true,
    },

    /**
     * 检查模式
     * @default 'any'
     */
    mode: {
      type: String as PropType<'all' | 'any'>,
      default: 'any',
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
      console.warn('[RoleGuard] PermissionManager 未提供')
      return () => slots.fallback?.() ?? null
    }

    const hasRole = ref(false)
    const isLoading = ref(true)

    // 监听角色变化
    watchEffect(async () => {
      isLoading.value = true
      try {
        const roles = Array.isArray(props.roles)
          ? props.roles
          : [props.roles]

        hasRole.value = await permissionManager.hasRole(roles, {
          mode: props.mode,
        })
      }
      catch (error) {
        console.error('[RoleGuard] 角色检查失败:', error)
        hasRole.value = false
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

      // 有角色
      if (hasRole.value) {
        return slots.default?.() ?? null
      }

      // 无角色
      return slots.fallback?.() ?? null
    }
  },
})

export type RoleGuardInstance = InstanceType<typeof RoleGuard>

