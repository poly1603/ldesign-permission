/**
 * @ldesign/permission - ABAC 引擎
 * 
 * 基于属性的访问控制（Attribute-Based Access Control）核心引擎
 * 
 * ABAC 是一种更灵活的权限控制模型，通过评估用户、资源、环境等各种属性
 * 来决定是否授予权限。相比 RBAC，ABAC 可以实现更细粒度的权限控制。
 * 
 * 核心概念：
 * - 属性（Attribute）：用户、资源、环境等的特征（如用户的部门、资源的所有者）
 * - 规则（Rule）：定义在什么条件下允许或拒绝访问
 * - 条件（Condition）：规则的判断逻辑（如 user.department == 'IT'）
 * - 上下文（Context）：包含所有相关属性的环境信息
 * 
 * 支持的特性：
 * - ✅ 复杂条件表达式（and/or/not）
 * - ✅ 多种比较运算符（eq/gt/lt/in/contains/matches 等）
 * - ✅ 动态属性计算
 * - ✅ 字段级权限控制
 * - ✅ 规则优先级
 * - ✅ 条件缓存优化
 * 
 * @example
 * ```typescript
 * const abac = new ABACEngine()
 * 
 * // 定义规则：用户只能编辑自己创建的文章
 * abac.addRule({
 *   action: 'update',
 *   subject: 'Post',
 *   conditions: {
 *     field: 'authorId',
 *     operator: 'eq',
 *     value: '{{userId}}' // 动态值，从上下文中获取
 *   }
 * })
 * 
 * // 定义复杂规则：管理员或文章作者可以删除草稿
 * abac.addRule({
 *   action: 'delete',
 *   subject: 'Post',
 *   conditions: {
 *     operator: 'or',
 *     conditions: [
 *       { field: 'user.role', operator: 'eq', value: 'admin' },
 *       {
 *         operator: 'and',
 *         conditions: [
 *           { field: 'post.authorId', operator: 'eq', value: '{{userId}}' },
 *           { field: 'post.status', operator: 'eq', value: 'draft' }
 *         ]
 *       }
 *     ]
 *   }
 * })
 * 
 * // 检查权限
 * const context = {
 *   user: { id: 'user123', role: 'editor' },
 *   post: { authorId: 'user123', status: 'draft' }
 * }
 * abac.can('delete', { type: 'Post' }, context) // true
 * ```
 */

import type {
  AbilityRule,
  Ability,
  Context,
  ABACConfig,
  FieldPermission,
  CheckResult,
} from '../../types'
import { ConditionEvaluator } from './ConditionEvaluator'
import { AttributeMatcher } from './AttributeMatcher'
import { ContextManager } from './ContextManager'

/**
 * ABAC 引擎类
 * 
 * 这是 ABAC 系统的核心实现，提供基于属性的权限控制功能。
 * 
 * 核心功能：
 * - 能力规则管理（添加、删除、查询规则）
 * - 条件求值（支持复杂的逻辑表达式）
 * - 属性匹配（支持多种数据类型和运算符）
 * - 上下文处理（构建和管理权限检查的上下文环境）
 * - 字段级权限（控制对象字段的访问权限）
 * 
 * 架构设计：
 * - ConditionEvaluator：负责条件表达式的求值
 * - AttributeMatcher：负责属性的匹配和比较
 * - ContextManager：负责上下文的构建和管理
 * - ABACEngine：协调三者，提供统一的 API
 * 
 * 使用场景：
 * - 数据所有者权限（用户只能操作自己的数据）
 * - 部门权限（同部门用户可以查看彼此的数据）
 * - 时间限制（只能在工作时间访问）
 * - 地理位置限制（只能在特定地点访问）
 * - 动态权限（根据资源状态决定权限）
 * 
 * @example
 * ```typescript
 * const abac = new ABACEngine({
 *   enableConditionCache: true,  // 启用条件缓存
 *   strict: false,                // 非严格模式
 *   maxConditionDepth: 10         // 最大条件嵌套深度
 * })
 * 
 * // 场景1：用户只能编辑自己的数据
 * abac.addRule({
 *   action: 'update',
 *   subject: 'Document',
 *   conditions: {
 *     field: 'ownerId',
 *     operator: 'eq',
 *     value: '{{userId}}'
 *   }
 * })
 * 
 * // 场景2：工作时间限制
 * abac.addRule({
 *   action: '*',
 *   subject: 'SensitiveData',
 *   conditions: {
 *     operator: 'and',
 *     conditions: [
 *       { field: 'environment.time.hour', operator: 'gte', value: 9 },
 *       { field: 'environment.time.hour', operator: 'lt', value: 18 }
 *     ]
 *   }
 * })
 * ```
 */
