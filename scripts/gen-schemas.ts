#!/usr/bin/env tsx
/**
 * Codegen: core/primitives/*.schema.yaml → generated types + Zod schemas.
 *
 * The schema YAMLs are the norm (D3); this script is the single source of
 * truth for the TypeScript types and Zod validators. Output is committed at
 * services/mcp-server/src/generated/ and guarded against drift by
 * tests/schema-sync.test.ts.
 *
 * Grammar (per primitive file):
 *   id: primitive.<name>          required, must start with "primitive."
 *   version: semver               required
 *   description?: string
 *   fields: []                    required
 *     - name: string              required
 *       type: string|datetime|number|boolean|enum|string[]|number[]|object|record
 *       required: bool            required
 *       allowed_values?: []       for enum
 *       range?: [min, max]        for number
 *       default?: scalar|array    applied via z.default
 *       fields?: []               for object
 *   lifecycle: []                 required (documentation)
 *   validity_rules?: []           documentation
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const CORE_DIR = path.resolve(moduleDir, "../core");
export const PRIMITIVES_DIR = path.join(CORE_DIR, "primitives");
export const GENERATED_DIR = path.resolve(moduleDir, "../services/mcp-server/src/generated");

export type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  allowed_values?: string[];
  range?: [number, number];
  default?: unknown;
  fields?: SchemaField[];
};

export type PrimitiveSchema = {
  id: string;
  version: string;
  description?: string;
  fields: SchemaField[];
  lifecycle: string[];
  validity_rules?: string[];
  meta?: Record<string, unknown>;
};

const VALID_TYPES = new Set([
  "string", "datetime", "number", "boolean", "enum", "string[]", "number[]", "object", "record",
]);

export function loadPrimitiveSchemas(dir = PRIMITIVES_DIR): PrimitiveSchema[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".schema.yaml")).sort();
  return files.map((file) => {
    const raw = parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`schema ${file}: must be a YAML mapping`);
    }
    const schema = raw as Record<string, unknown>;
    if (typeof schema.id !== "string" || !schema.id.startsWith("primitive.")) {
      throw new Error(`schema ${file}: id must start with "primitive."`);
    }
    if (typeof schema.version !== "string") throw new Error(`schema ${file}: version required`);
    if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
      throw new Error(`schema ${file}: fields[] required`);
    }
    for (const field of schema.fields as SchemaField[]) {
      if (!field.name || typeof field.name !== "string") throw new Error(`schema ${file}: field name required`);
      if (!VALID_TYPES.has(field.type)) throw new Error(`schema ${file}: field "${field.name}" has unknown type "${field.type}"`);
      if (field.type === "enum" && (!Array.isArray(field.allowed_values) || field.allowed_values.length === 0)) {
        throw new Error(`schema ${file}: field "${field.name}" enum needs allowed_values`);
      }
      if (field.type === "object" && (!Array.isArray(field.fields) || field.fields.length === 0)) {
        throw new Error(`schema ${file}: field "${field.name}" object needs fields`);
      }
    }
    if (!Array.isArray(schema.lifecycle)) throw new Error(`schema ${file}: lifecycle[] required`);
    return schema as unknown as PrimitiveSchema;
  });
}

// ---------------------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------------------

const SCALAR_TS: Record<string, string> = {
  string: "string",
  datetime: "string",
  number: "number",
  boolean: "boolean",
  "string[]": "string[]",
  "number[]": "number[]",
  record: "Record<string, unknown>",
};

function tsTypeFor(field: SchemaField): string {
  if (field.type === "object") {
    const inner = field.fields!.map((f) => `${f.name}${f.required ? "" : "?"}: ${tsTypeFor(f)}`).join("; ");
    return `{ ${inner} }`;
  }
  if (field.type === "enum") return field.allowed_values!.map((v) => JSON.stringify(v)).join(" | ");
  return SCALAR_TS[field.type] ?? "unknown";
}

export function entityName(schema: PrimitiveSchema): string {
  return schema.id.replace("primitive.", "").replace(/-/g, "_");
}

function pascal(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

export function generateTypes(schemas: PrimitiveSchema[]): string {
  const header =
    "// AUTO-GENERATED from core/primitives/*.schema.yaml — do not edit. Run: npm run gen:schemas\n";
  const body = schemas
    .map((schema) => {
      const name = pascal(entityName(schema));
      const fields = schema.fields
        .map((f) => `  ${f.name}${f.required ? "" : "?"}: ${tsTypeFor(f)};`)
        .join("\n");
      return `export interface ${name} {\n${fields}\n}`;
    })
    .join("\n\n");
  return `${header}\n${body}\n`;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

function zodFor(field: SchemaField): string {
  let base: string;
  switch (field.type) {
    case "string":
      base = "z.string()";
      break;
    case "datetime":
      base = "z.string().datetime()";
      break;
    case "number":
      base = field.range
        ? `z.number().min(${field.range[0]}).max(${field.range[1]})`
        : "z.number()";
      break;
    case "boolean":
      base = "z.boolean()";
      break;
    case "record":
      base = "z.record(z.unknown())";
      break;
    case "enum":
      base = `z.enum(${JSON.stringify(field.allowed_values ?? [])} as [string, ...string[]])`;
      break;
    case "string[]":
      base = "z.array(z.string())";
      break;
    case "number[]":
      base = "z.array(z.number())";
      break;
    case "object": {
      const inner = field.fields!.map((f) => `      ${f.name}: ${zodFor(f)},`).join("\n");
      base = `z.object({\n${inner}\n    })`;
      break;
    }
    default:
      base = "z.unknown()";
  }
  if (field.default !== undefined) return `${base}.default(${JSON.stringify(field.default)})`;
  if (!field.required) return `${base}.optional()`;
  return base;
}

export function generateSchemas(schemas: PrimitiveSchema[]): string {
  const header =
    "// AUTO-GENERATED from core/primitives/*.schema.yaml — do not edit. Run: npm run gen:schemas\n" +
    'import { z } from "zod";\n';
  const body = schemas
    .map((schema) => {
      const name = entityName(schema);
      const fields = schema.fields.map((f) => `  ${f.name}: ${zodFor(f)},`).join("\n");
      return `export const ${name}Schema = z.object({\n${fields}\n});`;
    })
    .join("\n\n");
  const registry = `export const PRIMITIVE_SCHEMAS: Record<string, z.ZodTypeAny> = {\n${schemas
    .map((s) => `  ${entityName(s)}: ${entityName(s)}Schema,`)
    .join("\n")}\n};`;
  return `${header}\n${body}\n\n${registry}\n`;
}

export function generateAll(): { typesSource: string; schemasSource: string; schemas: PrimitiveSchema[] } {
  const schemas = loadPrimitiveSchemas();
  return { typesSource: generateTypes(schemas), schemasSource: generateSchemas(schemas), schemas };
}

export function writeGenerated(): { typesFile: string; schemasFile: string } {
  const { typesSource, schemasSource } = generateAll();
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const typesFile = path.join(GENERATED_DIR, "types.ts");
  const schemasFile = path.join(GENERATED_DIR, "schemas.ts");
  fs.writeFileSync(typesFile, typesSource);
  fs.writeFileSync(schemasFile, schemasSource);
  return { typesFile, schemasFile };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { typesFile, schemasFile } = writeGenerated();
  console.log(`[gen-schemas] wrote ${typesFile}`);
  console.log(`[gen-schemas] wrote ${schemasFile}`);
}
