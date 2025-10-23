/**
 * @ldesign/permission - 策略类型定义
 * 
 * 策略引擎相关类型
 */

import type { Condition, CompositeCondition, Context } from './abac'

/**
 * 策略效果
 */
export enum Effect {
  /** 允许 */
  ALLOW = 'allow',
  /** 拒绝 */
  DENY = 'deny',
}

/**
 * 冲突解决策略
 */
export enum ConflictResolution {
  /** 拒绝优先（有一个拒绝就拒绝） */
  DENY_OVERRIDE = 'deny-override',
  /** 允许优先（有一个允许就允许） */
  ALLOW_OVERRIDE = 'allow-override',
  /** 第一个匹配（按顺序第一个匹配的生效） */
  FIRST_APPLICABLE = 'first-applicable',
  /** 只允许一个匹配（多个匹配则报错） */
  ONLY_ONE_APPLICABLE = 'only-one-applicable',
}

/**
 * 策略规则
 */
export interface PolicyRule {
  /** 规则ID */
  id: string
  /** 规则名称 */
  name?: string
  /** 规则描述 */
  description?: string
  /** 效果（允许/拒绝） */
  effect: Effect
  /** 主体（角色、用户、组） */
  subjects?: string[]
  /** 资源 */
  resources?: string[]
  /** 操作 */
  actions?: string[]
  /** 条件 */
  conditions?: Condition | CompositeCondition
  /** 优先级 */
  priority?: number
  /** 是否启用 */
  enabled?: boolean
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 策略
 */
export interface Policy {
  /** 策略ID */
  id: string
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description?: string
  /** 策略版本 */
  version?: string
  /** 规则列表 */
  rules: PolicyRule[]
  /** 冲突解决策略 */
  conflictResolution?: ConflictResolution
  /** 是否启用 */
  enabled?: boolean
  /** 创建时间 */
  createdAt?: Date
  /** 更新时间 */
  updatedAt?: Date
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 策略评估请求
 */
export interface PolicyEvaluationRequest {
  /** 主体（用户） */
  subject: string
  /** 资源 */
  resource: string
  /** 操作 */
  action: string
  /** 上下文 */
  context?: Context
}

/**
 * 策略评估结果
 */
export interface PolicyEvaluationResult {
  /** 是否允许 */
  allowed: boolean
  /** 效果 */
  effect: Effect
  /** 匹配的规则 */
  matchedRules: PolicyRule[]
  /** 评估耗时（毫秒） */
  duration?: number
  /** 原因 */
  reason?: string
  /** 详细信息 */
  details?: {
    /** 评估的策略列表 */
    evaluatedPolicies: string[]
    /** 匹配的策略 */
    matchedPolicies: string[]
    /** 冲突的规则 */
    conflictingRules?: PolicyRule[]
  }
}

/**
 * 规则构建器接口
 */
export interface RuleBuilder {
  /** 设置规则ID */
  id(id: string): RuleBuilder
  /** 设置规则名称 */
  name(name: string): RuleBuilder
  /** 设置效果 */
  effect(effect: Effect): RuleBuilder
  /** 允许 */
  allow(): RuleBuilder
  /** 拒绝 */
  deny(): RuleBuilder
  /** 设置主体 */
  subjects(...subjects: string[]): RuleBuilder
  /** 设置资源 */
  resources(...resources: string[]): RuleBuilder
  /** 设置操作 */
  actions(...actions: string[]): RuleBuilder
  /** 添加条件 */
  when(condition: Condition | CompositeCondition): RuleBuilder
  /** 设置优先级 */
  priority(priority: number): RuleBuilder
  /** 构建规则 */
  build(): PolicyRule
}

/**
 * 策略存储接口
 */
export interface PolicyStore {
  /** 添加策略 */
  add(policy: Policy): Promise<void> | void
  /** 获取策略 */
  get(id: string): Promise<Policy | null> | Policy | null
  /** 获取所有策略 */
  getAll(): Promise<Policy[]> | Policy[]
  /** 更新策略 */
  update(id: string, policy: Partial<Policy>): Promise<void> | void
  /** 删除策略 */
  remove(id: string): Promise<void> | void
  /** 清空策略 */
  clear(): Promise<void> | void
}

/**
 * 策略引擎配置
 */
export interface PolicyEngineConfig {
  /** 默认冲突解决策略 */
  defaultConflictResolution?: ConflictResolution
  /** 是否启用策略缓存 */
  enableCache?: boolean
  /** 是否严格模式 */
  strict?: boolean
  /** 最大规则评估数 */
  maxRuleEvaluations?: number
}

/**
 * 策略验证结果
 */
export interface PolicyValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息 */
  errors?: string[]
  /** 警告信息 */
  warnings?: string[]
}



