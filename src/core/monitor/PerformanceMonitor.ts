/**
 * @ldesign/permission - 性能监控器
 * 
 * 实时监控权限系统的性能指标
 */

import { throttle } from '../../shared/utils'

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 总检查次数 */
  totalChecks: number
  /** 成功次数 */
  successfulChecks: number
  /** 失败次数 */
  failedChecks: number
  /** 平均耗时（毫秒） */
  avgDuration: number
  /** 最小耗时 */
  minDuration: number
  /** 最大耗时 */
  maxDuration: number
  /** 缓存命中次数 */
  cacheHits: number
  /** 缓存未命中次数 */
  cacheMisses: number
  /** 缓存命中率（百分比） */
  cacheHitRate: number
  /** 慢查询次数（> 1ms） */
  slowQueries: number
  /** 最近 100 次检查的平均耗时 */
  recentAvgDuration: number
}

/**
 * 慢查询记录
 */
export interface SlowQuery {
  /** 查询时间 */
  timestamp: Date
  /** 用户ID */
  userId: string
  /** 资源 */
  resource: string
  /** 操作 */
  action: string
  /** 耗时（毫秒） */
  duration: number
  /** 是否来自缓存 */
  fromCache: boolean
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  /** 是否启用监控 */
  enabled?: boolean
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold?: number
  /** 保留的慢查询数量 */
  maxSlowQueries?: number
  /** 保留的最近检查数量 */
  maxRecentChecks?: number
}

/**
 * 性能监控器类
 * 
 * 功能：
 * - 实时收集性能指标
 * - 慢查询检测和记录
 * - 性能趋势分析
 * - 性能报告生成
 * 
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor()
 * 
 * // 记录权限检查
 * monitor.recordCheck('user123', 'posts', 'read', 0.3, true)
 * 
 * // 获取指标
 * const metrics = monitor.getMetrics()
 * console.log('平均耗时:', metrics.avgDuration)
 * console.log('缓存命中率:', metrics.cacheHitRate)
 * 
 * // 获取慢查询
 * const slowQueries = monitor.getSlowQueries()
 * console.log('慢查询数量:', slowQueries.length)
 * ```
 */
export class PerformanceMonitor {
  /** 总检查次数 */
  private totalChecks = 0

  /** 成功次数 */
  private successfulChecks = 0

  /** 失败次数 */
  private failedChecks = 0

  /** 耗时总和 */
  private totalDuration = 0

  /** 最小耗时 */
  private minDuration = Number.POSITIVE_INFINITY

  /** 最大耗时 */
  private maxDuration = 0

  /** 缓存命中次数 */
  private cacheHits = 0

  /** 缓存未命中次数 */
  private cacheMisses = 0

  /** 慢查询列表 */
  private slowQueries: SlowQuery[] = []

  /** 最近的检查耗时 */
  private recentChecks: number[] = []

  /** 配置 */
  private config: Required<MonitorConfig>

