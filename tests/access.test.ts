import { describe, expect, it } from "vitest";
import { can, canTool, requirePermission, assertWorkspaceAccess, permissionForTool } from "../services/mcp-server/src/access.js";
import { loadRbacPolicy } from "../services/mcp-server/src/rbac-policy.js";
import type { Actor } from "../services/mcp-server/src/actor.js";

const actor = (role: string, workspace?: string): Actor => ({ subject: "tester", role, workspace, mode: "local-role" });

describe("RBAC at the ecosystem layer (core/policies/rbac.yaml)", () => {
  it("every role can read knowledge; viewer can ONLY read", () => {
    const policy = loadRbacPolicy();
    for (const role of policy.roles) expect(can(role, "read:knowledge")).toBe(true);
    expect(can("viewer", "write:knowledge")).toBe(false);
    expect(can("viewer", "write:evidence")).toBe(false);
    expect(can("viewer", "manage:access")).toBe(false);
  });

  it("process_coach can capture evidence but cannot manage access", () => {
    expect(can("process_coach", "write:evidence")).toBe(true);
    expect(can("process_coach", "manage:access")).toBe(false);
    expect(can("process_coach", "approve:proposal")).toBe(false);
  });

  it("only system_architect and compliance_steward manage access; automation_owner executes automation", () => {
    const managers = loadRbacPolicy().roles.filter((r) => can(r, "manage:access"));
    expect(managers.sort()).toEqual(["compliance_steward", "system_architect"]);
    const executors = loadRbacPolicy().roles.filter((r) => can(r, "execute:automation"));
    expect(executors.sort()).toEqual(["automation_owner", "system_architect"]);
  });

  it("tool contracts map to permissions (core/mcp/tools.yaml)", () => {
    expect(permissionForTool("search_playbooks")).toBe("read:knowledge");
    expect(permissionForTool("capture_field_observation")).toBe("write:evidence");
    expect(permissionForTool("create_workspace")).toBe("write:knowledge");
    expect(permissionForTool("review_feedback")).toBe("review:feedback");
    expect(permissionForTool("approve_asset")).toBe("approve:proposal");
    expect(permissionForTool("execute_automation")).toBe("execute:automation");
  });

  it("canTool combines role × tool permission", () => {
    expect(canTool(actor("process_coach"), "capture_field_observation")).toBe(true);
    expect(canTool(actor("viewer"), "capture_field_observation")).toBe(false);
    expect(canTool(actor("viewer"), "list_evidence")).toBe(true);
    expect(canTool(actor("anyone"), "unknown_tool")).toBe(false);
  });

  it("requirePermission throws a machine-readable error", () => {
    expect(() => requirePermission(actor("viewer"), "write:knowledge")).toThrow("permission_denied:write:knowledge for role viewer");
    expect(() => requirePermission(actor("system_architect"), "write:knowledge")).not.toThrow();
  });

  it("assertWorkspaceAccess enforces tenant isolation via actor scope", () => {
    const scoped = actor("process_coach", "acme");
    expect(() => assertWorkspaceAccess(scoped, "acme")).not.toThrow();
    expect(() => assertWorkspaceAccess(scoped, "beta")).toThrow("workspace_forbidden:beta");
    // manage:access roles pass any workspace
    expect(() => assertWorkspaceAccess(actor("system_architect", "acme"), "beta")).not.toThrow();
    // unscoped actors pass everything
    expect(() => assertWorkspaceAccess(actor("viewer"), "beta")).not.toThrow();
  });
});