export class ABACEngine implements Ability {
  /** 能力规则列表 - 所有已定义的 ABAC 规则 */
  public rules: AbilityRule[] = []

  /** 条件求值器 - 负责评估规则中的条件表达式 */
  private conditionEvaluator: ConditionEvaluator

  /** 属性匹配器 - 负责属性的匹配和比较 */
  private attributeMatcher: AttributeMatcher

  /** 上下文管理器 - 负责上下文的构建和管理 */
  private contextManager: ContextManager

  /** 配置选项 */
  private config: Required<ABACConfig>

  /** 字段权限映射 - 存储字段级别的访问控制规则 */
  private fieldPermissions: Map<string, FieldPermission> = new Map()

  /**
   * 创建 ABAC 引擎实例
   * 
   * @param config - 配置选项
   * @param config.enableConditionCache - 是否启用条件评估缓存，默认 true
   * @param config.enableAttributeCache - 是否启用属性计算缓存，默认 true
   * @param config.strict - 是否启用严格模式，默认 false
   *   - 严格模式：没有匹配规则时拒绝访问
   *   - 非严格模式：没有匹配规则时允许访问
   * @param config.maxConditionDepth - 最大条件嵌套深度，默认 10，防止递归过深
   */
  constructor(config: ABACConfig = {}) {
    this.config = {
      enableConditionCache: config.enableConditionCache ?? true,
      enableAttributeCache: config.enableAttributeCache ?? true,
      strict: config.strict ?? false,
      maxConditionDepth: config.maxConditionDepth ?? 10,
    }

    this.conditionEvaluator = new ConditionEvaluator()
    this.attributeMatcher = new AttributeMatcher()
    this.contextManager = new ContextManager()
  }

  // ==================== 规则管理 ====================

  /**
   * 添加能力规则
   */
  addRule(rule: AbilityRule): void {
    // 生成规则ID（如果没有）
    if (!rule.id) {
      rule.id = this.generateRuleId()
    }

    this.rules.push(rule)

    // 按优先级排序
    this.sortRulesByPriority()
  }

  /**
   * 批量添加规则
   */
  addRules(rules: AbilityRule[]): void {
    rules.forEach(rule => this.addRule(rule))
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === ruleId)
    if (index === -1) {
      return false
    }

