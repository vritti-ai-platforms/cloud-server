/**
 * OAuth token response from provider
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  idToken?: string; // For OpenID Connect providers
}

/**
 * OAuth token exchange request (typed interface)
 */
export interface OAuthTokenRequest {
  code: string;
  clientId: string;
  clientSecret?: string; // Not used for PKCE flow
  redirectUri: string;
  grantType: 'authorization_code';
  codeVerifier?: string; // For PKCE
}

/**
 * OAuth token exchange payload (snake_case for API requests)
 * Used when sending POST requests to OAuth providers
 */
export interface OAuthTokenExchangePayload {
  code: string;
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  grant_type: 'authorization_code';
  code_verifier?: string;
}

/**
 * Facebook OAuth token query params
 * Facebook uses GET request with query params (no grant_type)
 */
export interface FacebookTokenParams {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  code_verifier?: string;
}

/**
 * Apple ID token payload structure
 * Decoded from JWT returned by Apple OAuth
 */
export interface AppleIdTokenPayload {
  iss: string; // Issuer (https://appleid.apple.com)
  aud: string; // Client ID
  exp: number; // Expiration time
  iat: number; // Issued at
  sub: string; // User's unique Apple ID
  email: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  auth_time?: number;
  nonce_supported?: boolean;
}
