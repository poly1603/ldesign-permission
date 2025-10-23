/**
 * @ldesign/permission - 策略引擎
 * 
 * 统一的策略管理和求值引擎
 */

import type {
  Policy,
  PolicyRule,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyEngineConfig,
  ConflictResolution,
  Effect,
  Context,
} from '../../types'
import { PolicyStore } from './PolicyStore'
import { ConditionEvaluator } from '../abac/ConditionEvaluator'

/**
 * 策略引擎类
 * 
 * 核心功能：
 * - 策略注册和管理
 * - 策略评估
 * - 冲突解决
 * - 规则匹配
 */
export class PolicyEngine {
  /** 策略存储 */
  private store: PolicyStore

  /** 条件求值器 */
  private conditionEvaluator: ConditionEvaluator

  /** 配置 */
  private config: Required<PolicyEngineConfig>

  /** 评估计数器 */
  private evaluationCount: number = 0

  constructor(config: PolicyEngineConfig = {}) {
    this.config = {
      defaultConflictResolution: config.defaultConflictResolution ?? 'deny-override',
      enableCache: config.enableCache ?? true,
      strict: config.strict ?? false,
      maxRuleEvaluations: config.maxRuleEvaluations ?? 1000,
    }

    this.store = new PolicyStore()
    this.conditionEvaluator = new ConditionEvaluator()
  }

  // ==================== 策略管理 ====================

  /**
   * 添加策略
   */
  addPolicy(policy: Policy): void {
    this.store.add(policy)
  }

  /**
   * 获取策略
   */
  getPolicy(id: string): Policy | null {
    return this.store.get(id)
  }

  /**
   * 获取所有策略
   */
  getAllPolicies(): Policy[] {
    return this.store.getAll()
  }

  /**
   * 更新策略
   */
  updatePolicy(id: string, updates: Partial<Policy>): void {
    this.store.update(id, updates)
  }

  /**
   * 删除策略
   */
  removePolicy(id: string): void {
    this.store.remove(id)
  }

  /**
   * 启用策略
   */
  enablePolicy(id: string): void {
    this.store.update(id, { enabled: true })
  }

  /**
   * 禁用策略
   */
  disablePolicy(id: string): void {
    this.store.update(id, { enabled: false })
  }

  // ==================== 策略评估 ====================

  /**
   * 评估策略请求
   */
  evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const startTime = performance.now()
    this.evaluationCount = 0

    const { subject, resource, action, context } = request

    // 查找相关策略
    const policies = this.findRelevantPolicies(subject, resource, action)

    if (policies.length === 0) {
      return {
        allowed: !this.config.strict,
        effect: this.config.strict ? 'deny' : 'allow',
        matchedRules: [],
        duration: performance.now() - startTime,
        reason: 'No relevant policies found',
        details: {
          evaluatedPolicies: [],
          matchedPolicies: [],
        },
      }
    }

    // 评估所有策略
    const matchedRules: PolicyRule[] = []
    const evaluatedPolicies: string[] = []
    const matchedPolicies: string[] = []

    for (const policy of policies) {
      evaluatedPolicies.push(policy.id)

      const policyRules = this.evaluatePolicy(policy, subject, resource, action, context)

      if (policyRules.length > 0) {
        matchedPolicies.push(policy.id)
        matchedRules.push(...policyRules)
      }

      // 检查是否超过最大评估数
      if (this.evaluationCount > this.config.maxRuleEvaluations) {
        return {
          allowed: false,
          effect: 'deny',
          matchedRules: [],
          duration: performance.now() - startTime,
          reason: 'Maximum rule evaluations exceeded',
        }
      }
    }

    // 解决冲突
    const result = this.resolveConflicts(matchedRules, policies[0]?.conflictResolution)

