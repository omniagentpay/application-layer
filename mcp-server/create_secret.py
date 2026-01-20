from omniagentpay.onboarding import quick_setup
import os

# Get Circle API key from environment variable (never hardcode real keys)
CIRCLE_API_KEY = os.environ.get("CIRCLE_API_KEY")

if __name__ == "__main__":
    print("--- OmniAgentPay Quick Onboarding ---")
    
    if not CIRCLE_API_KEY:
        print("❌ Error: CIRCLE_API_KEY environment variable is not set.")
        print("   Please set it before running this script:")
        print("   export CIRCLE_API_KEY='your-api-key'")
        print("   # or on Windows:")
        print("   $env:CIRCLE_API_KEY='your-api-key'")
        exit(1)
    
    try:
        # This will:
        # 1. Generate a new secure Entity Secret
        # 2. Register it with Circle's API
        # 3. Create/Update your .env file
        # 4. Save a recovery backup file locally
        quick_setup(CIRCLE_API_KEY)
        
        print("\n✅ Setup Complete!")
        print("Your .env has been updated. Please restart your MCP server.")
        
    except Exception as e:
        print(f"\n❌ Setup Failed: {e}")