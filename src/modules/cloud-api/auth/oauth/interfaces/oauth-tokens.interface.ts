export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  idToken?: string; // For OpenID Connect providers
}

export interface OAuthTokenRequest {
  code: string;
  clientId: string;
  clientSecret?: string; // Not used for PKCE flow
  redirectUri: string;
  grantType: 'authorization_code';
  codeVerifier?: string; // For PKCE
}

export interface OAuthTokenExchangePayload {
  code: string;
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  grant_type: 'authorization_code';
  code_verifier?: string;
}

export interface FacebookTokenParams {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  code_verifier?: string;
}

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
