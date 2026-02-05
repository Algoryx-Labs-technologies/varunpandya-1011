// AngelOne API configuration

export const ANGEL_ONE_CONFIG = {
  BASE_URL: process.env.ANGEL_ONE_BASE_URL || 'https://apiconnect.angelone.in',
  API_KEY: process.env.ANGEL_ONE_API_KEY || '',
  ENDPOINTS: {
    LOGIN: '/rest/auth/angelbroking/user/v1/loginByPassword',
    GENERATE_TOKEN: '/rest/auth/angelbroking/jwt/v1/generateTokens',
    PROFILE: '/rest/auth/angelbroking/user/v1/getProfile',
    GET_HOLDING: '/rest/secure/angelbroking/portfolio/v1/getHolding',
    GET_ALL_HOLDING: '/rest/secure/angelbroking/portfolio/v1/getAllHolding',
    GET_POSITION: '/rest/secure/angelbroking/order/v1/getPosition',
    CONVERT_POSITION: '/rest/secure/angelbroking/order/v1/convertPosition',
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
  },
};

