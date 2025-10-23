/**
 * @ldesign/permission - 权限事件定义
 * 
 * 定义所有权限相关事件及其数据结构
 */

/**
 * 权限事件类型
 */
export enum PermissionEventType {
  /** 权限已授予 */
  PERMISSION_GRANTED = 'permission:granted',
  /** 权限已撤销 */
  PERMISSION_REVOKED = 'permission:revoked',
  /** 角色已分配 */
  ROLE_ASSIGNED = 'role:assigned',
  /** 角色已移除 */
  ROLE_REMOVED = 'role:removed',
  /** 角色已创建 */
  ROLE_CREATED = 'role:created',
  /** 角色已更新 */
  ROLE_UPDATED = 'role:updated',
  /** 角色已删除 */
  ROLE_DELETED = 'role:deleted',
  /** 能力规则已添加 */
  ABILITY_ADDED = 'ability:added',
  /** 能力规则已移除 */
  ABILITY_REMOVED = 'ability:removed',
  /** 策略已添加 */
  POLICY_ADDED = 'policy:added',
  /** 策略已更新 */
  POLICY_UPDATED = 'policy:updated',
  /** 策略已删除 */
  POLICY_DELETED = 'policy:deleted',
  /** 权限检查执行 */
  PERMISSION_CHECKED = 'permission:checked',
}

/**
 * 权限授予事件数据
 */
export interface PermissionGrantedEvent {
  roleName: string
  resource: string
  action: string
  timestamp: Date
  grantedBy?: string
}

/**
 * 权限撤销事件数据
 */
export interface PermissionRevokedEvent {
  roleName: string
  resource: string
  action: string
  timestamp: Date
  revokedBy?: string
}

/**
 * 角色分配事件数据
 */
export interface RoleAssignedEvent {
  userId: string
  roleName: string
  timestamp: Date
  assignedBy?: string
}

/**
 * 角色移除事件数据
 */
export interface RoleRemovedEvent {
  userId: string
  roleName: string
  timestamp: Date
  removedBy?: string
}

/**
 * 角色创建事件数据
 */
export interface RoleCreatedEvent {
  roleName: string
  displayName?: string
  description?: string
  timestamp: Date
  createdBy?: string
}

/**
 * 角色更新事件数据
 */
export interface RoleUpdatedEvent {
  roleName: string
  changes: Record<string, any>
  timestamp: Date
  updatedBy?: string
}

/**
 * 角色删除事件数据
 */
export interface RoleDeletedEvent {
  roleName: string
  timestamp: Date
  deletedBy?: string
}

/**
 * 能力规则添加事件数据
 */
export interface AbilityAddedEvent {
  ruleId: string
  action: string | string[]
  subject: string | string[]
  timestamp: Date
  addedBy?: string
}

/**
 * 能力规则移除事件数据
 */
export interface AbilityRemovedEvent {
  ruleId: string
  timestamp: Date
  removedBy?: string
}

/**
 * 策略添加事件数据
 */
export interface PolicyAddedEvent {
  policyId: string
  policyName: string
  timestamp: Date
  addedBy?: string
}

/**
 * 策略更新事件数据
 */
export interface PolicyUpdatedEvent {
  policyId: string
  changes: Record<string, any>
  timestamp: Date
  updatedBy?: string
}

/**
 * 策略删除事件数据
 */
export interface PolicyDeletedEvent {
  policyId: string
  timestamp: Date
  deletedBy?: string
}

/**
 * 权限检查事件数据
 */
export interface PermissionCheckedEvent {
  userId: string
  resource: string
  action: string
  allowed: boolean
  duration: number
  timestamp: Date
  context?: any
}

/**
 * 权限事件数据类型映射
 */
export interface PermissionEventMap {
  [PermissionEventType.PERMISSION_GRANTED]: PermissionGrantedEvent
  [PermissionEventType.PERMISSION_REVOKED]: PermissionRevokedEvent
  [PermissionEventType.ROLE_ASSIGNED]: RoleAssignedEvent
  [PermissionEventType.ROLE_REMOVED]: RoleRemovedEvent
  [PermissionEventType.ROLE_CREATED]: RoleCreatedEvent
  [PermissionEventType.ROLE_UPDATED]: RoleUpdatedEvent
  [PermissionEventType.ROLE_DELETED]: RoleDeletedEvent
  [PermissionEventType.ABILITY_ADDED]: AbilityAddedEvent
  [PermissionEventType.ABILITY_REMOVED]: AbilityRemovedEvent
  [PermissionEventType.POLICY_ADDED]: PolicyAddedEvent
  [PermissionEventType.POLICY_UPDATED]: PolicyUpdatedEvent
  [PermissionEventType.POLICY_DELETED]: PolicyDeletedEvent
  [PermissionEventType.PERMISSION_CHECKED]: PermissionCheckedEvent
}



