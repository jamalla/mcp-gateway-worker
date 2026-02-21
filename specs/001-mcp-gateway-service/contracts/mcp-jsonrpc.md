# MCP JSON-RPC Contract

## Supported Methods
- `tools/list`
- `tools/call`

## Request Envelope
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "tools/call",
  "params": {
    "name": "sum",
    "arguments": { "a": 1, "b": 2 }
  }
}
```

## Success Envelope
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "request_id": "r-9f84f5a2",
    "output": { "value": 3 }
  }
}
```

## Error Envelope (Canonical)
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "error": {
    "code": -32010,
    "message": "Missing required scope(s)",
    "data": {
      "error_code": "SCOPE_MISSING",
      "request_id": "r-9f84f5a2",
      "missing_scopes": ["math:sum"]
    }
  }
}
```

## Error Code Mapping
| error_code | jsonrpc.error.code | Semantics |
|------------|--------------------|-----------|
| `TOOL_NOT_FOUND` | -32004 | Requested tool name is not in unified registry |
| `SCOPE_MISSING` | -32010 | Caller lacks one or more required scopes |
| `VALIDATION_ERROR` | -32602 | Invalid request payload, params, or headers |
| `UPSTREAM_ERROR` | -32020 | Domain worker invocation failed or returned invalid shape |
| `FORBIDDEN` | -32003 | Origin not allowlisted or request forbidden by policy |

## Context Propagation Contract (gateway -> domain)
```json
{
  "request_id": "r-9f84f5a2",
  "tenant_id": "tenant-1",
  "actor_id": "actor-123",
  "scopes": ["math:sum", "customers:read"]
}
```

Headers forwarded upstream:
- `Authorization: Bearer <DOMAIN_SHARED_SECRET>`
- `x-request-id: <request_id>`
