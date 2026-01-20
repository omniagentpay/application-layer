# Antigravity Development Tooling

This directory contains configuration files for Antigravity AI agent development tooling.

## MCP Configuration (`mcp_config.json`)

**This MCP is for developer tooling only (Antigravity / codegen). Not used at runtime.**

The `mcp_config.json` file configures MCP servers that Antigravity can use for:
- Code generation assistance
- API usage examples (Circle, x402, etc.)
- Development guidance

### Configured Servers

- **circle**: Circle's codegen MCP server for API documentation and examples
  - URL: `https://api.circle.com/v1/codegen/mcp`
  - Type: HTTP MCP server
  - Use case: Query Circle API examples, x402 payment patterns, wallet management code

### Important Notes

⚠️ **These MCPs are NOT used by the application at runtime**

- No application code imports or calls these servers
- No runtime environment variables reference these configs
- Zero production impact
- Purely for AI-assisted development

### Usage

Antigravity automatically discovers this config file and makes the MCP servers available during development sessions. You can query the Circle MCP for coding help like:

- "How do I create a Circle wallet using the Circle API?"
- "Show me an example of x402 payment integration"
- "What are the Circle Web3 Services API endpoints?"