  /**
   * 创建性能监控器实例
   * 
   * @param config - 监控配置
   */
  constructor(config: MonitorConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      slowQueryThreshold: config.slowQueryThreshold ?? 1.0, // 默认 1ms
      maxSlowQueries: config.maxSlowQueries ?? 100,
      maxRecentChecks: config.maxRecentChecks ?? 100,
    }
  }

  /**
   * 记录权限检查
   * 
   * @param userId - 用户ID
   * @param resource - 资源
   * @param action - 操作
   * @param duration - 耗时（毫秒）
   * @param allowed - 是否允许
   * @param fromCache - 是否来自缓存
   */
  recordCheck(
    userId: string,
    resource: string,
    action: string,
    duration: number,
    allowed: boolean,
    fromCache: boolean = false
  ): void {
    if (!this.config.enabled) {
      return
    }

    this.totalChecks++

    if (allowed) {
      this.successfulChecks++
    } else {
      this.failedChecks++
    }

    this.totalDuration += duration
    this.minDuration = Math.min(this.minDuration, duration)
    this.maxDuration = Math.max(this.maxDuration, duration)

    if (fromCache) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }

    // 记录最近的检查
    this.recentChecks.push(duration)
    if (this.recentChecks.length > this.config.maxRecentChecks) {
      this.recentChecks.shift()
    }

    // 检测慢查询
    if (duration > this.config.slowQueryThreshold) {
      const slowQuery: SlowQuery = {
        timestamp: new Date(),
        userId,
        resource,
        action,
        duration,
        fromCache,
      }

      this.slowQueries.push(slowQuery)

      // 限制慢查询列表大小
      if (this.slowQueries.length > this.config.maxSlowQueries) {
        this.slowQueries.shift()
      }

      // 输出警告（节流）
      this.warnSlowQuery(slowQuery)
    }
  }

  /**
   * 获取性能指标
   * 
   * @returns 性能指标对象
   */
  getMetrics(): PerformanceMetrics {
    const avgDuration = this.totalChecks > 0
      ? this.totalDuration / this.totalChecks
      : 0

    const totalCacheOps = this.cacheHits + this.cacheMisses
    const cacheHitRate = totalCacheOps > 0
      ? (this.cacheHits / totalCacheOps) * 100
      : 0

    const recentAvgDuration = this.recentChecks.length > 0
      ? this.recentChecks.reduce((a, b) => a + b, 0) / this.recentChecks.length
      : 0

    return {
      totalChecks: this.totalChecks,
      successfulChecks: this.successfulChecks,
      failedChecks: this.failedChecks,
      avgDuration: Math.round(avgDuration * 10000) / 10000,
      minDuration: this.minDuration === Number.POSITIVE_INFINITY ? 0 : this.minDuration,
      maxDuration: this.maxDuration,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueries: this.slowQueries.length,
      recentAvgDuration: Math.round(recentAvgDuration * 10000) / 10000,
    }
  }

  /**
   * 获取慢查询列表
   * 
   * @param limit - 返回数量限制
   * @returns 慢查询列表
   */
  getSlowQueries(limit?: number): SlowQuery[] {
    if (limit) {
      return this.slowQueries.slice(-limit)
    }
    return [...this.slowQueries]
  }

  /**
   * 获取最慢的查询
   * 
   * @param count - 返回数量
   * @returns 最慢的查询列表
   */
  getSlowestQueries(count: number = 10): SlowQuery[] {
    return [...this.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
  }

  /**
   * 清除慢查询记录
   */
  clearSlowQueries(): void {
    this.slowQueries = []
  }

  /**
   * 重置所有统计
   */
  reset(): void {
    this.totalChecks = 0
    this.successfulChecks = 0
    this.failedChecks = 0
    this.totalDuration = 0
    this.minDuration = Number.POSITIVE_INFINITY
    this.maxDuration = 0
    this.cacheHits = 0
    this.cacheMisses = 0
    this.slowQueries = []
    this.recentChecks = []
  }

  /**
   * 生成性能报告
   * 
   * @returns 性能报告文本
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const slowest = this.getSlowestQueries(5)

    let report = '# 性能监控报告\n\n'
    report += `生成时间: ${new Date().toISOString()}\n\n`

    report += '## 总体指标\n\n'
    report += `- 总检查次数: ${metrics.totalChecks}\n`
    report += `- 成功次数: ${metrics.successfulChecks}\n`
    report += `- 失败次数: ${metrics.failedChecks}\n`
    report += `- 成功率: ${((metrics.successfulChecks / metrics.totalChecks) * 100).toFixed(2)}%\n\n`

    report += '## 性能指标\n\n'
    report += `- 平均耗时: ${metrics.avgDuration.toFixed(4)}ms\n`
    report += `- 最小耗时: ${metrics.minDuration.toFixed(4)}ms\n`
    report += `- 最大耗时: ${metrics.maxDuration.toFixed(4)}ms\n`
    report += `- 最近 100 次平均: ${metrics.recentAvgDuration.toFixed(4)}ms\n\n`

    report += '## 缓存指标\n\n'
    report += `- 缓存命中次数: ${metrics.cacheHits}\n`
    report += `- 缓存未命中次数: ${metrics.cacheMisses}\n`
    report += `- 缓存命中率: ${metrics.cacheHitRate.toFixed(2)}%\n\n`

    report += '## 慢查询\n\n'
    report += `- 慢查询总数: ${metrics.slowQueries}\n`
    report += `- 慢查询阈值: ${this.config.slowQueryThreshold}ms\n\n`

    if (slowest.length > 0) {
      report += '### 最慢的 5 个查询\n\n'
      slowest.forEach((query, index) => {
        report += `${index + 1}. ${query.userId} → ${query.resource}:${query.action}\n`
        report += `   耗时: ${query.duration.toFixed(4)}ms\n`
        report += `   时间: ${query.timestamp.toISOString()}\n\n`
      })
    }

    return report
  }

  /**
   * 导出性能数据
   * 
   * @returns JSON 格式的性能数据
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      slowQueries: this.slowQueries,
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * 检查性能是否健康
   * 
   * @returns 是否健康及原因
   */
  checkHealth(): { healthy: boolean; issues: string[] } {
    const metrics = this.getMetrics()
    const issues: string[] = []

    // 检查平均耗时
    if (metrics.avgDuration > 0.5) {
      issues.push(`平均耗时过高: ${metrics.avgDuration.toFixed(4)}ms (目标 < 0.5ms)`)
    }

    // 检查缓存命中率
    if (metrics.cacheHitRate < 70 && this.cacheHits + this.cacheMisses > 100) {
      issues.push(`缓存命中率过低: ${metrics.cacheHitRate.toFixed(2)}% (目标 > 70%)`)
    }

    // 检查慢查询比例
    const slowQueryRate = (metrics.slowQueries / metrics.totalChecks) * 100
    if (slowQueryRate > 5 && metrics.totalChecks > 100) {
      issues.push(`慢查询比例过高: ${slowQueryRate.toFixed(2)}% (目标 < 5%)`)
    }

    // 检查最大耗时
    if (metrics.maxDuration > 10) {
      issues.push(`最大耗时过高: ${metrics.maxDuration.toFixed(4)}ms (目标 < 10ms)`)
    }

    return {
      healthy: issues.length === 0,
      issues,
    }
  }

  /**
   * 获取性能趋势
   * 
   * 分析最近的性能数据，判断性能是否在下降
   * 
   * @returns 性能趋势分析
   */
  getPerformanceTrend(): {
    trend: 'improving' | 'stable' | 'degrading'
    changeRate: number
    recommendation: string
  } {
    if (this.recentChecks.length < 50) {
      return {
        trend: 'stable',
        changeRate: 0,
        recommendation: '数据不足，无法分析趋势',
      }
    }

    // 比较前半段和后半段的平均耗时
    const mid = Math.floor(this.recentChecks.length / 2)
    const firstHalf = this.recentChecks.slice(0, mid)
    const secondHalf = this.recentChecks.slice(mid)

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const changeRate = ((avgSecond - avgFirst) / avgFirst) * 100

    let trend: 'improving' | 'stable' | 'degrading'
    let recommendation: string

    if (changeRate < -10) {
      trend = 'improving'
      recommendation = '性能正在改善，继续保持'
    } else if (changeRate > 10) {
      trend = 'degrading'
      recommendation = '性能正在下降，建议检查缓存配置或清理过期数据'
    } else {
      trend = 'stable'
      recommendation = '性能稳定'
    }

    return {
      trend,
      changeRate: Math.round(changeRate * 100) / 100,
      recommendation,
    }
  }

  /**
   * 启用监控
   */
  enable(): void {
    this.config.enabled = true
  }

  /**
   * 禁用监控
   */
  disable(): void {
    this.config.enabled = false
  }

  /**
   * 检查是否启用
   * 
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  // ==================== 私有方法 ====================

  /**
   * 慢查询警告（带节流）
   */
  private warnSlowQuery = throttle((query: SlowQuery) => {
    console.warn(
      `⚠️ 慢查询检测: ${query.userId} → ${query.resource}:${query.action} ` +
      `耗时 ${query.duration.toFixed(4)}ms (阈值 ${this.config.slowQueryThreshold}ms)`
    )
  }, 5000) // 5 秒内最多警告一次
}

