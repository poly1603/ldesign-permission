/**
 * @ldesign/permission - 规则构建器
 * 
 * 提供链式 API 构建策略规则
 */

import type {
  PolicyRule,
  RuleBuilder as IRuleBuilder,
  Effect,
  Condition,
  CompositeCondition,
} from '../../types'

/**
 * 规则构建器类
 * 
 * 链式 API 示例：
 * ```typescript
 * const rule = new RuleBuilder()
 *   .id('rule1')
 *   .name('Admin Access')
 *   .allow()
 *   .subjects('admin', 'superuser')
 *   .resources('users', 'posts')
 *   .actions('create', 'read', 'update', 'delete')
 *   .when({ field: 'user.active', operator: 'eq', value: true })
 *   .priority(100)
 *   .build()
 * ```
 */
export class RuleBuilder implements IRuleBuilder {
  private rule: Partial<PolicyRule> = {
    enabled: true,
  }

  /**
   * 设置规则ID
   */
  id(id: string): RuleBuilder {
    this.rule.id = id
    return this
  }

  /**
   * 设置规则名称
   */
  name(name: string): RuleBuilder {
    this.rule.name = name
    return this
  }

  /**
   * 设置规则描述
   */
  description(description: string): RuleBuilder {
    this.rule.description = description
    return this
  }

  /**
   * 设置效果
   */
  effect(effect: Effect): RuleBuilder {
    this.rule.effect = effect
    return this
  }

  /**
   * 允许
   */
  allow(): RuleBuilder {
    this.rule.effect = 'allow'
    return this
  }

  /**
   * 拒绝
   */
  deny(): RuleBuilder {
    this.rule.effect = 'deny'
    return this
  }

  /**
   * 设置主体
   */
  subjects(...subjects: string[]): RuleBuilder {
    this.rule.subjects = subjects
    return this
  }

  /**
   * 设置资源
   */
  resources(...resources: string[]): RuleBuilder {
    this.rule.resources = resources
    return this
  }

  /**
   * 设置操作
   */
  actions(...actions: string[]): RuleBuilder {
    this.rule.actions = actions
    return this
  }

  /**
   * 添加条件
   */
  when(condition: Condition | CompositeCondition): RuleBuilder {
    this.rule.conditions = condition
    return this
  }

  /**
   * 添加 AND 条件
   */
  and(...conditions: (Condition | CompositeCondition)[]): RuleBuilder {
    if (!this.rule.conditions) {
      // 如果没有现有条件，直接设置为 AND 条件
      this.rule.conditions = {
        operator: 'and',
        conditions,
      }
    } else if ('operator' in this.rule.conditions && this.rule.conditions.operator === 'and') {
      // 如果已经是 AND 条件，添加到现有条件中
      this.rule.conditions.conditions.push(...conditions)
    } else {
      // 否则，将现有条件和新条件组合为 AND
      this.rule.conditions = {
        operator: 'and',
        conditions: [this.rule.conditions, ...conditions],
      }
    }
    return this
  }

  /**
   * 添加 OR 条件
   */
  or(...conditions: (Condition | CompositeCondition)[]): RuleBuilder {
    if (!this.rule.conditions) {
      this.rule.conditions = {
        operator: 'or',
        conditions,
      }
    } else if ('operator' in this.rule.conditions && this.rule.conditions.operator === 'or') {
      this.rule.conditions.conditions.push(...conditions)
    } else {
      this.rule.conditions = {
        operator: 'or',
        conditions: [this.rule.conditions, ...conditions],
      }
    }
    return this
  }

  /**
   * 添加 NOT 条件
   */
  not(condition: Condition | CompositeCondition): RuleBuilder {
    this.rule.conditions = {
      operator: 'not',
      conditions: [condition],
    }
    return this
  }

  /**
   * 设置优先级
   */
  priority(priority: number): RuleBuilder {
    this.rule.priority = priority
    return this
  }

  /**
   * 设置是否启用
   */
  enabled(enabled: boolean): RuleBuilder {
    this.rule.enabled = enabled
    return this
  }

  /**
   * 设置元数据
   */
  metadata(metadata: Record<string, any>): RuleBuilder {
    this.rule.metadata = metadata
    return this
  }

  /**
   * 添加元数据字段
   */
  addMetadata(key: string, value: any): RuleBuilder {
    if (!this.rule.metadata) {
      this.rule.metadata = {}
    }
    this.rule.metadata[key] = value
    return this
  }

  /**
   * 构建规则
   */
  build(): PolicyRule {
    // 验证必填字段
    if (!this.rule.id) {
      this.rule.id = this.generateId()
    }

    if (!this.rule.effect) {
      throw new Error('Rule effect is required')
    }

    return this.rule as PolicyRule
  }

  /**
   * 生成规则ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 重置构建器
   */
  reset(): RuleBuilder {
    this.rule = {
      enabled: true,
    }
    return this
  }

  /**
   * 克隆构建器
   */
  clone(): RuleBuilder {
    const builder = new RuleBuilder()
    builder.rule = { ...this.rule }
    return builder
  }
}

/**
 * 创建规则构建器
 */
export function createRuleBuilder(): RuleBuilder {
  return new RuleBuilder()
}

/**
 * 快捷方法：创建允许规则
 */
export function allowRule(): RuleBuilder {
  return new RuleBuilder().allow()
}

/**
 * 快捷方法：创建拒绝规则
 */
export function denyRule(): RuleBuilder {
  return new RuleBuilder().deny()
}



