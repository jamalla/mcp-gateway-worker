import { type ZodError } from "zod";

import {
	createJsonRpcErrorEnvelope,
	type AppErrorCode,
	type CanonicalErrorData,
	type JsonRpcId
} from "./types";

type ErrorDefinition = {
	jsonRpcCode: number;
	httpStatus: number;
	message: string;
};

const ERROR_DEFINITIONS: Record<AppErrorCode, ErrorDefinition> = {
	TOOL_NOT_FOUND: { jsonRpcCode: -32004, httpStatus: 404, message: "Requested tool was not found" },
	SCOPE_MISSING: { jsonRpcCode: -32010, httpStatus: 403, message: "Missing required scope(s)" },
	VALIDATION_ERROR: { jsonRpcCode: -32602, httpStatus: 422, message: "Request validation failed" },
	UPSTREAM_ERROR: { jsonRpcCode: -32020, httpStatus: 502, message: "Upstream service failed" },
	FORBIDDEN: { jsonRpcCode: -32003, httpStatus: 403, message: "Request forbidden by policy" },
	METHOD_NOT_SUPPORTED: { jsonRpcCode: -32601, httpStatus: 400, message: "Method not supported" },
	UNAUTHORIZED: { jsonRpcCode: -32001, httpStatus: 401, message: "Unauthorized" }
};

export type CanonicalGatewayError = {
	errorCode: AppErrorCode;
	requestId: string;
	message: string;
	jsonRpcCode: number;
	httpStatus: number;
	details?: Record<string, unknown>;
};

export function toCanonicalError(input: {
	errorCode: AppErrorCode;
	requestId: string;
	message?: string;
	details?: Record<string, unknown>;
}): CanonicalGatewayError {
	const definition = ERROR_DEFINITIONS[input.errorCode];

	return {
		errorCode: input.errorCode,
		requestId: input.requestId,
		message: input.message ?? definition.message,
		jsonRpcCode: definition.jsonRpcCode,
		httpStatus: definition.httpStatus,
		details: input.details
	};
}

export function toCanonicalErrorData(error: CanonicalGatewayError): CanonicalErrorData {
	return {
		error_code: error.errorCode,
		request_id: error.requestId,
		details: error.details
	};
}

export function toJsonRpcErrorResponse(error: CanonicalGatewayError, id: JsonRpcId) {
	return createJsonRpcErrorEnvelope(id, {
		code: error.jsonRpcCode,
		message: error.message,
		data: toCanonicalErrorData(error)
	});
}

export function toRestErrorResponseBody(error: CanonicalGatewayError) {
	return {
		request_id: error.requestId,
		error: {
			error_code: error.errorCode,
			message: error.message,
			details: error.details
		}
	};
}

export function mapZodErrorToValidationError(error: ZodError, requestId: string): CanonicalGatewayError {
	return toCanonicalError({
		errorCode: "VALIDATION_ERROR",
		requestId,
		details: {
			issues: error.issues.map((issue) => ({
				code: issue.code,
				path: issue.path.join("."),
				message: issue.message
			}))
		}
	});
}

export function mapUnknownToUpstreamError(value: unknown, requestId: string): CanonicalGatewayError {
	if (value instanceof Error) {
		return toCanonicalError({
			errorCode: "UPSTREAM_ERROR",
			requestId,
			details: { cause: value.message }
		});
	}

	return toCanonicalError({
		errorCode: "UPSTREAM_ERROR",
		requestId,
		details: { cause: "unknown" }
	});
}

