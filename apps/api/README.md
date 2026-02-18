# API Service

Backend API service with AngelOne SmartAPI authentication integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your `ANGELONE_API_KEY` and other configuration values

## Development

```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with client code, password, and TOTP.

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

#### POST `/api/auth/generate-token`
Generate new tokens using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

**Headers:**
- `Authorization: Bearer <jwt_token>` (optional)

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

#### GET `/api/auth/profile`
Get user profile information.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

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

#### GET `/health`
Check if the API service is running.

**Response:**
```json
{
  "status": "ok",
  "message": "API service is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Project Structure

```
apps/api/
├── src/
│   ├── config/
│   │   └── angelone.config.ts    # AngelOne API configuration
│   ├── routes/
│   │   └── auth.routes.ts         # Authentication routes
│   ├── services/
│   │   └── angelone.service.ts    # AngelOne API service
│   ├── types/
│   │   └── angelone.types.ts      # TypeScript type definitions
│   └── index.ts                    # Main server file
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

- `ANGELONE_API_KEY` - Your AngelOne API key (required)
- `ANGELONE_BASE_URL` - AngelOne API base URL (default: https://apiconnect.angelone.in)
- `CLIENT_LOCAL_IP` - Client local IP address (optional)
- `CLIENT_PUBLIC_IP` - Client public IP address (optional)
- `MAC_ADDRESS` - MAC address (optional)
- `PORT` - Server port (default: 3001)

