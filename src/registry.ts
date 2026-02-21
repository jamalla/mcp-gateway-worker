import { z } from "zod";

import type { GatewayRequestContext } from "./context";

export type ToolDomain = "domain-a" | "domain-b";

export type ToolDefinition = {
	name: "hello" | "list-top-customers" | "sum" | "normalize-text";
	domain: ToolDomain;
	requiredScopes: string[];
	description: string;
	inputSchema: z.ZodTypeAny;
	execute: (args: Record<string, unknown>, context: GatewayRequestContext) => Record<string, unknown>;
};

const REGISTRY: ToolDefinition[] = [
	{
		name: "hello",
		domain: "domain-a",
		requiredScopes: ["greetings:read"],
		description: "Return a greeting message",
		inputSchema: z
			.object({
				name: z.string().min(1).optional()
			})
			.passthrough(),
		execute: (args) => ({ message: `Hello, ${(args.name as string | undefined) ?? "world"}!` })
	},
	{
		name: "list-top-customers",
		domain: "domain-a",
		requiredScopes: ["customers:read"],
		description: "List top customers",
		inputSchema: z
			.object({
				limit: z.number().int().positive().max(100).optional().default(3)
			})
			.passthrough(),
		execute: (args) => {
			const limit = typeof args.limit === "number" ? args.limit : 3;
			const customers = Array.from({ length: limit }).map((_, index) => ({
				id: `customer-${index + 1}`,
				name: `Customer ${index + 1}`
			}));
			return { customers };
		}
	},
	{
		name: "sum",
		domain: "domain-b",
		requiredScopes: ["math:sum"],
		description: "Sum two numbers",
		inputSchema: z
			.object({
				a: z.number(),
				b: z.number(),
				simulate_upstream_error: z.boolean().optional()
			})
			.passthrough(),
		execute: (args) => {
			if (args.simulate_upstream_error === true) {
				throw new Error("simulated upstream failure");
			}

			return { value: (args.a as number) + (args.b as number) };
		}
	},
	{
		name: "normalize-text",
		domain: "domain-b",
		requiredScopes: ["text:normalize"],
		description: "Normalize text",
		inputSchema: z
			.object({
				text: z.string().min(1)
			})
			.passthrough(),
		execute: (args) => ({
			text: String(args.text)
				.trim()
				.replace(/\s+/g, " ")
				.toLowerCase()
		})
	}
];

const TOOL_MAP = new Map(REGISTRY.map((tool) => [tool.name, tool]));

export function listTools(): ToolDefinition[] {
	return REGISTRY.map((tool) => ({ ...tool, requiredScopes: [...tool.requiredScopes] }));
}

export function listToolDefinitions(): ToolDefinition[] {
	return REGISTRY.map((tool) => ({ ...tool, requiredScopes: [...tool.requiredScopes] }));
}

export function getToolByName(name: string): ToolDefinition | undefined {
	const tool = TOOL_MAP.get(name as ToolDefinition["name"]);
	if (!tool) {
		return undefined;
	}

	return { ...tool, requiredScopes: [...tool.requiredScopes] };
}

export function validateToolRegistry(definitions: ToolDefinition[]): string[] {
	const issues: string[] = [];
	const seen = new Set<string>();

	for (const definition of definitions) {
		if (seen.has(definition.name)) {
			issues.push(`Duplicate tool name: ${definition.name}`);
		}
		seen.add(definition.name);

		if (!definition.domain) {
			issues.push(`Missing domain: ${definition.name}`);
		}

		if (!definition.requiredScopes || definition.requiredScopes.length === 0) {
			issues.push(`Missing required scopes: ${definition.name}`);
		}

		if (!definition.inputSchema) {
			issues.push(`Missing input schema: ${definition.name}`);
		}
	}

	return issues;
}


