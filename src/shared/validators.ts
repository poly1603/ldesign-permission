/**
 * @ldesign/permission - 输入验证工具
 * 
 * 提供统一的参数验证功能，确保 API 调用的安全性和正确性
 */

import { PermissionError, PermissionErrorType } from '../types/core'

/**
 * 验证字符串参数
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称（用于错误消息）
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateString(
  value: any,
  paramName: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    allowEmpty?: boolean
  } = {}
): void {
  const { required = true, minLength, maxLength, pattern, allowEmpty = false } = options

  // 检查必填
  if (required && (value === undefined || value === null)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 如果不是必填且值为空，则跳过后续检查
  if (!required && (value === undefined || value === null)) {
    return
  }

  // 检查类型
  if (typeof value !== 'string') {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是字符串类型，当前类型为 ${typeof value}`
    )
  }

  // 检查空字符串
  if (!allowEmpty && value.length === 0) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 不能为空字符串`
    )
  }

  // 检查最小长度
  if (minLength !== undefined && value.length < minLength) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的长度不能少于 ${minLength} 个字符，当前长度为 ${value.length}`
    )
  }

  // 检查最大长度
  if (maxLength !== undefined && value.length > maxLength) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的长度不能超过 ${maxLength} 个字符，当前长度为 ${value.length}`
    )
  }

  // 检查正则模式
  if (pattern && !pattern.test(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的格式不正确`
    )
  }
}

/**
 * 验证权限字符串格式
 * 
 * 权限字符串格式：resource:action
 * 
 * @param permission - 权限字符串
 * @param paramName - 参数名称
 * @throws {PermissionError} 如果格式不正确
 */
export function validatePermissionString(permission: any, paramName: string = 'permission'): void {
  validateString(permission, paramName)

  const parts = permission.split(':')

  if (parts.length !== 2) {
    throw new PermissionError(
      PermissionErrorType.INVALID_PERMISSION,
      `权限字符串 "${permission}" 格式不正确，应为 "resource:action" 格式`
    )
  }

  const [resource, action] = parts

  if (!resource || resource.trim().length === 0) {
    throw new PermissionError(
      PermissionErrorType.INVALID_PERMISSION,
      `权限字符串中的资源部分不能为空`
    )
  }

  if (!action || action.trim().length === 0) {
    throw new PermissionError(
      PermissionErrorType.INVALID_PERMISSION,
      `权限字符串中的操作部分不能为空`
    )
  }
}

