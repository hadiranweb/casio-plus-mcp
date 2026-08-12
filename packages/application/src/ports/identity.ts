export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: "active" | "suspended";
  createdAt: Date;
};
export type SessionRecord = {
  id: string;
  userId: string;
  tokenDigest: string;
  expiresAt: Date;
  revokedAt: Date | null;
};
export type WorkspaceRecord = {
  id: string;
  ownerId: string;
  name: string;
  visibility: "private" | "workspace" | "unlisted" | "public";
  status: "active" | "suspended" | "archived";
  createdAt: Date;
};
export type MembershipRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
};
export interface IdentityRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<void>;
  createSession(session: SessionRecord): Promise<void>;
  findSessionByDigest(digest: string): Promise<SessionRecord | null>;
  revokeSession(sessionId: string, now: Date): Promise<void>;
}
export interface WorkspaceRepository {
  findPersonalWorkspace(ownerId: string): Promise<WorkspaceRecord | null>;
  createWorkspace(workspace: WorkspaceRecord): Promise<void>;
  createMembership(membership: MembershipRecord): Promise<void>;
  findActiveMembership(
    workspaceId: string,
    userId: string,
  ): Promise<MembershipRecord | null>;
  listWorkspacesForUser(userId: string): Promise<WorkspaceRecord[]>;
}
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
export interface TokenGenerator {
  opaqueToken(): string;
  digest(token: string): string;
  id(): string;
}
