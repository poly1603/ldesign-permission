/**
 * @ldesign/permission - 共享工具函数
 * 
 * 提供通用的工具函数，用于提升性能和代码复用
 */

/**
 * 路径解析缓存
 * 缓存已解析的路径字符串，避免重复解析
 */
const pathCache = new Map<string, string[]>()

/**
 * 路径缓存的最大容量
 */
const MAX_PATH_CACHE_SIZE = 1000

/**
 * 通过路径字符串获取对象的值
 * 
 * 支持嵌套路径访问，如 "user.profile.age"
 * 路径解析结果会被缓存以提升性能
 * 
 * @param obj - 要访问的对象
 * @param path - 路径字符串，使用点号分隔（如 "user.name"）
 * @returns 路径对应的值，如果路径不存在则返回 undefined
 * 
 * @example
 * ```typescript
 * const user = { profile: { name: 'John', age: 30 } }
 * getValueByPath(user, 'profile.name') // 'John'
 * getValueByPath(user, 'profile.age')  // 30
 * getValueByPath(user, 'profile.email') // undefined
 * ```
 */
export function getValueByPath(obj: any, path: string): any {
  if (!path) {
    return obj
  }

  // 从缓存获取已解析的路径
  let keys = pathCache.get(path)

  if (!keys) {
    // 解析路径并缓存
    keys = path.split('.')

    // 限制缓存大小，防止内存泄漏
    if (pathCache.size >= MAX_PATH_CACHE_SIZE) {
      // 删除最早的缓存项（FIFO）
      const firstKey = pathCache.keys().next().value
      pathCache.delete(firstKey)
    }

    pathCache.set(path, keys)
  }

  let value = obj
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined
    }
    value = value[key]
  }

  return value
}

/**
 * 通过路径字符串设置对象的值
 * 
 * 支持嵌套路径设置，如果中间路径不存在会自动创建
 * 
 * @param obj - 要设置值的对象
 * @param path - 路径字符串，使用点号分隔
 * @param value - 要设置的值
 * 
 * @example
 * ```typescript
 * const obj = {}
 * setValueByPath(obj, 'user.name', 'John')
 * // obj 现在是 { user: { name: 'John' } }
 * ```
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  if (!path) {
    return
  }

  const keys = path.split('.')
  const lastKey = keys.pop()!

  let current = obj
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }

  current[lastKey] = value
}

/**
 * 检查对象是否拥有指定路径的值
 * 
 * @param obj - 要检查的对象
 * @param path - 路径字符串
 * @returns 是否存在该路径的值（null 和 undefined 视为不存在）
 */
export function hasValueByPath(obj: any, path: string): boolean {
  const value = getValueByPath(obj, path)
  return value !== undefined && value !== null
}

/**
 * 清除路径解析缓存
 * 
 * 用于在内存紧张时或测试时清理缓存
 */
export function clearPathCache(): void {
  pathCache.clear()
}

/**
 * 获取路径缓存统计信息
 * 
 * @returns 缓存大小和最大容量
 */
export function getPathCacheStats() {
  return {
    size: pathCache.size,
    maxSize: MAX_PATH_CACHE_SIZE,
  }
}

/**
 * 深度克隆对象
 * 
 * @param obj - 要克隆的对象
 * @returns 克隆后的新对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any
  }

  if (obj instanceof Map) {
    const cloned = new Map()
    obj.forEach((value, key) => {
      cloned.set(key, deepClone(value))
    })
    return cloned as any
  }

  if (obj instanceof Set) {
    const cloned = new Set()
    obj.forEach(value => {
      cloned.add(deepClone(value))
    })
    return cloned as any
  }

  const cloned: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}

/**
 * 生成简单的哈希值
 * 
 * 用于生成对象的哈希标识，用于缓存键
 * 
 * @param str - 要哈希的字符串
 * @returns 哈希值
 */
export function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为 32 位整数
  }
  return Math.abs(hash)
}

/**
 * 生成对象的哈希字符串
 * 
 * 将对象序列化后生成哈希，用于缓存键
 * 
 * @param obj - 要哈希的对象
 * @returns 哈希字符串
 */
export function hashObject(obj: any): string {
  try {
    const str = JSON.stringify(obj)
    return simpleHash(str).toString(36)
  } catch {
    return ''
  }
}

/**
 * 节流函数
 * 
 * 限制函数的执行频率
 * 
 * @param fn - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 防抖函数
 * 
 * 延迟执行函数，如果在延迟期间再次调用则重新计时
 * 
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 验证权限字符串格式
 * 
 * 权限格式：resource:action
 * 
 * @param permission - 权限字符串
 * @returns 是否为有效格式
 */
export function isValidPermissionString(permission: string): boolean {
  if (!permission || typeof permission !== 'string') {
    return false
  }

  const parts = permission.split(':')
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0
}

/**
 * 解析权限字符串
 * 
 * @param permission - 权限字符串（格式：resource:action）
 * @returns 解析后的资源和操作
 */
export function parsePermissionString(permission: string): { resource: string; action: string } | null {
  if (!isValidPermissionString(permission)) {
    return null
  }

  const [resource, action] = permission.split(':')
  return { resource, action }
}

/**
 * 安全地执行函数，捕获异常
 * 
 * @param fn - 要执行的函数
 * @param defaultValue - 发生异常时的默认返回值
 * @returns 函数执行结果或默认值
 */
export function safeExecute<T>(fn: () => T, defaultValue: T): T {
  try {
    return fn()
  } catch (error) {
    console.error('Safe execute error:', error)
    return defaultValue
  }
}

/**
 * 异步安全执行
 * 
 * @param fn - 要执行的异步函数
 * @param defaultValue - 发生异常时的默认返回值
 * @returns 函数执行结果或默认值
 */
export async function safeExecuteAsync<T>(fn: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error('Safe execute async error:', error)
    return defaultValue
  }
}


