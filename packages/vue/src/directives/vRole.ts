/**
 * v-role 指令
 *
 * @description 基于角色控制元素显示/隐藏
 *
 * @module @ldesign/permission-vue/directives
 * @author LDesign Team
 */

import type { Directive, DirectiveBinding } from 'vue'
import type { Role, PermissionManager } from '@ldesign/permission-core'

/**
 * 角色指令绑定值类型
 */
export type RoleDirectiveValue =
  | Role
  | Role[]
  | {
    /** 需要的角色 */
    roles: Role | Role[]
    /** 检查模式 */
    mode?: 'all' | 'any'
    /** 无权限时的行为 */
    action?: 'hide' | 'disable' | 'remove'
  }

/**
 * 角色指令修饰符
 */
export interface RoleDirectiveModifiers {
  /** 任一角色匹配即可 */
  any?: boolean
  /** 禁用元素而非隐藏 */
  disable?: boolean
  /** 移除元素而非隐藏 */
  remove?: boolean
}

/** 存储原始显示样式 */
const originalDisplayMap = new WeakMap<HTMLElement, string>()

/** 存储占位注释节点 */
const placeholderMap = new WeakMap<HTMLElement, Comment>()

/**
 * 创建角色指令
 *
 * @param permissionManager - 权限管理器实例
 * @returns Vue 指令
 *
 * @example
 * ```vue
 * <template>
 *   <!-- 基本用法 -->
 *   <div v-role="'admin'">管理员面板</div>
 *
 *   <!-- 多个角色（任一匹配） -->
 *   <div v-role.any="['admin', 'manager']">管理面板</div>
 *
 *   <!-- 禁用而非隐藏 -->
 *   <button v-role.disable="'admin'">删除</button>
 * </template>
 * ```
 */
export function createRoleDirective(
  permissionManager: PermissionManager,
): Directive<HTMLElement, RoleDirectiveValue> {
  return {
    async mounted(el, binding) {
      await checkRole(el, binding, permissionManager)
    },

    async updated(el, binding) {
      await checkRole(el, binding, permissionManager)
    },

    beforeUnmount(el) {
      originalDisplayMap.delete(el)
      const placeholder = placeholderMap.get(el)
      if (placeholder) {
        placeholder.remove()
        placeholderMap.delete(el)
      }
    },
  }
}

/**
 * 检查角色并更新元素状态
 *
 * @private
 */
async function checkRole(
  el: HTMLElement,
  binding: DirectiveBinding<RoleDirectiveValue>,
  permissionManager: PermissionManager,
): Promise<void> {
  const { roles, mode, action } = parseBinding(binding)

  if (!roles.length) {
    return
  }

  const hasRole = await permissionManager.hasRole(roles, { mode })
  updateElement(el, hasRole, action)
}

/**
 * 解析指令绑定值
 *
 * @private
 */
function parseBinding(
  binding: DirectiveBinding<RoleDirectiveValue>,
): {
  roles: Role[]
  mode: 'all' | 'any'
  action: 'hide' | 'disable' | 'remove'
} {
  const { value, modifiers } = binding

  let roles: Role[] = []
  let mode: 'all' | 'any' = 'any' // 角色默认使用 any 模式
  let action: 'hide' | 'disable' | 'remove' = 'hide'

  if (typeof value === 'string') {
    roles = [value]
  }
  else if (Array.isArray(value)) {
    roles = value
  }
  else if (value && typeof value === 'object') {
    roles = Array.isArray(value.roles) ? value.roles : [value.roles]
    mode = value.mode ?? mode
    action = value.action ?? action
  }

  if (modifiers.any) {
    mode = 'any'
  }
  if (modifiers.disable) {
    action = 'disable'
  }
  if (modifiers.remove) {
    action = 'remove'
  }

  return { roles, mode, action }
}

/**
 * 更新元素状态
 *
 * @private
 */
function updateElement(
  el: HTMLElement,
  hasRole: boolean,
  action: 'hide' | 'disable' | 'remove',
): void {
  if (hasRole) {
    restoreElement(el, action)
  }
  else {
    handleNoRole(el, action)
  }
}

/**
 * 处理无角色情况
 *
 * @private
 */
function handleNoRole(
  el: HTMLElement,
  action: 'hide' | 'disable' | 'remove',
): void {
  switch (action) {
    case 'hide':
      if (!originalDisplayMap.has(el)) {
        originalDisplayMap.set(el, el.style.display)
      }
      el.style.display = 'none'
      break

    case 'disable':
      el.setAttribute('disabled', 'disabled')
      el.classList.add('role-disabled')
      el.style.pointerEvents = 'none'
      el.style.opacity = '0.5'
      break

    case 'remove':
      if (!placeholderMap.has(el)) {
        const placeholder = document.createComment('v-role')
        placeholderMap.set(el, placeholder)
        el.parentNode?.insertBefore(placeholder, el)
      }
      el.remove()
      break
  }
}

/**
 * 恢复元素状态
 *
 * @private
 */
function restoreElement(
  el: HTMLElement,
  action: 'hide' | 'disable' | 'remove',
): void {
  switch (action) {
    case 'hide':
      const originalDisplay = originalDisplayMap.get(el)
      el.style.display = originalDisplay ?? ''
      break

    case 'disable':
      el.removeAttribute('disabled')
      el.classList.remove('role-disabled')
      el.style.pointerEvents = ''
      el.style.opacity = ''
      break

    case 'remove':
      const placeholder = placeholderMap.get(el)
      if (placeholder?.parentNode) {
        placeholder.parentNode.insertBefore(el, placeholder)
      }
      break
  }
}

/**
 * 角色指令（需要在 app.use 后使用）
 */
export const vRole = {
  create: createRoleDirective,
}

