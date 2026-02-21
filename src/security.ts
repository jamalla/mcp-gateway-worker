export function getMissingScopes(requiredScopes: string[], providedScopes: string[]): string[] {
	const provided = new Set(providedScopes);
	return requiredScopes.filter((scope) => !provided.has(scope));
}

export function hasRequiredScopes(requiredScopes: string[], providedScopes: string[]): boolean {
	return getMissingScopes(requiredScopes, providedScopes).length === 0;
}

export function parseAllowedOrigins(rawAllowedOrigins: string | null | undefined): Set<string> {
	if (!rawAllowedOrigins) {
		return new Set<string>();
	}

	const origins = rawAllowedOrigins
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);

	return new Set(origins);
}

export function checkOriginAllowed(
	requestOrigin: string | null | undefined,
	rawAllowedOrigins: string | null | undefined
): { allowed: boolean; checked: boolean } {
	if (!requestOrigin) {
		return { allowed: true, checked: false };
	}

	const allowedOrigins = parseAllowedOrigins(rawAllowedOrigins);
	return {
		allowed: allowedOrigins.has(requestOrigin),
		checked: true
	};
}

