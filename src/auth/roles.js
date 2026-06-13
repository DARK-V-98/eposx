// ============================================================
// Role assignment for E POS X.
//
// Roles, highest privilege first:
//   Developer > Admin > Manager > Cashier > User
//
// Edit ROLE_MAP to grant specific Google accounts a role.
// Any email not listed gets DEFAULT_ROLE.
// ============================================================

export const ROLES = ['Developer', 'Admin', 'Manager', 'Cashier', 'User'];

// Default role for any signed-in account that isn't in ROLE_MAP.
export const DEFAULT_ROLE = 'Cashier';

// email (lowercase) -> role
export const ROLE_MAP = {
  // esystemlk developer account — full Developer access by default.
  'esystemlk@gmail.com': 'Developer',
  // existing system owner
  'tikfese@gmail.com': 'Admin',
};

// Platform admins — these accounts manage licensing/access for ALL stores
// (approve requests, grant trials/lifetime, lock accounts).
export const PLATFORM_ADMINS = ['esystemlk@gmail.com'];

export function isPlatformAdmin(email) {
  if (!email) return false;
  return PLATFORM_ADMINS.includes(email.trim().toLowerCase());
}

export function resolveRole(email) {
  if (!email) return DEFAULT_ROLE;
  return ROLE_MAP[email.trim().toLowerCase()] || DEFAULT_ROLE;
}

// Simple privilege ranking helper (higher number = more access).
export function roleRank(role) {
  const idx = ROLES.indexOf(role);
  return idx === -1 ? 0 : ROLES.length - idx;
}

export function hasAtLeast(role, minRole) {
  return roleRank(role) >= roleRank(minRole);
}
