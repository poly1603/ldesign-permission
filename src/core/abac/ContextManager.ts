/**
 * @ldesign/permission - 上下文管理器
 * 
 * 负责管理和构建权限检查的上下文
 */

import type { Context } from '../../types'
import { getValueByPath } from '../../shared/utils'

/**
 * 上下文管理器类
 * 
 * 管理：
 * - 用户上下文
 * - 环境上下文
 * - 资源上下文
 * - 自定义上下文
 */
export class ContextManager {
  /** 全局上下文 */
  private globalContext: Partial<Context> = {}

  /** 上下文提供者函数 */
  private contextProviders: Map<string, () => any> = new Map()

  /**
   * 设置全局上下文
   */
  setGlobalContext(context: Partial<Context>): void {
    this.globalContext = { ...this.globalContext, ...context }
  }

  /**
   * 获取全局上下文
   */
  getGlobalContext(): Partial<Context> {
    return { ...this.globalContext }
  }

  /**
   * 清除全局上下文
   */
  clearGlobalContext(): void {
    this.globalContext = {}
  }

  /**
   * 注册上下文提供者
   */
  registerProvider(key: string, provider: () => any): void {
    this.contextProviders.set(key, provider)
  }

  /**
   * 取消注册上下文提供者
   */
  unregisterProvider(key: string): boolean {
    return this.contextProviders.delete(key)
  }

  /**
   * 构建完整上下文
   */
  buildContext(context: Partial<Context> = {}): Context {
    // 合并全局上下文
    const mergedContext: Context = {
      ...this.globalContext,
      ...context,
    }

    // 应用上下文提供者
    for (const [key, provider] of this.contextProviders.entries()) {
      if (!(key in mergedContext)) {
        try {
          mergedContext[key] = provider()
        } catch (error) {
          console.warn(`Error in context provider "${key}":`, error)
        }
      }
    }

    // 确保环境上下文有时间
    if (mergedContext.environment && !mergedContext.environment.time) {
      mergedContext.environment.time = new Date()
    }

    return mergedContext
  }

  /**
   * 创建用户上下文
   */
  createUserContext(user: {
    id: string
    username?: string
    roles?: string[]
    attributes?: Record<string, any>
    [key: string]: any
  }): Partial<Context> {
    return {
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles || [],
        attributes: user.attributes || {},
        ...user,
      },
    }
  }

  /**
   * 创建资源上下文
   */
  createResourceContext(resource: {
    type: string
    id?: string
    attributes?: Record<string, any>
    [key: string]: any
  }): Partial<Context> {
    return {
      resource: {
        type: resource.type,
        id: resource.id,
        attributes: resource.attributes || {},
        ...resource,
      },
    }
  }

  /**
   * 创建环境上下文
   */
  createEnvironmentContext(env: {
    time?: Date
    ip?: string
    location?: string
    device?: string
    env?: 'development' | 'test' | 'production'
    [key: string]: any
  } = {}): Partial<Context> {
    return {
      environment: {
        time: env.time || new Date(),
        ip: env.ip,
        location: env.location,
        device: env.device,
        env: env.env || (process.env.NODE_ENV as any) || 'development',
        ...env,
      },
    }
  }

  /**
   * 创建操作上下文
   */
  createActionContext(action: {
    type: string
    [key: string]: any
  }): Partial<Context> {
    return {
      action: {
        type: action.type,
        ...action,
      },
    }
  }

  /**
   * 合并多个上下文
   */
  mergeContexts(...contexts: Partial<Context>[]): Context {
    return contexts.reduce((merged, context) => {
      return this.deepMerge(merged, context)
    }, {} as Context)
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * 验证上下文是否完整
   */
  validateContext(context: Context, requiredKeys: string[] = []): boolean {
    for (const key of requiredKeys) {
      if (!(key in context) || context[key] === undefined || context[key] === null) {
        return false
      }
    }
    return true
  }

  /**
   * 从上下文提取属性
   */
  extractAttributes(context: Context, keys: string[]): Record<string, any> {
    const attributes: Record<string, any> = {}

    for (const key of keys) {
      const value = this.getValueByPath(context, key)
      if (value !== undefined) {
        attributes[key] = value
      }
    }

    return attributes
  }


  /**
   * 序列化上下文（用于日志记录）
   */
  serializeContext(context: Context, includeKeys?: string[]): string {
    if (includeKeys) {
      const filtered: any = {}
      for (const key of includeKeys) {
        if (key in context) {
          filtered[key] = context[key]
        }
      }
      return JSON.stringify(filtered)
    }

    return JSON.stringify(context)
  }

  /**
   * 反序列化上下文
   */
  deserializeContext(data: string): Context {
    return JSON.parse(data)
  }

  /**
   * 克隆上下文
   */
  cloneContext(context: Context): Context {
    return JSON.parse(JSON.stringify(context))
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      globalContextKeys: Object.keys(this.globalContext).length,
      registeredProviders: this.contextProviders.size,
    }
  }
}



