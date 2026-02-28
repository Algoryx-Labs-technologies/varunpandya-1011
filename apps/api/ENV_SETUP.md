# Environment Variables Setup Guide

## Quick Setup

Create a `.env` file in the `apps/api` directory with the following variables:

## Required Environment Variables

### Application Authentication
```env
AUTH_USERNAME=your_app_username
AUTH_PASSWORD=your_app_password
```

### AngelOne API Keys - Trading (varuntrade)
```env
ANGELONE_TRADING_API_KEY=your_trading_api_key_from_varuntrade_app
ANGELONE_TRADING_SECRET_KEY=your_trading_secret_key_from_varuntrade_app
```

### AngelOne API Keys - Publisher
```env
ANGELONE_PUBLISHER_API_KEY=your_publisher_api_key_from_publisher_app
ANGELONE_PUBLISHER_SECRET_KEY=your_publisher_secret_key_from_publisher_app
```

### AngelOne API Keys - Historical
```env
ANGELONE_HISTORICAL_API_KEY=your_historical_api_key_from_historical_app
ANGELONE_HISTORICAL_SECRET_KEY=your_historical_secret_key_from_historical_app
```

### AngelOne API Keys - Market (marketFeed)
```env
ANGELONE_MARKET_API_KEY=your_market_api_key_from_marketFeed_app
ANGELONE_MARKET_SECRET_KEY=your_market_secret_key_from_marketFeed_app
```

## Optional Environment Variables

```env
# Server port (default: 3001)
PORT=3001

# AngelOne API base URL (default: https://apiconnect.angelone.in)
ANGELONE_BASE_URL=https://apiconnect.angelone.in

# Default API type to use: Trading, Publisher, Historical, or Market (default: Trading)
ANGELONE_DEFAULT_API_TYPE=Trading

# Optional network information
CLIENT_LOCAL_IP=127.0.0.1
CLIENT_PUBLIC_IP=
MAC_ADDRESS=
```

## Complete Example .env File

```env
# Server Configuration
PORT=3001

# Application Authentication
AUTH_USERNAME=myapp_user
AUTH_PASSWORD=myapp_password_123

# AngelOne API Base URL
ANGELONE_BASE_URL=https://apiconnect.angelone.in

# AngelOne API Keys - Trading (varuntrade)
ANGELONE_TRADING_API_KEY=abc123xyz456
ANGELONE_TRADING_SECRET_KEY=secret123xyz789

# AngelOne API Keys - Publisher
ANGELONE_PUBLISHER_API_KEY=def456uvw789
ANGELONE_PUBLISHER_SECRET_KEY=secret456uvw012

# AngelOne API Keys - Historical
ANGELONE_HISTORICAL_API_KEY=ghi789rst012
ANGELONE_HISTORICAL_SECRET_KEY=secret789rst345

# AngelOne API Keys - Market (marketFeed)
ANGELONE_MARKET_API_KEY=jkl012mno345
ANGELONE_MARKET_SECRET_KEY=secret012mno678

# Default API Type (optional)
ANGELONE_DEFAULT_API_TYPE=Trading
```

## How to Get Your API Keys

1. Log in to your AngelOne Smart APIs & Apps dashboard
2. For each app in your dashboard:
   - **varuntrade** (Trading): Click the eye icon to reveal API KEY and SECRET KEY
   - **publisher** (Publisher): Click the eye icon to reveal API KEY and SECRET KEY
   - **historical** (Historical): Click the eye icon to reveal API KEY and SECRET KEY
   - **marketFeed** (Market): Click the eye icon to reveal API KEY and SECRET KEY
3. Copy each API KEY and SECRET KEY to the corresponding environment variable in your `.env` file

## Notes

- All 8 API keys (4 API keys + 4 Secret keys) are **required** for the application to start
- The application will validate that all keys are present on startup
- The default API type is "Trading" if not specified
- Make sure your `.env` file is in the `apps/api` directory
- Never commit your `.env` file to version control (it should be in `.gitignore`)