    this.rules.splice(index, 1)
    return true
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): AbilityRule | undefined {
    return this.rules.find(rule => rule.id === ruleId)
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AbilityRule[] {
    return [...this.rules]
  }

  /**
   * 清空所有规则
   */
  clearRules(): void {
    this.rules = []
  }

  /**
   * 按优先级排序规则
   */
  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA // 高优先级在前
    })
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // ==================== 权限检查 ====================

  /**
   * 检查是否能执行操作
   */
  can(action: string, subject: any, context?: Context): boolean {
    const result = this.check(action, subject, context)
    return result.allowed
  }

  /**
   * 检查是否不能执行操作
   */
  cannot(action: string, subject: any, context?: Context): boolean {
    return !this.can(action, subject, context)
  }

  /**
   * 详细权限检查
   */
  check(action: string, subject: any, context?: Context): CheckResult {
    const startTime = performance.now()
    const fullContext = this.contextManager.buildContext(context || {})

    // 确定主体类型
    const subjectType = typeof subject === 'string' ? subject : subject?.type || subject?.constructor?.name

    // 查找匹配的规则
    const matchingRules: AbilityRule[] = []

    for (const rule of this.rules) {
      if (this.matchesRule(rule, action, subjectType, subject, fullContext)) {
        matchingRules.push(rule)

        // 如果找到允许的规则（非反向），立即返回
        if (!rule.inverted) {
          return {
            allowed: true,
            matchedPermission: { resource: subjectType, action },
            duration: performance.now() - startTime,
            reason: rule.reason,
          }
        }
      }
    }

    // 检查是否有拒绝规则（反向规则）
    const hasDenyRule = matchingRules.some(rule => rule.inverted)

    if (hasDenyRule) {
      return {
        allowed: false,
        duration: performance.now() - startTime,
        reason: 'Access explicitly denied by rule',
      }
    }

    // 严格模式：没有匹配规则则拒绝
    if (this.config.strict && matchingRules.length === 0) {
      return {
        allowed: false,
        duration: performance.now() - startTime,
        reason: 'No matching rules found (strict mode)',
      }
    }

    // 默认：没有规则则允许（宽松模式）
    return {
      allowed: matchingRules.length > 0,
      duration: performance.now() - startTime,
      reason: matchingRules.length === 0 ? 'No matching rules' : undefined,
    }
  }

  /**
   * 检查规则是否匹配
   */
  private matchesRule(
    rule: AbilityRule,
    action: string,
    subjectType: string,
    subject: any,
    context: Context
  ): boolean {
    // 匹配操作
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
    if (!actions.includes(action) && !actions.includes('*')) {
      return false
    }

    // 匹配主体类型
    const subjects = Array.isArray(rule.subject) ? rule.subject : [rule.subject]
    if (!subjects.includes(subjectType) && !subjects.includes('*')) {
      return false
    }

    // 评估条件
    if (rule.conditions) {
      // 将主体添加到上下文
      const contextWithSubject = {
        ...context,
        subject: typeof subject === 'object' ? subject : { value: subject },
      }

      try {
        return this.conditionEvaluator.evaluate(rule.conditions, contextWithSubject)
      } catch (error) {
        console.error('Error evaluating condition:', error)
        return false
      }
    }

    return true
  }

  /**
   * 批量检查权限
   */
  checkMultiple(
    actions: Array<{ action: string; subject: any }>,
    context?: Context
  ): CheckResult[] {
    return actions.map(({ action, subject }) =>
      this.check(action, subject, context)
    )
  }

  /**
   * 检查任意一个权限
   */
  canAny(
    actions: Array<{ action: string; subject: any }>,
    context?: Context
  ): boolean {
    return actions.some(({ action, subject }) => this.can(action, subject, context))
  }

  /**
   * 检查所有权限
   */
  canAll(
    actions: Array<{ action: string; subject: any }>,
    context?: Context
  ): boolean {
    return actions.every(({ action, subject }) => this.can(action, subject, context))
  }

  // ==================== 字段级权限 ====================

  /**
   * 设置字段权限
   */
  setFieldPermission(permission: FieldPermission): void {
    const key = `${permission.subject}:${permission.action}`
    this.fieldPermissions.set(key, permission)
  }

  /**
   * 获取可访问的字段
   */
  getAccessibleFields(subject: string, action: string, context?: Context): string[] {
    const key = `${subject}:${action}`
    const permission = this.fieldPermissions.get(key)

    if (!permission) {
      return [] // 没有定义字段权限，返回空数组
    }

    let fields = permission.allowedFields || []

    // 移除禁止的字段
    if (permission.deniedFields) {
      fields = fields.filter(field => !permission.deniedFields!.includes(field))
    }

    // 评估字段条件
    if (permission.fieldConditions && context) {
      const fullContext = this.contextManager.buildContext(context)

      fields = fields.filter(field => {
        const condition = permission.fieldConditions![field]
        if (condition) {
          return this.conditionEvaluator.evaluate(condition, fullContext)
        }
        return true
      })
    }

    return fields
  }

  /**
   * 过滤对象字段
   */
  filterFields(obj: any, subject: string, action: string, context?: Context): any {
    const accessibleFields = this.getAccessibleFields(subject, action, context)

    if (accessibleFields.length === 0) {
      return obj // 没有字段限制，返回原对象
    }

    const filtered: any = {}

    for (const field of accessibleFields) {
      if (field in obj) {
        filtered[field] = obj[field]
      }
    }

    return filtered
  }

  // ==================== 工具方法 ====================

  /**
   * 获取条件求值器
   */
  getConditionEvaluator(): ConditionEvaluator {
    return this.conditionEvaluator
  }

  /**
   * 获取属性匹配器
   */
  getAttributeMatcher(): AttributeMatcher {
    return this.attributeMatcher
  }

  /**
   * 获取上下文管理器
   */
  getContextManager(): ContextManager {
    return this.contextManager
  }

  /**
   * 导出规则
   */
  export(): string {
    return JSON.stringify({
      rules: this.rules,
      fieldPermissions: Array.from(this.fieldPermissions.entries()),
      version: '1.0.0',
    })
  }

  /**
   * 导入规则
   */
  import(data: string): void {
    const parsed = JSON.parse(data)
    this.rules = parsed.rules || []
    this.fieldPermissions = new Map(parsed.fieldPermissions || [])
    this.sortRulesByPriority()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRules: this.rules.length,
      fieldPermissions: this.fieldPermissions.size,
      attributeCacheSize: this.attributeMatcher.getCacheStats().size,
    }
  }
}



