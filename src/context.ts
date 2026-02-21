import { RequestHeadersSchema } from "./types";

export type GatewayRequestContext = {
	request_id: string;
	tenant_id: string | null;
	actor_id: string | null;
	scopes: string[];
	origin: string | null;
};

function fallbackRequestId(): string {
	const randomPart = Math.random().toString(36).slice(2, 10);
	return `r-${Date.now()}-${randomPart}`;
}

export function normalizeScopes(rawScopes: string | null | undefined): string[] {
	if (!rawScopes) {
		return [];
	}

	const parts = rawScopes
		.split(",")
		.map((scope) => scope.trim())
		.filter((scope) => scope.length > 0);

	return Array.from(new Set(parts));
}

export function extractRequestContext(
	headers: Headers,
	requestIdFactory: () => string = () => crypto.randomUUID?.() ?? fallbackRequestId()
): GatewayRequestContext {
	const parsedHeaders = RequestHeadersSchema.parse({
		authorization: headers.get("authorization") ?? undefined,
		origin: headers.get("origin") ?? undefined,
		"x-request-id": headers.get("x-request-id") ?? undefined,
		"x-tenant-id": headers.get("x-tenant-id") ?? undefined,
		"x-actor-id": headers.get("x-actor-id") ?? undefined,
		"x-scopes": headers.get("x-scopes") ?? undefined
	});

	const requestId = parsedHeaders["x-request-id"]?.trim() || requestIdFactory();

	return {
		request_id: requestId,
		tenant_id: parsedHeaders["x-tenant-id"] ?? null,
		actor_id: parsedHeaders["x-actor-id"] ?? null,
		scopes: normalizeScopes(parsedHeaders["x-scopes"]),
		origin: parsedHeaders.origin ?? null
	};
}

