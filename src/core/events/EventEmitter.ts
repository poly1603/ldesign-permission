/**
 * @ldesign/permission - 事件发射器
 * 
 * 发布/订阅模式的事件系统
 */

/**
 * 事件处理函数类型
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>

/**
 * 事件发射器类
 * 
 * 提供事件的发布和订阅功能
 */
export class EventEmitter {
  /** 事件监听器映射 */
  private listeners: Map<string, Set<EventHandler>> = new Map()

  /** 一次性监听器映射 */
  private onceListeners: Map<string, Set<EventHandler>> = new Map()

  /** 最大监听器数量 */
  private maxListeners: number = 100

  /**
   * 监听事件
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const handlers = this.listeners.get(event)!

    // 检查最大监听器数量
    if (handlers.size >= this.maxListeners) {
      console.warn(
        `EventEmitter: Maximum listeners (${this.maxListeners}) exceeded for event "${event}"`
      )
    }

    handlers.add(handler)

    // 返回取消监听函数
    return () => this.off(event, handler)
  }

  /**
   * 监听事件（一次性）
   */
  once<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set())
    }

    this.onceListeners.get(event)!.add(handler)

    return () => {
      const handlers = this.onceListeners.get(event)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  /**
   * 取消监听
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    // 取消普通监听器
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }

    // 取消一次性监听器
    const onceHandlers = this.onceListeners.get(event)
    if (onceHandlers) {
      onceHandlers.delete(handler)
      if (onceHandlers.size === 0) {
        this.onceListeners.delete(event)
      }
    }
  }

  /**
   * 发射事件
   */
  async emit<T = any>(event: string, data?: T): Promise<void> {
    // 触发普通监听器
    const handlers = this.listeners.get(event)
    if (handlers) {
      const promises: Promise<void>[] = []

      for (const handler of handlers) {
        try {
          const result = handler(data)
          if (result instanceof Promise) {
            promises.push(result)
          }
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises)
      }
    }

    // 触发一次性监听器
    const onceHandlers = this.onceListeners.get(event)
    if (onceHandlers) {
      const promises: Promise<void>[] = []

      for (const handler of onceHandlers) {
        try {
          const result = handler(data)
          if (result instanceof Promise) {
            promises.push(result)
          }
        } catch (error) {
          console.error(`Error in once handler for "${event}":`, error)
        }
      }

      // 清除一次性监听器
      this.onceListeners.delete(event)

      if (promises.length > 0) {
        await Promise.all(promises)
      }
    }
  }

  /**
   * 同步发射事件
   */
  emitSync<T = any>(event: string, data?: T): void {
    // 触发普通监听器
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      }
    }

    // 触发一次性监听器
    const onceHandlers = this.onceListeners.get(event)
    if (onceHandlers) {
      for (const handler of onceHandlers) {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in once handler for "${event}":`, error)
        }
      }

      // 清除一次性监听器
      this.onceListeners.delete(event)
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
      this.onceListeners.delete(event)
    } else {
      this.listeners.clear()
      this.onceListeners.clear()
    }
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: string): number {
    const handlers = this.listeners.get(event)
    const onceHandlers = this.onceListeners.get(event)

    return (handlers?.size || 0) + (onceHandlers?.size || 0)
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    const names = new Set<string>()

    for (const event of this.listeners.keys()) {
      names.add(event)
    }

    for (const event of this.onceListeners.keys()) {
      names.add(event)
    }

    return Array.from(names)
  }

  /**
   * 设置最大监听器数量
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n
  }

  /**
   * 获取最大监听器数量
   */
  getMaxListeners(): number {
    return this.maxListeners
  }
}



