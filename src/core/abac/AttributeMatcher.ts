/**
 * @ldesign/permission - 属性匹配器
 * 
 * 负责属性的匹配和计算
 */

import type { Attribute, Context, AttributeMatcherConfig } from '../../types'
import { getValueByPath } from '../../shared/utils'

/**
 * 属性匹配器类
 * 
 * 支持：
 * - 静态属性匹配
 * - 动态属性计算
 * - 深度路径访问
 * - 自定义匹配器
 */
export class AttributeMatcher {
  /** 配置 */
  private config: Required<AttributeMatcherConfig>

  /** 属性缓存 */
  private attributeCache: Map<string, any> = new Map()

  /** 缓存最大容量 */
  private readonly MAX_CACHE_SIZE = 1000

  constructor(config: AttributeMatcherConfig = {}) {
    this.config = {
      ignoreCase: config.ignoreCase ?? false,
      partialMatch: config.partialMatch ?? false,
      customMatchers: config.customMatchers ?? {},
    }
  }

  /**
   * 匹配属性
   */
  match(attribute: Attribute, context: Context): boolean {
    const actualValue = this.getAttributeValue(attribute, context)
    const expectedValue = attribute.value

    // 自定义匹配器
    if (attribute.name in this.config.customMatchers) {
      return this.config.customMatchers[attribute.name](actualValue, expectedValue)
    }

    // 根据类型匹配
    switch (attribute.type) {
      case 'string':
        return this.matchString(actualValue, expectedValue)

      case 'number':
        return this.matchNumber(actualValue, expectedValue)

      case 'boolean':
        return this.matchBoolean(actualValue, expectedValue)

      case 'date':
        return this.matchDate(actualValue, expectedValue)

      case 'array':
        return this.matchArray(actualValue, expectedValue)

      case 'object':
        return this.matchObject(actualValue, expectedValue)

      default:
        return actualValue === expectedValue
    }
  }

  /**
   * 获取属性值
   */
  private getAttributeValue(attribute: Attribute, context: Context): any {
    // 动态属性
    if (attribute.dynamic && attribute.compute) {
      const cacheKey = `${attribute.name}:${JSON.stringify(context)}`

      if (this.attributeCache.has(cacheKey)) {
        return this.attributeCache.get(cacheKey)
      }

      const value = attribute.compute(context)

      // 检查缓存大小限制
      if (this.attributeCache.size >= this.MAX_CACHE_SIZE) {
        // 删除最早的缓存项（FIFO）
        const firstKey = this.attributeCache.keys().next().value
        this.attributeCache.delete(firstKey)
      }

      this.attributeCache.set(cacheKey, value)

      return value
    }

    // 静态属性 - 从上下文中获取
    return getValueByPath(context, attribute.name)
  }

  /**
   * 字符串匹配
   */
  private matchString(actual: any, expected: any): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return actual === expected
    }

    if (this.config.ignoreCase) {
      actual = actual.toLowerCase()
      expected = expected.toLowerCase()
    }

    if (this.config.partialMatch) {
      return actual.includes(expected)
    }

    return actual === expected
  }

  /**
   * 数字匹配
   */
  private matchNumber(actual: any, expected: any): boolean {
    const actualNum = Number(actual)
    const expectedNum = Number(expected)

    if (Number.isNaN(actualNum) || Number.isNaN(expectedNum)) {
      return false
    }

    return actualNum === expectedNum
  }

  /**
   * 布尔匹配
   */
  private matchBoolean(actual: any, expected: any): boolean {
    return Boolean(actual) === Boolean(expected)
  }

  /**
   * 日期匹配
   */
  private matchDate(actual: any, expected: any): boolean {
    const actualDate = actual instanceof Date ? actual : new Date(actual)
    const expectedDate = expected instanceof Date ? expected : new Date(expected)

    if (Number.isNaN(actualDate.getTime()) || Number.isNaN(expectedDate.getTime())) {
      return false
    }

    return actualDate.getTime() === expectedDate.getTime()
  }

  /**
   * 数组匹配
   */
  private matchArray(actual: any, expected: any): boolean {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      return false
    }

    if (actual.length !== expected.length) {
      return false
    }

    return actual.every((item, index) => {
      const expectedItem = expected[index]

      if (typeof item === 'object' && item !== null) {
        return this.matchObject(item, expectedItem)
      }

      return item === expectedItem
    })
  }

  /**
   * 对象匹配
   */
  private matchObject(actual: any, expected: any): boolean {
    if (typeof actual !== 'object' || typeof expected !== 'object') {
      return false
    }

    if (actual === null || expected === null) {
      return actual === expected
    }

    const expectedKeys = Object.keys(expected)

    return expectedKeys.every(key => {
      const actualValue = actual[key]
      const expectedValue = expected[key]

      if (typeof expectedValue === 'object' && expectedValue !== null) {
        return this.matchObject(actualValue, expectedValue)
      }

      return actualValue === expectedValue
    })
  }


  /**
   * 批量匹配属性
   */
  matchMultiple(attributes: Attribute[], context: Context): boolean[] {
    return attributes.map(attribute => this.match(attribute, context))
  }

  /**
   * 匹配任意一个属性
   */
  matchAny(attributes: Attribute[], context: Context): boolean {
    return attributes.some(attribute => this.match(attribute, context))
  }

  /**
   * 匹配所有属性
   */
  matchAll(attributes: Attribute[], context: Context): boolean {
    return attributes.every(attribute => this.match(attribute, context))
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.attributeCache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.attributeCache.size,
    }
  }
}



