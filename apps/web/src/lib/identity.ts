import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import { IdentityService } from "@element-plus/application";
import { PostgresIdentityRepository } from "@element-plus/persistence";
const scrypt = promisify(scryptCallback);
const hasher = {
  async hash(password: string) {
    const salt = randomBytes(16).toString("hex");
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${key.toString("hex")}`;
  },
  async verify(password: string, stored: string) {
    const [, salt, hex] = stored.split("$");
    if (!salt || !hex) return false;
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hex, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  },
};
const tokens = {
  opaqueToken: () => randomBytes(32).toString("base64url"),
  digest: (token: string) => createHash("sha256").update(token).digest("hex"),
  id: () => randomUUID(),
};
let pool: Pool | undefined;
export function databasePool(){const url=process.env.DATABASE_URL;if(!url)throw new Error("database_not_configured");pool??=new Pool({connectionString:url});return pool;}
export function identityContext() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("database_not_configured");
  pool ??= new Pool({ connectionString: url });
  const repository = new PostgresIdentityRepository(pool);
  return {
    service: new IdentityService(
      repository,
      repository,
      hasher,
      tokens,
      () => new Date(),
    ),
    repository,
  };
}
export function identityService() {
  return identityContext().service;
}
export function sessionToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.match(/(?:^|; )element_plus_session=([^;]+)/)?.[1];
}
