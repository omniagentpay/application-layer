# Entity Secret Setup Guide

## What is ENTITY_SECRET?

The `ENTITY_SECRET` is a 32-byte (64 hex characters) private key required by Circle to sign wallet operations. It must be a valid hexadecimal string.

## Format Requirements

- **Length**: Exactly 64 characters
- **Format**: Hexadecimal (0-9, a-f)
- **Example**: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

## Setup Options

### Option 1: Auto-Generation (Recommended)

The SDK can auto-generate and register the entity secret if it's not set:

1. **Remove** `ENTITY_SECRET` from your `.env` file (or don't set it)
2. Run the setup script: `python scripts/setup_agent_wallet.py`
3. The SDK will automatically:
   - Generate a new 64-character hex secret
   - Register it with Circle
   - Save it to `.env` file
   - Save a recovery file to `~/.config/omniagentpay/`

### Option 2: Manual Generation

If you want to generate it manually:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Then add to `.env`:
```
ENTITY_SECRET=<generated_64_char_hex_string>
```

### Option 3: Use Existing Secret

If you already have a valid entity secret from a previous setup:

1. Copy the 64-character hex string
2. Add to `.env`:
   ```
   ENTITY_SECRET=<your_64_char_hex_string>
   ```

## Validation

The setup script validates the entity secret format. If it's invalid, you'll see:

```
⚠️  WARNING: ENTITY_SECRET must be 64 hex characters, got X
```

**Common Issues:**

1. **Wrong length**: Must be exactly 64 characters
2. **Invalid characters**: Must be hexadecimal (0-9, a-f only)
3. **Extra whitespace**: Remove any spaces or newlines
4. **Missing prefix**: No "0x" prefix needed (just the hex string)

## Recovery

If you lose your entity secret:

1. Check the recovery file in `~/.config/omniagentpay/recovery_file_*.dat`
2. Or check your `.env` file for the auto-generated value
3. If both are lost, generate a new one and re-register with Circle

## Troubleshooting

### Error: "non-hexadecimal number found in fromhex()"

This means your `ENTITY_SECRET` is not valid hexadecimal. 

**Fix:**
1. Remove `ENTITY_SECRET` from `.env`
2. Let the SDK auto-generate it
3. Or generate a new one manually using the command above

### Error: "Entity Secret must be 64 hex characters"

Your secret is the wrong length.

**Fix:**
- Generate a new one: `python -c "import secrets; print(secrets.token_hex(32))"`
- Ensure it's exactly 64 characters (no spaces, no newlines)

## Security Notes

- **Never commit** `ENTITY_SECRET` to version control
- Store it securely (use `.env` file, not in code)
- Keep the recovery file safe
- Rotate if compromised
