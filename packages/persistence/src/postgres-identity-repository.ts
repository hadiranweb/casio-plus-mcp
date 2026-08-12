import type {
  IdentityRepository,
  MembershipRecord,
  SessionRecord,
  UserRecord,
  WorkspaceRecord,
  WorkspaceRepository,
} from "@element-plus/application";
import type { Pool } from "pg";
const user = (r: Record<string, unknown>): UserRecord => ({
  id: String(r.id),
  email: String(r.email),
  displayName: String(r.display_name),
  passwordHash: String(r.password_hash),
  status: r.status as UserRecord["status"],
  createdAt: new Date(String(r.created_at)),
});
const workspace = (r: Record<string, unknown>): WorkspaceRecord => ({
  id: String(r.id),
  ownerId: String(r.owner_id),
  name: String(r.name),
  visibility: r.visibility as WorkspaceRecord["visibility"],
  status: r.status as WorkspaceRecord["status"],
  createdAt: new Date(String(r.created_at)),
});
export class PostgresIdentityRepository
  implements IdentityRepository, WorkspaceRepository
{
  constructor(private readonly pool: Pool) {}
  async findUserByEmail(email: string) {
    const q = await this.pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    return q.rows[0] ? user(q.rows[0]) : null;
  }
  async createUser(v: UserRecord) {
    await this.pool.query(
      "INSERT INTO users (id,email,display_name,password_hash,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6)",
      [v.id, v.email, v.displayName, v.passwordHash, v.status, v.createdAt],
    );
  }
  async createSession(v: SessionRecord) {
    await this.pool.query(
      "INSERT INTO sessions (id,user_id,token_digest,expires_at,revoked_at,created_at) VALUES ($1,$2,$3,$4,$5,NOW())",
      [v.id, v.userId, v.tokenDigest, v.expiresAt, v.revokedAt],
    );
  }
  async findSessionByDigest(digest: string) {
    const q = await this.pool.query(
      "SELECT id,user_id,token_digest,expires_at,revoked_at FROM sessions WHERE token_digest=$1",
      [digest],
    );
    const r = q.rows[0];
    return r
      ? {
          id: r.id,
          userId: r.user_id,
          tokenDigest: r.token_digest,
          expiresAt: new Date(r.expires_at),
          revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
        }
      : null;
  }
  async revokeSession(id: string, now: Date) {
    await this.pool.query("UPDATE sessions SET revoked_at=$2 WHERE id=$1", [
      id,
      now,
    ]);
  }
  async findPersonalWorkspace(ownerId: string) {
    const q = await this.pool.query(
      "SELECT * FROM workspaces WHERE owner_id=$1 AND visibility='private' ORDER BY created_at LIMIT 1",
      [ownerId],
    );
    return q.rows[0] ? workspace(q.rows[0]) : null;
  }
  async createWorkspace(v: WorkspaceRecord) {
    await this.pool.query(
      "INSERT INTO workspaces (id,owner_id,name,visibility,status,created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [v.id, v.ownerId, v.name, v.visibility, v.status, v.createdAt],
    );
  }
  async createMembership(v: MembershipRecord) {
    await this.pool.query(
      "INSERT INTO workspace_memberships (id,workspace_id,user_id,role,status) VALUES ($1,$2,$3,$4,$5)",
      [v.id, v.workspaceId, v.userId, v.role, v.status],
    );
  }
  async findActiveMembership(workspaceId: string, userId: string) {
    const q = await this.pool.query(
      "SELECT * FROM workspace_memberships WHERE workspace_id=$1 AND user_id=$2 AND status='active'",
      [workspaceId, userId],
    );
    const r = q.rows[0];
    return r
      ? {
          id: r.id,
          workspaceId: r.workspace_id,
          userId: r.user_id,
          role: r.role,
          status: r.status,
        }
      : null;
  }
  async listWorkspacesForUser(userId: string) {
    const q = await this.pool.query(
      "SELECT w.* FROM workspaces w JOIN workspace_memberships m ON m.workspace_id=w.id WHERE m.user_id=$1 AND m.status='active'",
      [userId],
    );
    return q.rows.map(workspace);
  }
}
