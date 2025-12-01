/**
 * v-permission 指令
 *
 * @description 基于权限控制元素显示/隐藏
 *
 * @module @ldesign/permission-vue/directives
 * @author LDesign Team
 */

import type { Directive, DirectiveBinding } from 'vue'
import type { Permission, PermissionManager } from '@ldesign/permission-core'
import { PERMISSION_MANAGER_KEY } from '../plugin/symbols'

/**
 * 权限指令绑定值类型
 */
export type PermissionDirectiveValue =
  | Permission
  | Permission[]
  | {
    /** 需要的权限 */
    permissions: Permission | Permission[]
    /** 检查模式 */
    mode?: 'all' | 'any'
    /** 无权限时的行为 */
    action?: 'hide' | 'disable' | 'remove'
  }

/**
 * 权限指令修饰符
 */
export interface PermissionDirectiveModifiers {
  /** 任一权限匹配即可 */
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
 * 创建权限指令
 *
 * @param permissionManager - 权限管理器实例
 * @returns Vue 指令
 *
 * @example
 * ```vue
 * <template>
 *   <!-- 基本用法 -->
 *   <button v-permission="'user:create'">创建用户</button>
 *
 *   <!-- 多个权限（全部匹配） -->
 *   <button v-permission="['user:read', 'user:write']">编辑用户</button>
 *
 *   <!-- 多个权限（任一匹配） -->
 *   <button v-permission.any="['admin', 'manager']">管理面板</button>
 *
 *   <!-- 禁用而非隐藏 -->
 *   <button v-permission.disable="'user:delete'">删除用户</button>
 *
 *   <!-- 对象配置 -->
 *   <button v-permission="{ permissions: ['user:delete'], mode: 'all', action: 'disable' }">
 *     删除用户
 *   </button>
 * </template>
 * ```
 */
export function createPermissionDirective(
  permissionManager: PermissionManager,
): Directive<HTMLElement, PermissionDirectiveValue> {
  return {
    async mounted(el, binding) {
      await checkPermission(el, binding, permissionManager)
    },

    async updated(el, binding) {
      await checkPermission(el, binding, permissionManager)
    },

    beforeUnmount(el) {
      // 清理
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
 * 检查权限并更新元素状态
 *
 * @private
 */
async function checkPermission(
  el: HTMLElement,
  binding: DirectiveBinding<PermissionDirectiveValue>,
  permissionManager: PermissionManager,
): Promise<void> {
  // 解析绑定值
  const { permissions, mode, action } = parseBinding(binding)

  if (!permissions.length) {
    return
  }

  // 检查权限
  const hasPermission = await permissionManager.hasPermission(permissions, { mode })

  // 根据结果更新元素
  updateElement(el, hasPermission, action)
}

/**
 * 解析指令绑定值
 *
 * @private
 */
function parseBinding(
  binding: DirectiveBinding<PermissionDirectiveValue>,
): {
  permissions: Permission[]
  mode: 'all' | 'any'
  action: 'hide' | 'disable' | 'remove'
} {
  const { value, modifiers } = binding

  // 默认值
  let permissions: Permission[] = []
  let mode: 'all' | 'any' = 'all'
  let action: 'hide' | 'disable' | 'remove' = 'hide'

  // 解析值
  if (typeof value === 'string') {
    permissions = [value]
  }
  else if (Array.isArray(value)) {
    permissions = value
  }
  else if (value && typeof value === 'object') {
    permissions = Array.isArray(value.permissions) ? value.permissions : [value.permissions]
    mode = value.mode ?? mode
    action = value.action ?? action
  }

  // 解析修饰符
  if (modifiers.any) {
    mode = 'any'
  }
  if (modifiers.disable) {
    action = 'disable'
  }
  if (modifiers.remove) {
    action = 'remove'
  }

  return { permissions, mode, action }
}

/**
 * 更新元素状态
 *
 * @private
 */
function updateElement(
  el: HTMLElement,
  hasPermission: boolean,
  action: 'hide' | 'disable' | 'remove',
): void {
  if (hasPermission) {
    // 有权限，恢复元素
    restoreElement(el, action)
  }
  else {
    // 无权限，处理元素
    handleNoPermission(el, action)
  }
}

/**
 * 处理无权限情况
 *
 * @private
 */
function handleNoPermission(
  el: HTMLElement,
  action: 'hide' | 'disable' | 'remove',
): void {
  switch (action) {
    case 'hide':
      // 保存原始显示样式
      if (!originalDisplayMap.has(el)) {
        originalDisplayMap.set(el, el.style.display)
      }
      el.style.display = 'none'
      break

    case 'disable':
      el.setAttribute('disabled', 'disabled')
      el.classList.add('permission-disabled')
      el.style.pointerEvents = 'none'
      el.style.opacity = '0.5'
      break

    case 'remove':
      // 创建占位注释节点
      if (!placeholderMap.has(el)) {
        const placeholder = document.createComment('v-permission')
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
      // 恢复原始显示样式
      const originalDisplay = originalDisplayMap.get(el)
      el.style.display = originalDisplay ?? ''
      break

    case 'disable':
      el.removeAttribute('disabled')
      el.classList.remove('permission-disabled')
      el.style.pointerEvents = ''
      el.style.opacity = ''
      break

    case 'remove':
      // 恢复元素到占位符位置
      const placeholder = placeholderMap.get(el)
      if (placeholder?.parentNode) {
        placeholder.parentNode.insertBefore(el, placeholder)
      }
      break
  }
}

/**
 * 权限指令（需要在 app.use 后使用）
 *
 * @description
 * 这是一个工厂函数，需要传入权限管理器实例。
 * 通常通过插件自动注册，无需手动调用。
 */
export const vPermission = {
  /**
   * 创建指令实例
   */
  create: createPermissionDirective,
}