/**
 * 验证对象参数
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateObject(
  value: any,
  paramName: string,
  options: {
    required?: boolean
    allowNull?: boolean
    allowEmpty?: boolean
  } = {}
): void {
  const { required = true, allowNull = false, allowEmpty = false } = options

  // 检查必填
  if (required && value === undefined) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 检查 null
  if (value === null) {
    if (!allowNull) {
      throw new PermissionError(
        PermissionErrorType.INVALID_CONFIG,
        `参数 "${paramName}" 不能为 null`
      )
    }
    return
  }

  // 如果不是必填且值为空，则跳过
  if (!required && value === undefined) {
    return
  }

  // 检查类型
  if (typeof value !== 'object') {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是对象类型，当前类型为 ${typeof value}`
    )
  }

  // 检查空对象
  if (!allowEmpty && Object.keys(value).length === 0) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 不能为空对象`
    )
  }
}

/**
 * 验证数组参数
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateArray(
  value: any,
  paramName: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    itemValidator?: (item: any, index: number) => void
  } = {}
): void {
  const { required = true, minLength, maxLength, itemValidator } = options

  // 检查必填
  if (required && (value === undefined || value === null)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 如果不是必填且值为空，则跳过
  if (!required && (value === undefined || value === null)) {
    return
  }

  // 检查是否为数组
  if (!Array.isArray(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是数组类型`
    )
  }

  // 检查最小长度
  if (minLength !== undefined && value.length < minLength) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的长度不能少于 ${minLength}，当前长度为 ${value.length}`
    )
  }

  // 检查最大长度
  if (maxLength !== undefined && value.length > maxLength) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的长度不能超过 ${maxLength}，当前长度为 ${value.length}`
    )
  }

  // 验证数组项
  if (itemValidator) {
    value.forEach((item, index) => {
      try {
        itemValidator(item, index)
      } catch (error) {
        if (error instanceof PermissionError) {
          throw new PermissionError(
            error.type,
            `参数 "${paramName}" 的第 ${index} 项验证失败：${error.message}`,
            error.details
          )
        }
        throw error
      }
    })
  }
}

/**
 * 验证数字参数
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateNumber(
  value: any,
  paramName: string,
  options: {
    required?: boolean
    min?: number
    max?: number
    integer?: boolean
    positive?: boolean
  } = {}
): void {
  const { required = true, min, max, integer = false, positive = false } = options

  // 检查必填
  if (required && (value === undefined || value === null)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 如果不是必填且值为空，则跳过
  if (!required && (value === undefined || value === null)) {
    return
  }

  // 检查类型
  if (typeof value !== 'number') {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是数字类型，当前类型为 ${typeof value}`
    )
  }

  // 检查 NaN
  if (Number.isNaN(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 不能为 NaN`
    )
  }

  // 检查无穷大
  if (!Number.isFinite(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是有限数字`
    )
  }

  // 检查是否为整数
  if (integer && !Number.isInteger(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是整数`
    )
  }

  // 检查是否为正数
  if (positive && value <= 0) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是正数`
    )
  }

  // 检查最小值
  if (min !== undefined && value < min) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 不能小于 ${min}，当前值为 ${value}`
    )
  }

  // 检查最大值
  if (max !== undefined && value > max) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 不能大于 ${max}，当前值为 ${value}`
    )
  }
}

/**
 * 验证布尔参数
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateBoolean(
  value: any,
  paramName: string,
  options: {
    required?: boolean
  } = {}
): void {
  const { required = true } = options

  // 检查必填
  if (required && (value === undefined || value === null)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 如果不是必填且值为空，则跳过
  if (!required && (value === undefined || value === null)) {
    return
  }

  // 检查类型
  if (typeof value !== 'boolean') {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 必须是布尔类型，当前类型为 ${typeof value}`
    )
  }
}

/**
 * 验证枚举值
 * 
 * @param value - 要验证的值
 * @param paramName - 参数名称
 * @param allowedValues - 允许的值列表
 * @param options - 验证选项
 * @throws {PermissionError} 如果验证失败
 */
export function validateEnum<T>(
  value: any,
  paramName: string,
  allowedValues: T[],
  options: {
    required?: boolean
  } = {}
): void {
  const { required = true } = options

  // 检查必填
  if (required && (value === undefined || value === null)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 是必填的`
    )
  }

  // 如果不是必填且值为空，则跳过
  if (!required && (value === undefined || value === null)) {
    return
  }

  // 检查是否在允许的值中
  if (!allowedValues.includes(value)) {
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `参数 "${paramName}" 的值不合法，允许的值为：${allowedValues.join(', ')}`
    )
  }
}

/**
 * 安全执行函数，捕获并转换错误
 * 
 * @param fn - 要执行的函数
 * @param errorMessage - 错误消息模板
 * @returns 函数执行结果
 * @throws {PermissionError} 如果执行失败
 */
export function safeCall<T>(fn: () => T, errorMessage: string): T {
  try {
    return fn()
  } catch (error) {
    // 如果已经是 PermissionError，直接抛出
    if (error instanceof PermissionError) {
      throw error
    }

    // 包装为 PermissionError
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error }
    )
  }
}

/**
 * 异步安全执行函数
 * 
 * @param fn - 要执行的异步函数
 * @param errorMessage - 错误消息模板
 * @returns 函数执行结果
 * @throws {PermissionError} 如果执行失败
 */
export async function safeCallAsync<T>(fn: () => Promise<T>, errorMessage: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // 如果已经是 PermissionError，直接抛出
    if (error instanceof PermissionError) {
      throw error
    }

    // 包装为 PermissionError
    throw new PermissionError(
      PermissionErrorType.INVALID_CONFIG,
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error }
    )
  }
}

