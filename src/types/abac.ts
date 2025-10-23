/**
 * @ldesign/permission - ABAC 类型定义
 * 
 * 基于属性的访问控制（Attribute-Based Access Control）类型
 */

/**
 * 比较运算符
 */
export enum ComparisonOperator {
  /** 等于 */
  EQ = 'eq',
  /** 不等于 */
  NE = 'ne',
  /** 大于 */
  GT = 'gt',
  /** 大于等于 */
  GTE = 'gte',
  /** 小于 */
  LT = 'lt',
  /** 小于等于 */
  LTE = 'lte',
  /** 包含（数组） */
  IN = 'in',
  /** 不包含（数组） */
  NOT_IN = 'not_in',
  /** 包含（字符串/数组） */
  CONTAINS = 'contains',
  /** 不包含（字符串/数组） */
  NOT_CONTAINS = 'not_contains',
  /** 以...开始 */
  STARTS_WITH = 'starts_with',
  /** 以...结束 */
  ENDS_WITH = 'ends_with',
  /** 正则匹配 */
  MATCHES = 'matches',
  /** 存在 */
  EXISTS = 'exists',
}

/**
 * 逻辑运算符
 */
export enum LogicalOperator {
  /** 与 */
  AND = 'and',
  /** 或 */
  OR = 'or',
  /** 非 */
  NOT = 'not',
}

/**
 * 条件表达式
 */
export interface Condition {
  /** 字段路径（支持嵌套：user.profile.age） */
  field: string
  /** 运算符 */
  operator: ComparisonOperator
  /** 比较值 */
  value: any
  /** 条件描述 */
  description?: string
}

/**
 * 复合条件（逻辑运算）
 */
export interface CompositeCondition {
  /** 逻辑运算符 */
  operator: LogicalOperator
  /** 子条件列表 */
  conditions: (Condition | CompositeCondition)[]
}

/**
 * 属性定义
 */
export interface Attribute {
  /** 属性名称 */
  name: string
  /** 属性值 */
  value: any
  /** 属性类型 */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  /** 是否动态属性（运行时计算） */
  dynamic?: boolean
  /** 动态属性计算函数 */
  compute?: (context: Context) => any
}

/**
 * 上下文信息
 */
export interface Context {
  /** 用户信息 */
  user?: {
    id: string
    username?: string
    roles?: string[]
    attributes?: Record<string, any>
    [key: string]: any
  }
  /** 资源信息 */
  resource?: {
    type: string
    id?: string
    attributes?: Record<string, any>
    [key: string]: any
  }
  /** 环境信息 */
  environment?: {
    /** 当前时间 */
    time?: Date
    /** IP地址 */
    ip?: string
    /** 地理位置 */
    location?: string
    /** 设备信息 */
    device?: string
    /** 运行环境 */
    env?: 'development' | 'test' | 'production'
    [key: string]: any
  }
  /** 操作信息 */
  action?: {
    type: string
    [key: string]: any
  }
  /** 自定义属性 */
  [key: string]: any
}

/**
 * ABAC 规则
 */
export interface AbilityRule {
  /** 规则ID */
  id?: string
  /** 操作 */
  action: string | string[]
  /** 主体（资源类型） */
  subject: string | string[]
  /** 条件表达式 */
  conditions?: Condition | CompositeCondition
  /** 字段限制 */
  fields?: string[]
  /** 是否反向（禁止） */
  inverted?: boolean
  /** 原因/描述 */
  reason?: string
  /** 优先级（数字越大优先级越高） */
  priority?: number
}

/**
 * 能力定义（Ability）
 */
export interface Ability {
  /** 规则列表 */
  rules: AbilityRule[]
  /** 是否检测到规则 */
  can(action: string, subject: any, context?: Context): boolean
  /** 是否不能（反向检查） */
  cannot(action: string, subject: any, context?: Context): boolean
}

/**
 * ABAC 引擎配置
 */
export interface ABACConfig {
  /** 是否启用条件缓存 */
  enableConditionCache?: boolean
  /** 是否启用属性计算缓存 */
  enableAttributeCache?: boolean
  /** 是否严格模式（所有条件必须匹配） */
  strict?: boolean
  /** 最大条件嵌套深度 */
  maxConditionDepth?: number
}

/**
 * 字段级权限
 */
export interface FieldPermission {
  /** 资源类型 */
  subject: string
  /** 操作 */
  action: string
  /** 允许的字段 */
  allowedFields?: string[]
  /** 禁止的字段 */
  deniedFields?: string[]
  /** 字段条件 */
  fieldConditions?: Record<string, Condition>
}

/**
 * 属性匹配器配置
 */
export interface AttributeMatcherConfig {
  /** 是否忽略大小写 */
  ignoreCase?: boolean
  /** 是否允许部分匹配 */
  partialMatch?: boolean
  /** 自定义匹配函数 */
  customMatchers?: Record<string, (value: any, pattern: any) => boolean>
}



