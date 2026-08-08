export const CASIO_ROLES = [
  'system_architect', 'method_designer', 'data_analyst', 'memory_steward',
  'automation_owner', 'coaching_documentarian', 'compliance_steward', 'process_coach', 'viewer',
] as const;
export type CasioRole = typeof CASIO_ROLES[number];
export type CasioPermission =
  | 'read:knowledge' | 'write:metric' | 'write:coaching' | 'review:feedback'
  | 'approve:proposal' | 'execute:automation' | 'manage:access';
