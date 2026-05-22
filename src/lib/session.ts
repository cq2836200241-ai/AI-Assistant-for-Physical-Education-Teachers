/**
 * 会话与锁定管理工具函数
 * 
 * 提供锁定/解锁、登录/退出、用户管理等功能的统一实现，
 * AuthWrapper 和 UserMenu 共享此模块以避免重复代码。
 */

export const USER_KEY = 'currentUser';
export const LOCKED_KEY = 'isLocked';

let currentUserMemory: string | null = null;
let lockedMemory = false;

/** 获取当前登录用户 */
export function getCurrentUser(): string | null {
  return currentUserMemory;
}

/** 设置当前登录用户 */
export async function setCurrentUser(username: string): Promise<void> {
  currentUserMemory = username;
  lockedMemory = false;
  await window.desktopSession?.set({ currentUser: username, locked: false });
}

/** 移除当前登录用户（登出） */
export async function removeCurrentUser(): Promise<void> {
  currentUserMemory = null;
  lockedMemory = false;
  await window.desktopSession?.clear();
}

/** 检查账号是否锁定 */
export function isLocked(): boolean {
  return lockedMemory;
}

/** 锁定账号 */
export async function lockAccount(): Promise<void> {
  lockedMemory = true;
  await window.desktopSession?.set({ currentUser: currentUserMemory, locked: true });
}

/** 解锁账号 */
export async function unlockAccount(): Promise<void> {
  lockedMemory = false;
  await window.desktopSession?.set({ currentUser: currentUserMemory, locked: false });
}

export async function initializeSession(): Promise<{ currentUser: string | null; locked: boolean }> {
  const session = await window.desktopSession?.get();
  currentUserMemory = session?.currentUser ?? null;
  lockedMemory = Boolean(session?.locked);
  return { currentUser: currentUserMemory, locked: lockedMemory };
}

/** 获取所有已注册的用户 */
export async function getUsers(): Promise<string[]> {
  return window.desktopAuth?.listUsers() ?? [];
}

/** 验证用户密码 */
export async function verifyPassword(username: string, password: string): Promise<boolean> {
  const result = await window.desktopAuth?.login({ username, password });
  return Boolean(result?.ok);
}

/** 登出：清空会话并刷新页面 */
export async function logout(): Promise<void> {
  await removeCurrentUser();
  window.location.reload();
}
