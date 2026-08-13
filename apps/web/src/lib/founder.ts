import { FounderService } from "@element-plus/application";
import { PostgresFounderRepository } from "@element-plus/persistence";
import { FakeStructuredLlm } from "@element-plus/founder";
import { databasePool } from "./identity";
export function founderService(){return new FounderService(new PostgresFounderRepository(databasePool()),new FakeStructuredLlm());}
