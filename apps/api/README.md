# API Service

Backend API service for broker wrapper with AngelOne integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your AngelOne API credentials:
- `ANGEL_ONE_API_KEY`: Your AngelOne API key
- `ANGEL_ONE_BASE_URL`: AngelOne API base URL (default: https://apiconnect.angelone.in)
- `PORT`: Server port (default: 3000)

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production Server

```bash
npm start
```

## API Endpoints

### Authentication Endpoints

#### 1. Login
**POST** `/api/auth/login`

Authenticate with AngelOne using client code, PIN, and TOTP.

**Request Body:**
```json
{
  "clientcode": "Your_client_code",
  "password": "Your_pin",
  "totp": "enter_the_code_displayed_on_your_authenticator_app",
  "state": "optional_state_variable"
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "feedToken": "eyJhbGciOiJIUzUxMiJ9...",
    "state": "live"
  }
}
```

#### 2. Generate Token
**POST** `/api/auth/generate-token`

Generate new tokens using refresh token.

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "feedToken": "eyJhbGciOiJIUzUxMiJ9..."
  }
}
```

#### 3. Get Profile
**GET** `/api/auth/profile`

Get user profile information.

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "clientcode": "YOUR_CLIENT_CODE",
    "name": "YOUR_NAME",
    "email": "",
    "mobileno": "",
    "exchanges": ["NSE", "BSE", "MCX", "CDS", "NCDEX", "NFO"],
    "products": ["DELIVERY", "INTRADAY", "MARGIN"],
    "lastlogintime": "",
    "brokerid": "B2C"
  }
}
```

### Health Check

**GET** `/health`

Returns server status.

## Architecture

The API follows a modular architecture:

- **`src/config/`** - Configuration files (API keys, endpoints)
- **`src/controllers/`** - Request handlers
- **`src/middleware/`** - Middleware functions (error handling, validation)
- **`src/routes/`** - Route definitions
- **`src/services/`** - Business logic and external API calls
- **`src/types/`** - TypeScript type definitions
- **`src/websocket/`** - WebSocket handlers (for future use)

