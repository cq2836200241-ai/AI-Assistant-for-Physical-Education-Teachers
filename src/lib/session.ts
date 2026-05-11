/**
 * 会话与锁定管理工具函数
 * 
 * 提供锁定/解锁、登录/退出、用户管理等功能的统一实现，
 * AuthWrapper 和 UserMenu 共享此模块以避免重复代码。
 */

export const USER_KEY = 'currentUser';
export const LOCKED_KEY = 'isLocked';
export const USERS_STORAGE_KEY = 'localUsers';

/** 获取当前登录用户 */
export function getCurrentUser(): string | null {
  return sessionStorage.getItem(USER_KEY);
}

/** 设置当前登录用户 */
export function setCurrentUser(username: string): void {
  sessionStorage.setItem(USER_KEY, username);
}

/** 移除当前登录用户（登出） */
export function removeCurrentUser(): void {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(LOCKED_KEY);
}

/** 检查账号是否锁定 */
export function isLocked(): boolean {
  return sessionStorage.getItem(LOCKED_KEY) === 'true';
}

/** 锁定账号 */
export function lockAccount(): void {
  sessionStorage.setItem(LOCKED_KEY, 'true');
}

/** 解锁账号 */
export function unlockAccount(): void {
  sessionStorage.removeItem(LOCKED_KEY);
}

/** 获取所有已注册的用户 */
export function getUsers(): Record<string, { password: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/** 验证用户密码 */
export function verifyPassword(username: string, password: string): boolean {
  const users = getUsers();
  return users[username]?.password === password;
}

/** 登出：清空会话并刷新页面 */
export function logout(): void {
  removeCurrentUser();
  window.location.reload();
}
