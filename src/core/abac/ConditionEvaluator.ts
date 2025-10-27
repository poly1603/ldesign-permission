/**
 * @ldesign/permission - 条件求值器
 * 
 * 负责评估 ABAC 条件表达式
 */

import type {
  Condition,
  CompositeCondition,
  ComparisonOperator,
  LogicalOperator,
  Context,
} from '../../types'
import { getValueByPath } from '../../shared/utils'

/**
 * 条件求值器类
 * 
 * 支持：
 * - 比较运算符（eq, ne, gt, lt, gte, lte, in, contains, etc.）
 * - 逻辑运算符（and, or, not）
 * - 嵌套条件
 */
export class ConditionEvaluator {
  /**
   * 评估条件
   */
  evaluate(condition: Condition | CompositeCondition, context: Context): boolean {
    // 检查是否为复合条件
    if ('operator' in condition && this.isLogicalOperator(condition.operator)) {
      return this.evaluateComposite(condition as CompositeCondition, context)
    }

    // 简单条件
    return this.evaluateSimple(condition as Condition, context)
  }

  /**
   * 评估简单条件
   */
  private evaluateSimple(condition: Condition, context: Context): boolean {
    const actualValue = this.getValueByPath(context, condition.field)
    const expectedValue = condition.value

    switch (condition.operator) {
      case 'eq':
        return actualValue === expectedValue

      case 'ne':
        return actualValue !== expectedValue

      case 'gt':
        return actualValue > expectedValue

      case 'gte':
        return actualValue >= expectedValue

      case 'lt':
        return actualValue < expectedValue

      case 'lte':
        return actualValue <= expectedValue

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue)

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue)

      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue)
        }
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.includes(expectedValue)
        }
        return false

      case 'not_contains':
        if (Array.isArray(actualValue)) {
          return !actualValue.includes(expectedValue)
        }
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return !actualValue.includes(expectedValue)
        }
        return false

      case 'starts_with':
        return typeof actualValue === 'string' &&
          typeof expectedValue === 'string' &&
          actualValue.startsWith(expectedValue)

      case 'ends_with':
        return typeof actualValue === 'string' &&
          typeof expectedValue === 'string' &&
          actualValue.endsWith(expectedValue)

      case 'matches':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          const regex = new RegExp(expectedValue)
          return regex.test(actualValue)
        }
        return false

      case 'exists':
        return actualValue !== undefined && actualValue !== null

      default:
        return false
    }
  }

  /**
   * 评估复合条件
   */
  private evaluateComposite(condition: CompositeCondition, context: Context): boolean {
    const { operator, conditions } = condition

    switch (operator) {
      case 'and':
        return conditions.every(cond => this.evaluate(cond, context))

      case 'or':
        return conditions.some(cond => this.evaluate(cond, context))

      case 'not':
        // NOT 通常只有一个子条件
        return !this.evaluate(conditions[0], context)

      default:
        return false
    }
  }


  /**
   * 检查是否为逻辑运算符
   */
  private isLogicalOperator(operator: string): operator is LogicalOperator {
    return operator === 'and' || operator === 'or' || operator === 'not'
  }

  /**
   * 批量评估多个条件
   */
  evaluateMultiple(conditions: (Condition | CompositeCondition)[], context: Context): boolean[] {
    return conditions.map(condition => this.evaluate(condition, context))
  }

  /**
   * 评估任意一个条件满足
   */
  evaluateAny(conditions: (Condition | CompositeCondition)[], context: Context): boolean {
    return conditions.some(condition => this.evaluate(condition, context))
  }

  /**
   * 评估所有条件满足
   */
  evaluateAll(conditions: (Condition | CompositeCondition)[], context: Context): boolean {
    return conditions.every(condition => this.evaluate(condition, context))
  }
}



