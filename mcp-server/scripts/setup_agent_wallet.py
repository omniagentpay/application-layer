#!/usr/bin/env python3
"""
Setup script to create the agent Circle wallet for autonomous payments.

This script:
1. Creates a Circle Developer-Controlled Wallet
2. Applies default guard policies
3. Outputs the wallet ID to be set as AGENT_CIRCLE_WALLET_ID in .env

Run this once before starting the server:
    python scripts/setup_agent_wallet.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.payments.omni_client import OmniAgentPaymentClient
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

def validate_entity_secret(entity_secret: str | None) -> tuple[bool, str | None]:
    """
    Validate entity secret format.
    Returns (is_valid, error_message)
    """
    if not entity_secret:
        return (False, "ENTITY_SECRET not set")
    
    entity_secret_str = entity_secret.get_secret_value() if hasattr(entity_secret, 'get_secret_value') else str(entity_secret)
    
    # Check length (must be 64 hex characters = 32 bytes)
    if len(entity_secret_str) != 64:
        return (False, f"ENTITY_SECRET must be 64 hex characters, got {len(entity_secret_str)}")
    
    # Check if it's valid hexadecimal
    try:
        int(entity_secret_str, 16)
    except ValueError:
        return (False, "ENTITY_SECRET must be valid hexadecimal (0-9, a-f)")
    
    return (True, None)

async def main():
    """Create agent wallet and output wallet ID."""
    print("🚀 Setting up agent Circle wallet for autonomous payments...")
    
    # Check if Circle API key is configured
    if not settings.CIRCLE_API_KEY:
        print("❌ ERROR: CIRCLE_API_KEY not set in .env file")
        print("   Please set CIRCLE_API_KEY in your .env file")
        sys.exit(1)
    
    # Validate ENTITY_SECRET if set
    entity_secret_valid, entity_secret_error = validate_entity_secret(settings.ENTITY_SECRET)
    
    if not entity_secret_valid:
        print(f"⚠️  WARNING: {entity_secret_error}")
        print("\n   The ENTITY_SECRET must be a 64-character hexadecimal string (32 bytes).")
        print("   Example format: a1b2c3d4e5f6... (64 hex characters)")
        print("\n   Options:")
        print("   1. Remove ENTITY_SECRET from .env to let the SDK auto-generate it")
        print("   2. Generate a new one: python -c \"import secrets; print(secrets.token_hex(32))\"")
        print("   3. Fix the existing value in .env file")
        print("\n   If you remove it, the SDK will auto-generate and register it on first use.")
        
        # Check if we should proceed anyway (maybe user wants to fix it manually)
        response = input("\n   Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("   Exiting. Please fix ENTITY_SECRET and try again.")
            sys.exit(1)
        
        # Clear ENTITY_SECRET from environment so SDK can auto-generate
        print("   Clearing invalid ENTITY_SECRET from environment...")
        os.environ.pop('ENTITY_SECRET', None)
        # Also temporarily clear from settings
        settings.ENTITY_SECRET = None
        print("   SDK will auto-generate and register ENTITY_SECRET on first use...")
    
    try:
        # Get client instance (will auto-generate ENTITY_SECRET if not set)
        print("\n   Initializing SDK (this may auto-generate ENTITY_SECRET)...")
        client = await OmniAgentPaymentClient.get_instance()
        
        # Create agent wallet with guards
        print("📦 Creating Circle wallet for AI agent...")
        wallet_info = await client.create_agent_wallet("omniagentpay-agent-treasury")
        
        wallet_id = wallet_info["wallet_id"]
        wallet_address = wallet_info["address"]
        
        print(f"✅ Agent wallet created successfully!")
        print(f"   Wallet ID: {wallet_id}")
        print(f"   Address: {wallet_address}")
        print(f"   Blockchain: {wallet_info.get('blockchain', 'arc-testnet')}")
        
        # Update .env file
        env_path = Path(__file__).parent.parent / ".env"
        env_content = ""
        
        if env_path.exists():
            env_content = env_path.read_text()
        
        # Check if AGENT_CIRCLE_WALLET_ID already exists
        if "AGENT_CIRCLE_WALLET_ID" in env_content:
            # Update existing value
            lines = env_content.split("\n")
            updated_lines = []
            for line in lines:
                if line.startswith("AGENT_CIRCLE_WALLET_ID="):
                    updated_lines.append(f"AGENT_CIRCLE_WALLET_ID={wallet_id}")
                else:
                    updated_lines.append(line)
            env_content = "\n".join(updated_lines)
        else:
            # Append new line
            if env_content and not env_content.endswith("\n"):
                env_content += "\n"
            env_content += f"\n# Agent Circle Wallet for autonomous payments\nAGENT_CIRCLE_WALLET_ID={wallet_id}\n"
        
        env_path.write_text(env_content)
        
        print(f"\n✅ Added AGENT_CIRCLE_WALLET_ID to .env file")
        print(f"\n📝 Next steps:")
        print(f"   1. Fund the wallet with USDC on Arc Testnet")
        print(f"   2. Restart the server to use the new wallet")
        print(f"\n💰 To fund the wallet, send USDC to: {wallet_address}")
        
    except Exception as e:
        print(f"❌ Failed to create agent wallet: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
