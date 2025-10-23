/**
 * @ldesign/permission - 策略存储
 * 
 * 负责策略的存储和管理
 */

import type { Policy, PolicyStore as IPolicyStore, PolicyValidationResult } from '../../types'

/**
 * 策略存储类
 */
export class PolicyStore implements IPolicyStore {
  /** 策略集合 */
  private policies: Map<string, Policy> = new Map()

  /** 策略索引（按名称） */
  private policyIndex: Map<string, string> = new Map()

  /**
   * 添加策略
   */
  add(policy: Policy): void {
    // 验证策略
    const validation = this.validate(policy)
    if (!validation.valid) {
      throw new Error(`Invalid policy: ${validation.errors?.join(', ')}`)
    }

    // 检查ID冲突
    if (this.policies.has(policy.id)) {
      throw new Error(`Policy with ID "${policy.id}" already exists`)
    }

    // 检查名称冲突
    if (this.policyIndex.has(policy.name)) {
      throw new Error(`Policy with name "${policy.name}" already exists`)
    }

    // 添加策略
    this.policies.set(policy.id, {
      ...policy,
      createdAt: policy.createdAt || new Date(),
      updatedAt: new Date(),
    })

    // 更新索引
    this.policyIndex.set(policy.name, policy.id)
  }

  /**
   * 获取策略
   */
  get(id: string): Policy | null {
    return this.policies.get(id) || null
  }

  /**
   * 根据名称获取策略
   */
  getByName(name: string): Policy | null {
    const id = this.policyIndex.get(name)
    return id ? this.get(id) : null
  }

  /**
   * 获取所有策略
   */
  getAll(): Policy[] {
    return Array.from(this.policies.values())
  }

  /**
   * 获取启用的策略
   */
  getEnabled(): Policy[] {
    return this.getAll().filter(policy => policy.enabled !== false)
  }

  /**
   * 更新策略
   */
  update(id: string, updates: Partial<Policy>): void {
    const policy = this.policies.get(id)
    if (!policy) {
      throw new Error(`Policy with ID "${id}" not found`)
    }

    // 更新索引（如果名称改变）
    if (updates.name && updates.name !== policy.name) {
      this.policyIndex.delete(policy.name)
      this.policyIndex.set(updates.name, id)
    }

    // 更新策略
    this.policies.set(id, {
      ...policy,
      ...updates,
      id, // 保持ID不变
      updatedAt: new Date(),
    })
  }

  /**
   * 删除策略
   */
  remove(id: string): void {
    const policy = this.policies.get(id)
    if (policy) {
      this.policies.delete(id)
      this.policyIndex.delete(policy.name)
    }
  }

  /**
   * 清空所有策略
   */
  clear(): void {
    this.policies.clear()
    this.policyIndex.clear()
  }

  /**
   * 策略是否存在
   */
  has(id: string): boolean {
    return this.policies.has(id)
  }

  /**
   * 根据名称检查策略是否存在
   */
  hasByName(name: string): boolean {
    return this.policyIndex.has(name)
  }

  /**
   * 验证策略
   */
  validate(policy: Policy): PolicyValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 验证必填字段
    if (!policy.id) {
      errors.push('Policy ID is required')
    }

    if (!policy.name) {
      errors.push('Policy name is required')
    }

    if (!policy.rules || policy.rules.length === 0) {
      errors.push('Policy must have at least one rule')
    }

    // 验证规则
    if (policy.rules) {
      policy.rules.forEach((rule, index) => {
        if (!rule.id) {
          warnings.push(`Rule at index ${index} is missing an ID`)
        }

        if (!rule.effect) {
          errors.push(`Rule at index ${index} is missing an effect`)
        }

        if (!rule.resources && !rule.actions && !rule.subjects) {
          warnings.push(`Rule at index ${index} has no targets (resources, actions, or subjects)`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * 查找匹配的策略
   */
  findBySubject(subject: string): Policy[] {
    return this.getEnabled().filter(policy =>
      policy.rules.some(rule =>
        rule.subjects?.includes(subject) || rule.subjects?.includes('*')
      )
    )
  }

  /**
   * 查找匹配的策略（按资源）
   */
  findByResource(resource: string): Policy[] {
    return this.getEnabled().filter(policy =>
      policy.rules.some(rule =>
        rule.resources?.includes(resource) || rule.resources?.includes('*')
      )
    )
  }

  /**
   * 查找匹配的策略（按操作）
   */
  findByAction(action: string): Policy[] {
    return this.getEnabled().filter(policy =>
      policy.rules.some(rule =>
        rule.actions?.includes(action) || rule.actions?.includes('*')
      )
    )
  }

  /**
   * 导出策略
   */
  export(): string {
    return JSON.stringify({
      policies: Array.from(this.policies.entries()),
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 导入策略
   */
  import(data: string): void {
    const parsed = JSON.parse(data)

    this.policies.clear()
    this.policyIndex.clear()

    for (const [id, policy] of parsed.policies) {
      this.policies.set(id, policy)
      this.policyIndex.set(policy.name, id)
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const allPolicies = this.getAll()
    const enabledPolicies = this.getEnabled()

    const totalRules = allPolicies.reduce((sum, policy) => sum + policy.rules.length, 0)

    return {
      totalPolicies: allPolicies.length,
      enabledPolicies: enabledPolicies.length,
      disabledPolicies: allPolicies.length - enabledPolicies.length,
      totalRules,
    }
  }
}