    return {
      ...result,
      duration: performance.now() - startTime,
      details: {
        evaluatedPolicies,
        matchedPolicies,
        conflictingRules: matchedRules.length > 1 ? matchedRules : undefined,
      },
    }
  }

  /**
   * 查找相关策略
   */
  private findRelevantPolicies(subject: string, resource: string, action: string): Policy[] {
    const allPolicies = this.store.getEnabled()

    return allPolicies.filter(policy => {
      return policy.rules.some(rule => {
        return this.matchesTarget(rule.subjects, subject) &&
          this.matchesTarget(rule.resources, resource) &&
          this.matchesTarget(rule.actions, action)
      })
    })
  }

  /**
   * 检查目标是否匹配
   */
  private matchesTarget(targets: string[] | undefined, value: string): boolean {
    if (!targets || targets.length === 0) {
      return true // 未指定目标，匹配所有
    }

    return targets.includes(value) || targets.includes('*')
  }

  /**
   * 评估单个策略
   */
  private evaluatePolicy(
    policy: Policy,
    subject: string,
    resource: string,
    action: string,
    context?: Context
  ): PolicyRule[] {
    const matchedRules: PolicyRule[] = []

    for (const rule of policy.rules) {
      this.evaluationCount++

      // 检查规则是否启用
      if (rule.enabled === false) {
        continue
      }

      // 检查目标匹配
      if (!this.matchesTarget(rule.subjects, subject) ||
        !this.matchesTarget(rule.resources, resource) ||
        !this.matchesTarget(rule.actions, action)) {
        continue
      }

      // 评估条件
      if (rule.conditions && context) {
        try {
          const conditionMet = this.conditionEvaluator.evaluate(rule.conditions, context)
          if (!conditionMet) {
            continue
          }
        } catch (error) {
          console.error('Error evaluating rule condition:', error)
          continue
        }
      }

      matchedRules.push(rule)
    }

    return matchedRules
  }

  /**
   * 解决规则冲突
   */
  private resolveConflicts(
    rules: PolicyRule[],
    strategy?: ConflictResolution
  ): Omit<PolicyEvaluationResult, 'duration' | 'details'> {
    if (rules.length === 0) {
      return {
        allowed: false,
        effect: 'deny',
        matchedRules: [],
        reason: 'No matching rules',
      }
    }

    const resolution = strategy || this.config.defaultConflictResolution

    switch (resolution) {
      case 'deny-override':
        return this.denyOverride(rules)

      case 'allow-override':
        return this.allowOverride(rules)

      case 'first-applicable':
        return this.firstApplicable(rules)

      case 'only-one-applicable':
        return this.onlyOneApplicable(rules)

      default:
        return this.denyOverride(rules)
    }
  }

  /**
   * 拒绝优先策略
   * 只要有一个 deny 规则，就拒绝访问
   */
  private denyOverride(rules: PolicyRule[]): Omit<PolicyEvaluationResult, 'duration' | 'details'> {
    const denyRule = rules.find(rule => rule.effect === 'deny')

    if (denyRule) {
      return {
        allowed: false,
        effect: 'deny',
        matchedRules: [denyRule],
        reason: denyRule.description || 'Access denied by rule',
      }
    }

    const allowRule = rules.find(rule => rule.effect === 'allow')

    if (allowRule) {
      return {
        allowed: true,
        effect: 'allow',
        matchedRules: [allowRule],
        reason: allowRule.description,
      }
    }

    return {
      allowed: false,
      effect: 'deny',
      matchedRules: [],
      reason: 'No allow rules found',
    }
  }

  /**
   * 允许优先策略
   * 只要有一个 allow 规则，就允许访问
   */
  private allowOverride(rules: PolicyRule[]): Omit<PolicyEvaluationResult, 'duration' | 'details'> {
    const allowRule = rules.find(rule => rule.effect === 'allow')

    if (allowRule) {
      return {
        allowed: true,
        effect: 'allow',
        matchedRules: [allowRule],
        reason: allowRule.description,
      }
    }

    const denyRule = rules.find(rule => rule.effect === 'deny')

    if (denyRule) {
      return {
        allowed: false,
        effect: 'deny',
        matchedRules: [denyRule],
        reason: denyRule.description || 'Access denied by rule',
      }
    }

    return {
      allowed: false,
      effect: 'deny',
      matchedRules: [],
      reason: 'No matching rules',
    }
  }

  /**
   * 第一个匹配策略
   * 按优先级顺序，第一个匹配的规则生效
   */
  private firstApplicable(rules: PolicyRule[]): Omit<PolicyEvaluationResult, 'duration' | 'details'> {
    // 按优先级排序
    const sortedRules = [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA
    })

    const firstRule = sortedRules[0]

    return {
      allowed: firstRule.effect === 'allow',
      effect: firstRule.effect,
      matchedRules: [firstRule],
      reason: firstRule.description,
    }
  }

  /**
   * 只允许一个匹配策略
   * 如果有多个规则匹配，则报错
   */
  private onlyOneApplicable(rules: PolicyRule[]): Omit<PolicyEvaluationResult, 'duration' | 'details'> {
    if (rules.length > 1) {
      return {
        allowed: false,
        effect: 'deny',
        matchedRules: rules,
        reason: `Multiple rules matched (${rules.length}), but only one is allowed`,
      }
    }

    const rule = rules[0]

    return {
      allowed: rule.effect === 'allow',
      effect: rule.effect,
      matchedRules: [rule],
      reason: rule.description,
    }
  }

  // ==================== 便捷方法 ====================

  /**
   * 检查是否允许访问
   */
  isAllowed(subject: string, resource: string, action: string, context?: Context): boolean {
    const result = this.evaluate({ subject, resource, action, context })
    return result.allowed
  }

  /**
   * 检查是否拒绝访问
   */
  isDenied(subject: string, resource: string, action: string, context?: Context): boolean {
    return !this.isAllowed(subject, resource, action, context)
  }

  // ==================== 工具方法 ====================

  /**
   * 获取策略存储
   */
  getStore(): PolicyStore {
    return this.store
  }

  /**
   * 清空所有策略
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * 导出策略
   */
  export(): string {
    return this.store.export()
  }

  /**
   * 导入策略
   */
  import(data: string): void {
    this.store.import(data)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.store.getStats(),
      lastEvaluationCount: this.evaluationCount,
    }
  }
}



