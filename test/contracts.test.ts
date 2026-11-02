import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = JSON.parse(read("contracts/bridge-schema.json"));

function validator() {
  const ajv = new Ajv2020({ strict: true });
  ajv.addKeyword("x-direction").addKeyword("x-max-message-bytes");
  return ajv.compile(schema);
}

describe("contracts", () => {
  it("the bridge schema compiles as JSON Schema 2020-12", () => {
    expect(() => validator()).not.toThrow();
    expect(schema["$schema"]).toContain("2020-12");
  });

  it("the contract has an operation with a response", () => {
    const api = parse(read("contracts/openapi.yaml")) as { openapi: string; paths: Record<string, Record<string, { responses?: Record<string, unknown> }>> };
    expect(api.openapi).toMatch(/^3\./);
    const operations = Object.values(api.paths ?? {}).flatMap((item) => Object.entries(item).filter(([method]) => ["get", "put", "post", "delete", "patch", "head", "options"].includes(method)));
    expect(operations.length).toBeGreaterThan(0);
    for (const [, operation] of operations) expect(Object.keys(operation.responses ?? {}).length).toBeGreaterThan(0);
  });

  it("declares the Bearer scheme on every operation", () => {
    type Operation = { security?: Array<Record<string, unknown>>; responses?: Record<string, unknown> };
    const api = parse(read("contracts/openapi.yaml")) as {
      security?: Array<Record<string, unknown>>;
      paths: Record<string, Record<string, Operation>>;
      components?: { securitySchemes?: Record<string, { type?: string; scheme?: string }> };
    };
    const scheme = api.components?.securitySchemes?.["bearerAuth"];
    expect(scheme?.type).toBe("http");
    expect(scheme?.scheme).toBe("bearer");
    const methods = ["get", "put", "post", "delete", "patch", "head", "options"];
    const operations = Object.entries(api.paths).flatMap(([path, item]) => Object.entries(item).filter(([m]) => methods.includes(m)).map(([m, op]) => ({ id: `${m} ${path}`, op })));
    expect(operations.length).toBeGreaterThan(0);
    for (const { id, op } of operations) {
      // an operation's own list replaces the document's list; an empty list would switch the scheme off
      const effective = op.security ?? api.security ?? [];
      expect(effective.some((requirement) => "bearerAuth" in requirement), `${id} requires bearerAuth`).toBe(true);
      expect(Object.keys(op.responses ?? {}), `${id} documents 401`).toContain("401");
    }
  });

  it("the golden vectors agree with the schema", () => {
    const validate = validator();
    const vectors = JSON.parse(read("contracts/generated/bridge.vectors.json")) as Array<{ name: string; json: string; nativeToWeb: string; webToNative: string }>;
    expect(vectors.length).toBeGreaterThan(20);
    for (const v of vectors) {
      // the schema does not carry the size cap, and a JavaScript number cannot hold the largest integers
      if (v.name.startsWith("message-over") || v.name.startsWith("integer-beyond")) continue;
      let json: unknown;
      try {
        json = JSON.parse(v.json);
      } catch {
        expect([v.nativeToWeb, v.webToNative], v.name).toEqual(["refuse", "refuse"]);
        continue;
      }
      const accepted = v.nativeToWeb === "accept" || v.webToNative === "accept";
      expect(validate(json), `${v.name}: ${JSON.stringify(validate.errors)}`).toBe(accepted);
    }
  });
});
