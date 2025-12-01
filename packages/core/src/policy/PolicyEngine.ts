/**
 * 策略引擎
 *
 * @description 提供基于属性的访问控制（ABAC）功能
 *
 * @module @ldesign/permission-core/policy
 * @author LDesign Team
 */

import type {
  Action,
  ConditionOperator,
  PolicyCondition,
  PolicyContext,
  PolicyDefinition,
  PolicyEvaluationResult,
  Resource,
} from '../types'

/**
 * 策略引擎配置
 */
export interface PolicyEngineConfig {
  /** 默认策略效果 */
  defaultEffect?: 'allow' | 'deny'
  /** 是否启用策略缓存 */
  enableCache?: boolean
  /** 是否启用调试日志 */
  debug?: boolean
}

/**
 * 策略引擎
 *
 * @description
 * 实现基于属性的访问控制（ABAC）
 *
 * **特性**：
 * - 灵活的策略定义
 * - 复杂条件评估
 * - 优先级处理
 * - 拒绝优先原则
 *
 * @example
 * ```ts
 * const engine = new PolicyEngine()
 *
 * // 定义策略
 * engine.addPolicy({
 *   id: 'allow-admin-all',
 *   name: '允许管理员访问所有资源',
 *   effect: 'allow',
 *   subjects: [{ type: 'role', value: 'admin' }],
 *   resources: ['*'],
 *   actions: ['*'],
 * })
 *
 * // 评估策略
 * const result = engine.evaluate({
 *   user: { id: 1, roles: ['admin'] },
 *   resource: 'user',
 *   action: 'delete',
 * })
 * ```
 */
export class PolicyEngine {
  /** 策略存储 */
  private policies = new Map<string, PolicyDefinition>()

  /** 配置 */
  private readonly config: Required<PolicyEngineConfig>

  /**
   * 创建策略引擎
   *
   * @param config - 配置选项
   */
  constructor(config: PolicyEngineConfig = {}) {
    this.config = {
      defaultEffect: config.defaultEffect ?? 'deny',
      enableCache: config.enableCache ?? true,
      debug: config.debug ?? false,
    }
  }

  /**
   * 添加策略
   *
   * @param policy - 策略定义
   */
  addPolicy(policy: PolicyDefinition): void {
    this.policies.set(policy.id, policy)
  }

  /**
   * 批量添加策略
   *
   * @param policies - 策略定义数组
   */
  addPolicies(policies: PolicyDefinition[]): void {
    for (const policy of policies) {
      this.addPolicy(policy)
    }
  }

  /**
   * 获取策略
   *
   * @param id - 策略 ID
   * @returns 策略定义
   */
  getPolicy(id: string): PolicyDefinition | undefined {
    return this.policies.get(id)
  }

  /**
   * 删除策略
   *
   * @param id - 策略 ID
   * @returns 是否删除成功
   */
  removePolicy(id: string): boolean {
    return this.policies.delete(id)
  }

