// AngelOne API configuration

export const ANGEL_ONE_CONFIG = {
  BASE_URL: process.env.ANGEL_ONE_BASE_URL || 'https://apiconnect.angelone.in',
  API_KEY: process.env.ANGEL_ONE_API_KEY || '',
  ENDPOINTS: {
    LOGIN: '/rest/auth/angelbroking/user/v1/loginByPassword',
    GENERATE_TOKEN: '/rest/auth/angelbroking/jwt/v1/generateTokens',
    PROFILE: '/rest/auth/angelbroking/user/v1/getProfile',
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
  },
};

