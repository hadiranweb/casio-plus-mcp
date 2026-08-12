import { DomainError } from "./errors.js";
export function assertMutable(status: string): void {
  if (["published", "active", "completed", "merged"].includes(status))
    throw new DomainError(`immutable_versioned_object:${status}`);
}
export function assertNextVersion(
  baseVersion: string,
  nextVersion: string,
): void {
  if (baseVersion === nextVersion)
    throw new DomainError("new_version_required");
}
