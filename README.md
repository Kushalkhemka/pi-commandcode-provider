<div align="center">

# CommandCode for Pi

**Use CommandCode models in Pi through the documented Provider API—with native streaming, tools, reasoning, vision, prompt caching, usage accounting, and resilient model discovery.**

[![npm version](https://img.shields.io/npm/v/%40kushalkhemka%2Fpi-commandcode-provider?color=cb3837&logo=npm)](https://www.npmjs.com/package/@kushalkhemka/pi-commandcode-provider)
[![CI](https://github.com/Kushalkhemka/pi-commandcode-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/Kushalkhemka/pi-commandcode-provider/actions/workflows/ci.yml)
[![CommandCode catalog](https://github.com/Kushalkhemka/pi-commandcode-provider/actions/workflows/model-metadata.yml/badge.svg)](https://github.com/Kushalkhemka/pi-commandcode-provider/actions/workflows/model-metadata.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Install](#install) · [Compatibility](#compatibility) · [Configuration](#configuration) · [Troubleshooting](#troubleshooting) · [Contributing](CONTRIBUTING.md)

</div>

> [!IMPORTANT]
> This is an unofficial, community-maintained integration. It is not affiliated with or endorsed by CommandCode. You need your own account and a plan with [Provider API access](https://commandcode.ai/docs/provider).

## Why this package

- **Native Pi streaming** through Pi's maintained OpenAI and Anthropic adapters
- **Full agent loops** with incremental tool arguments, reasoning, images, usage, aborts, and retries
- **Stable prompt-cache routing** using Pi session IDs on OpenAI-compatible requests
- **Live model discovery** with cache-first startup and background refresh
- **Current capabilities** synchronized from `command-code@1.47.0`
- **Explicit pricing coverage** for every model in the current live Provider API catalog
- **Zero-data-retention header** support through `CMD_ZDR=1`
- **No runtime dependency bundle**—the extension uses Pi's own core packages

## Install

```bash
pi install npm:@kushalkhemka/pi-commandcode-provider
```

Restart Pi or run `/reload`, then authenticate:

```text
/login
```

Choose **Use a subscription → Command Code**, finish browser login or paste an API key, then select a model:

```text
/model
```

You can also list models non-interactively:

```bash
pi --list-models commandcode
```

### Requirements

- Pi `0.84.4` or newer (tested with `0.84.4` and `0.85.0`)
- Node.js 20 or newer when developing or running scripts directly
- A CommandCode plan with Provider API access

The documented Provider API is unavailable on the Go plan. See [Legacy Go mode](#legacy-go-mode) before opting into the unsupported fallback.

## Compatibility

| Capability        | Pi behavior                                          | Transport                                    |
| ----------------- | ---------------------------------------------------- | -------------------------------------------- |
| Text streaming    | Incremental deltas                                   | OpenAI Chat Completions / Anthropic Messages |
| Tool calls        | Incremental JSON arguments and complete tool results | Native Pi adapters                           |
| Reasoning         | Model-specific supported effort levels               | Synced CommandCode CLI catalog               |
| Images            | Advertised only for verified vision models           | Native multimodal schemas                    |
| Prompt caching    | Stable `prompt_cache_key` per Pi session             | OpenAI-compatible models                     |
| Anthropic caching | Pi's short-lived cache annotations                   | Anthropic-compatible models                  |
| Usage             | Input, output, cache-read, and cache-write tokens    | Final streamed usage events                  |
| Cost display      | Explicit per-model pricing with long-context tiers   | Reviewed static overlay                      |
| ZDR               | Sends `x-cmd-zdr: 1` when enabled                    | Documented CommandCode header                |
| Offline startup   | Last valid model catalog loads immediately           | Local cache + background refresh             |
| Context overflow  | Normalized for Pi auto-compaction                    | Both documented Provider API routes          |

The primary path uses only these documented endpoints:

```text
GET  /provider/v1/models
POST /provider/v1/chat/completions
POST /provider/v1/messages
```

CommandCode's first-party CLI includes its own prompts, tools, and harness optimizations. This package targets wire-protocol and Pi runtime compatibility; it does not claim to reproduce the proprietary first-party harness.

## Authentication

The recommended flow is Pi's `/login` command. The provider also accepts:

```bash
export COMMAND_CODE_API_KEY="user_..."
```

Existing credentials can be read from:

- `~/.commandcode/auth.json`
- `~/.pi/agent/auth.json`

Supported shapes include:

```json
{ "apiKey": "user_..." }
```

```json
{
  "command-code": {
    "type": "api",
    "key": "user_..."
  }
}
```

Credentials are never written to this repository or included in package output.

## Provider commands

| Command                | Purpose                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `/commandcode-status`  | Show transport, catalog source, model count, cache path, refresh state, and redacted errors |
| `/commandcode-refresh` | Refresh and re-register the live model catalog without restarting Pi                        |
| `/commandcode-quota`   | Show available credits, plan information, and rolling usage windows                         |

## Model discovery and caching

The provider fetches models from `https://api.commandcode.ai/provider/v1/models`.

The last valid catalog is stored at:

```text
~/.pi/agent/commandcode-models.json
```

Startup behavior is deliberately resilient:

1. A valid cached catalog is registered immediately.
2. A live refresh runs in the background.
3. A successful response atomically replaces the cache.
4. A failed refresh leaves the last valid catalog active.
5. First-time offline startup remains usable, but CommandCode models appear only after connectivity returns and `/commandcode-refresh` succeeds.

Catalog files are written with mode `0600`. Overlapping refresh requests are coalesced.

### Prompt caching

For OpenAI-compatible models, the extension supplies a stable, maximum-64-character `prompt_cache_key` derived from Pi's session ID. This helps compatible upstream routing keep related turns on the same cache path. Setting Pi's cache retention to `none` disables the field.

For Anthropic-compatible models, Pi applies its native short-lived cache annotations. The extension does not claim unsupported long-retention behavior.

## Reasoning, tools, and images

Reasoning and vision capabilities are generated from the published CommandCode CLI catalog. Each model exposes only the thinking levels accepted by its current metadata.

Vision-capable models accept image blocks from direct user messages and tool results. Unknown or explicitly text-only models remain text-only, preventing lossy requests.

Provider API streaming is delegated to Pi's native adapters. This preserves:

- interleaved reasoning and text
- fragmented tool-call arguments
- multiple concurrent tool calls
- final usage-only chunks
- cancellation and bounded retry behavior
- correct cached-token accounting

## Pricing

The Provider API catalog does not currently include rates. This extension therefore maintains an explicit pricing overlay sourced from the [CommandCode pricing page](https://commandcode.ai/docs/resources/pricing-limits).

The current live catalog is checked daily. CI fails when a model is added without both:

- an explicitly reviewed price entry, including free models
- a synchronized catalog fixture

Displayed costs are estimates. CommandCode's usage page remains authoritative for actual billing, promotions, and time-dependent rates.

## Configuration

| Variable                         | Default               | Description                                                           |
| -------------------------------- | --------------------- | --------------------------------------------------------------------- |
| `COMMAND_CODE_API_KEY`           | —                     | Preferred API-key environment variable                                |
| `CMD_ZDR=1`                      | disabled              | Send CommandCode's documented zero-data-retention header              |
| `COMMANDCODE_API_BASE`           | Provider API URL      | Override the Provider API base for local tests or compatible gateways |
| `COMMANDCODE_MODELS_URL`         | `/provider/v1/models` | Override model discovery                                              |
| `COMMANDCODE_MODELS_CACHE`       | Pi agent directory    | Override the catalog cache path                                       |
| `COMMANDCODE_MODELS_TIMEOUT_MS`  | `10000`               | Bound model discovery and refresh requests                            |
| `COMMANDCODE_ENABLE_LEGACY_GO=1` | disabled              | Explicitly enable the undocumented Go-plan fallback                   |

Legacy aliases `COMMANDCODE_API_KEY`, `COMMANDCODE_ZDR`, and existing auth-file shapes remain accepted for migration compatibility.

## Legacy Go mode

CommandCode's documentation excludes Go from Provider API access. This extension therefore keeps the undocumented `/alpha/generate` fallback **disabled by default**.

If you understand that the endpoint is unsupported and may change without notice, enable it explicitly:

```bash
export COMMANDCODE_ENABLE_LEGACY_GO=1
```

Legacy mode includes streaming reasoning, incremental tool arguments, usage accounting, bounded retries, and `pause_turn` continuation. It is not covered by the public Provider API compatibility guarantee.

## Troubleshooting

### No CommandCode models appear

```text
/commandcode-status
/commandcode-refresh
```

Check the reported endpoint, cache state, and redacted warning. On first use, live model discovery must succeed once before offline startup can use a cache.

### `401` or missing credentials

Run `/login` again, or verify that `COMMAND_CODE_API_KEY` is available to the Pi process. Avoid placing tokens directly in shell history, repository files, or issue reports.

### `403 upgrade_required`

Your account likely does not include Provider API access. Upgrade to a supported plan or knowingly opt into [Legacy Go mode](#legacy-go-mode).

### Long request appears idle

Pi's provider timeout and retry settings apply. A value of `httpIdleTimeoutMs: 0` can be useful for models that pause for long reasoning periods, but consider the risk of genuinely stuck connections.

## Development

```bash
git clone https://github.com/Kushalkhemka/pi-commandcode-provider.git
cd pi-commandcode-provider
npm ci
npm test
npm run format:check
```

Useful focused checks:

```bash
npm run test:models
npm run test:stream
npm run test:transport
npm run test:pi-local
npm run check:live-catalog
npm run check:commandcode-catalog
```

Test the checkout inside an isolated Pi environment:

```bash
npm run pi:isolated
```

Or use your existing Pi credentials while loading only this checkout:

```bash
npm run pi:authenticated
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for testing expectations and [RELEASE.md](RELEASE.md) for the package release checklist.

## Update or remove

```bash
pi update --extensions
pi remove npm:@kushalkhemka/pi-commandcode-provider
```

## Acknowledgements

This project is a maintained fork of [`patlux/pi-commandcode-provider`](https://github.com/patlux/pi-commandcode-provider). Thanks to Pat Woz and every upstream contributor who built and tested the original integration.

## License

[MIT](LICENSE) © Pat Woz and contributors.
