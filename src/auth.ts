import { normalizeScopes } from "./context";
import { toCanonicalError, type CanonicalGatewayError } from "./errors";
import type { GatewayEnv } from "./types";

type AuthSuccess = {
	ok: true;
	scopes: string[];
};

type AuthFailure = {
	ok: false;
	error: CanonicalGatewayError;
};

export type AuthResult = AuthSuccess | AuthFailure;

function extractBearerToken(headerValue: string | null): string | null {
	if (!headerValue) {
		return null;
	}

	const [scheme, token] = headerValue.split(" ");
	if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
		return null;
	}

	return token.trim();
}

export function getTrustedScopesFromEnv(env: Pick<GatewayEnv, "CLIENT_ALLOWED_SCOPES">): string[] {
	return normalizeScopes(env.CLIENT_ALLOWED_SCOPES);
}

export function validateStaticClientAuth(
	requestHeaders: Headers,
	env: Pick<GatewayEnv, "AUTH_MODE" | "CLIENT_AUTH_TOKEN" | "CLIENT_ALLOWED_SCOPES">,
	requestId: string
): AuthResult {
	if (env.AUTH_MODE !== "static-token") {
		return {
			ok: true,
			scopes: getTrustedScopesFromEnv(env)
		};
	}

	const expectedToken = env.CLIENT_AUTH_TOKEN;
	if (!expectedToken) {
		return {
			ok: false,
			error: toCanonicalError({
				errorCode: "FORBIDDEN",
				requestId,
				message: "Authentication is not configured"
			})
		};
	}

	const token = extractBearerToken(requestHeaders.get("authorization"));
	if (!token || token !== expectedToken) {
		return {
			ok: false,
			error: toCanonicalError({
				errorCode: "FORBIDDEN",
				requestId,
				message: "Invalid or missing bearer token"
			})
		};
	}

	return {
		ok: true,
		scopes: getTrustedScopesFromEnv(env)
	};
}

