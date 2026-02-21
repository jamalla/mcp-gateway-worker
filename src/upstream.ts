import { mapUnknownToUpstreamError, toCanonicalError, type CanonicalGatewayError } from "./errors";
import type { GatewayRequestContext } from "./context";
import { DEFAULT_UPSTREAM_TIMEOUT_MS, UpstreamSuccessPayloadSchema, type GatewayEnv } from "./types";
import type { ToolDomain } from "./registry";

export type UpstreamInvocation = {
	domain: ToolDomain;
	toolName: string;
	argumentsPayload: Record<string, unknown>;
	context: GatewayRequestContext;
};

type UpstreamRequestParts = {
	url: string;
	init: RequestInit;
};

export function logUpstreamEvent(payload: {
	request_id: string;
	endpoint: string;
	tool_name: string;
	domain: ToolDomain;
	status: "success" | "error";
	outcome: string;
	error_code?: string;
}) {
	console.info(JSON.stringify(payload));
}

export function resolveDomainBaseUrl(env: Pick<GatewayEnv, "DOMAIN_A_URL" | "DOMAIN_B_URL">, domain: ToolDomain): string {
	return domain === "domain-a" ? env.DOMAIN_A_URL : env.DOMAIN_B_URL;
}

export function buildUpstreamRequest(
	env: Pick<GatewayEnv, "DOMAIN_A_URL" | "DOMAIN_B_URL" | "DOMAIN_SHARED_SECRET">,
	invocation: UpstreamInvocation
): UpstreamRequestParts {
	const baseUrl = resolveDomainBaseUrl(env, invocation.domain);
	const url = `${baseUrl.replace(/\/$/, "")}/tools/${encodeURIComponent(invocation.toolName)}/call`;

	const init: RequestInit = {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${env.DOMAIN_SHARED_SECRET}`,
			"x-request-id": invocation.context.request_id
		},
		body: JSON.stringify({
			arguments: invocation.argumentsPayload,
			context: invocation.context
		})
	};

	return { url, init };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export async function invokeToolUpstream(
	env: Pick<GatewayEnv, "DOMAIN_A_URL" | "DOMAIN_B_URL" | "DOMAIN_SHARED_SECRET" | "UPSTREAM_TIMEOUT_MS">,
	invocation: UpstreamInvocation
): Promise<{ ok: true; data: { result: Record<string, unknown> } } | { ok: false; error: CanonicalGatewayError }> {
	const request = buildUpstreamRequest(env, invocation);
	const timeoutMs = env.UPSTREAM_TIMEOUT_MS ?? DEFAULT_UPSTREAM_TIMEOUT_MS;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const response = await fetchWithTimeout(request.url, request.init, timeoutMs);
			if (!response.ok) {
				const error = toCanonicalError({
					errorCode: "UPSTREAM_ERROR",
					requestId: invocation.context.request_id,
					details: {
						status: response.status,
						domain: invocation.domain,
						attempt: attempt + 1
					}
				});
				logUpstreamEvent({
					request_id: invocation.context.request_id,
					endpoint: "/tools/:name/call",
					tool_name: invocation.toolName,
					domain: invocation.domain,
					status: "error",
					outcome: "upstream_non_ok",
					error_code: error.errorCode
				});
				return { ok: false, error };
			}

			const payload = await response.json();
			const validatedPayload = UpstreamSuccessPayloadSchema.safeParse(payload);
			if (!validatedPayload.success) {
				const error = toCanonicalError({
					errorCode: "UPSTREAM_ERROR",
					requestId: invocation.context.request_id,
					details: {
						reason: "nonconforming_payload",
						domain: invocation.domain
					}
				});

				logUpstreamEvent({
					request_id: invocation.context.request_id,
					endpoint: "/tools/:name/call",
					tool_name: invocation.toolName,
					domain: invocation.domain,
					status: "error",
					outcome: "upstream_payload_invalid",
					error_code: error.errorCode
				});

				return { ok: false, error };
			}

			logUpstreamEvent({
				request_id: invocation.context.request_id,
				endpoint: "/tools/:name/call",
				tool_name: invocation.toolName,
				domain: invocation.domain,
				status: "success",
				outcome: "upstream_ok"
			});
			return { ok: true, data: validatedPayload.data };
		} catch (error) {
			if (attempt === 0) {
				continue;
			}

			const mappedError = mapUnknownToUpstreamError(error, invocation.context.request_id);
			logUpstreamEvent({
				request_id: invocation.context.request_id,
				endpoint: "/tools/:name/call",
				tool_name: invocation.toolName,
				domain: invocation.domain,
				status: "error",
				outcome: "upstream_exception",
				error_code: mappedError.errorCode
			});
			return { ok: false, error: mappedError };
		}
	}

	return {
		ok: false,
		error: toCanonicalError({
			errorCode: "UPSTREAM_ERROR",
			requestId: invocation.context.request_id,
			details: { reason: "retry_exhausted" }
		})
	};
}