  /**
   * 获取所有策略
   *
   * @returns 所有策略定义
   */
  getAllPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values())
  }

  /**
   * 评估策略
   *
   * @param context - 评估上下文
   * @returns 评估结果
   */
  evaluate(context: PolicyContext): PolicyEvaluationResult {
    const startTime = performance.now()
    const matchedPolicies: PolicyDefinition[] = []
    const deniedPolicies: PolicyDefinition[] = []

    // 获取并排序策略（按优先级降序）
    const sortedPolicies = this.getSortedPolicies()

    for (const policy of sortedPolicies) {
      // 跳过禁用的策略
      if (policy.enabled === false) {
        continue
      }

      // 检查策略是否匹配
      if (this.matchPolicy(policy, context)) {
        if (policy.effect === 'allow') {
          matchedPolicies.push(policy)
        }
        else {
          deniedPolicies.push(policy)
        }
      }
    }

    // 拒绝优先：如果有任何拒绝策略匹配，则拒绝访问
    const allowed = deniedPolicies.length === 0
      && (matchedPolicies.length > 0 || this.config.defaultEffect === 'allow')

    const duration = performance.now() - startTime

    return {
      allowed,
      matchedPolicies,
      deniedPolicies,
      duration,
      reason: this.getEvaluationReason(allowed, matchedPolicies, deniedPolicies),
    }
  }

  /**
   * 检查是否有权限访问资源
   *
   * @param context - 评估上下文
   * @returns 是否允许
   */
  isAllowed(context: PolicyContext): boolean {
    return this.evaluate(context).allowed
  }

  /**
   * 获取排序后的策略
   *
   * @private
   */
  private getSortedPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  /**
   * 匹配策略
   *
   * @private
   */
  private matchPolicy(policy: PolicyDefinition, context: PolicyContext): boolean {
    // 匹配主体
    if (policy.subjects && !this.matchSubjects(policy.subjects, context)) {
      return false
    }

    // 匹配资源
    if (policy.resources && !this.matchResources(policy.resources, context.resource)) {
      return false
    }

    // 匹配操作
    if (policy.actions && !this.matchActions(policy.actions, context.action)) {
      return false
    }

    // 匹配条件
    if (policy.conditions && !this.matchConditions(policy.conditions, context)) {
      return false
    }

    return true
  }

  /**
   * 匹配主体
   *
   * @private
   */
  private matchSubjects(
    subjects: PolicyDefinition['subjects'],
    context: PolicyContext,
  ): boolean {
    if (!subjects || subjects.length === 0) {
      return true
    }

    const user = context.user
    if (!user) {
      return false
    }

    return subjects.some((subject) => {
      if (subject.type === 'any') {
        return true
      }

      if (subject.type === 'user') {
        const values = Array.isArray(subject.value) ? subject.value : [subject.value]
        return values.includes(String(user.id))
      }

      if (subject.type === 'role') {
        const values = Array.isArray(subject.value) ? subject.value : [subject.value]
        return user.roles?.some(role => values.includes(role)) ?? false
      }

      return false
    })
  }

  /**
   * 匹配资源
   *
   * @private
   */
  private matchResources(resources: Resource[], target?: Resource): boolean {
    if (!target) {
      return resources.length === 0
    }
    return resources.some(r => r === '*' || r === target || target.startsWith(`${r}:`))
  }

  /**
   * 匹配操作
   *
   * @private
   */
  private matchActions(actions: Action[], target?: Action): boolean {
    if (!target) {
      return actions.length === 0
    }
    return actions.some(a => a === '*' || a === target)
  }

  /**
   * 匹配条件
   *
   * @private
   */
  private matchConditions(
    conditions: PolicyCondition[],
    context: PolicyContext,
  ): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, context))
  }

  /**
   * 评估单个条件
   *
   * @private
   */
  private evaluateCondition(condition: PolicyCondition, context: PolicyContext): boolean {
    const { type, key, value, operator = 'eq' } = condition

    let targetValue: unknown

    switch (type) {
      case 'attribute':
        targetValue = this.getNestedValue(context.attributes, key)
          ?? this.getNestedValue(context.user?.attributes, key)
        break
      case 'environment':
        targetValue = this.getNestedValue(context.environment, key)
        break
      case 'time':
        targetValue = this.getTimeValue(key, context)
        break
      case 'ip':
        targetValue = context.environment?.ip
        break
      default:
        targetValue = this.getNestedValue(context, key)
    }

    return this.compareValues(targetValue, value, operator)
  }

  /**
   * 获取嵌套值
   *
   * @private
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined
    }

    const keys = path.split('.')
    let current: unknown = obj

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = (current as Record<string, unknown>)[key]
    }

    return current
  }

  /**
   * 获取时间值
   *
   * @private
   */
  private getTimeValue(key: string, context: PolicyContext): unknown {
    const timestamp = context.environment?.timestamp ?? Date.now()
    const date = new Date(timestamp)

    switch (key) {
      case 'hour':
        return date.getHours()
      case 'day':
        return date.getDay()
      case 'date':
        return date.getDate()
      case 'month':
        return date.getMonth() + 1
      case 'year':
        return date.getFullYear()
      default:
        return timestamp
    }
  }

  /**
   * 比较值
   *
   * @private
   */
  private compareValues(
    target: unknown,
    expected: unknown,
    operator: ConditionOperator,
  ): boolean {
    switch (operator) {
      case 'eq':
        return target === expected
      case 'ne':
        return target !== expected
      case 'gt':
        return Number(target) > Number(expected)
      case 'gte':
        return Number(target) >= Number(expected)
      case 'lt':
        return Number(target) < Number(expected)
      case 'lte':
        return Number(target) <= Number(expected)
      case 'in':
        return Array.isArray(expected) && expected.includes(target)
      case 'nin':
        return Array.isArray(expected) && !expected.includes(target)
      case 'contains':
        return String(target).includes(String(expected))
      case 'startsWith':
        return String(target).startsWith(String(expected))
      case 'endsWith':
        return String(target).endsWith(String(expected))
      case 'regex':
        try {
          return new RegExp(String(expected)).test(String(target))
        }
        catch {
          return false
        }
      default:
        return false
    }
  }

  /**
   * 获取评估原因
   *
   * @private
   */
  private getEvaluationReason(
    allowed: boolean,
    matched: PolicyDefinition[],
    denied: PolicyDefinition[],
  ): string {
    if (denied.length > 0) {
      return `被策略 "${denied[0].name}" 拒绝`
    }
    if (matched.length > 0) {
      return `被策略 "${matched[0].name}" 允许`
    }
    if (allowed) {
      return '默认允许策略'
    }
    return '没有匹配的允许策略'
  }

  /**
   * 清空所有策略
   */
  clear(): void {
    this.policies.clear()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    policyCount: number
    allowPolicies: number
    denyPolicies: number
  } {
    let allowCount = 0
    let denyCount = 0

    for (const policy of this.policies.values()) {
      if (policy.effect === 'allow') {
        allowCount++
      }
      else {
        denyCount++
      }
    }

    return {
      policyCount: this.policies.size,
      allowPolicies: allowCount,
      denyPolicies: denyCount,
    }
  }
}

/**
 * 创建策略引擎
 *
 * @param config - 配置选项
 * @returns 策略引擎实例
 */
export function createPolicyEngine(config?: PolicyEngineConfig): PolicyEngine {
  return new PolicyEngine(config)
}
