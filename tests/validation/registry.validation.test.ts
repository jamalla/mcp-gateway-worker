import { describe, expect, it } from "vitest";

import { listToolDefinitions, validateToolRegistry, type ToolDefinition } from "../../src/registry";

describe("registry invariants", () => {
  it("registry has no duplicates and includes required metadata", () => {
    const definitions = listToolDefinitions();
    const issues = validateToolRegistry(definitions);

    expect(issues).toEqual([]);

    for (const definition of definitions) {
      expect(definition.domain).toBeDefined();
      expect(definition.requiredScopes.length).toBeGreaterThan(0);
      expect(definition.inputSchema).toBeDefined();
    }
  });

  it("duplicate tool names fail validation", () => {
    const definitions = listToolDefinitions();
    const duplicate = definitions[0];
    const duplicateRegistry = [...definitions, duplicate] as ToolDefinition[];

    const issues = validateToolRegistry(duplicateRegistry);
    expect(issues.some((issue) => issue.includes("Duplicate tool name"))).toBe(true);
  });
});
