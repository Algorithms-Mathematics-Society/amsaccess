/**
 * Cognito authentication, server-side only.
 *
 * The portal talks to Cognito with `USER_PASSWORD_AUTH` from the server, not
 * the browser. There is no hosted-UI domain yet, and this keeps the password
 * on one hop between the form post and Cognito rather than shipping an SDK
 * and a client id into the page.
 *
 * The returned ID token is **verified**, not decoded. A token this side has
 * not checked the signature of is just a string the caller chose, and
 * everything downstream — the `ams_subject` cookie, the API's trust in it —
 * rests on that check being real.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createRemoteJWKSet, jwtVerify } from "jose";

const REGION = process.env.AMS_AWS_REGION ?? "ap-south-1";
const USER_POOL_ID = process.env.AMS_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID = process.env.AMS_COGNITO_CLIENT_ID ?? "";

const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

export type Claims = {
  subject: string;
  email: string;
  displayName: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 401,
  ) {
    super(message);
  }
}

export function cognitoConfigured(): boolean {
  return Boolean(USER_POOL_ID && CLIENT_ID);
}

let client: CognitoIdentityProviderClient | null = null;
function idp(): CognitoIdentityProviderClient {
  client ??= new CognitoIdentityProviderClient({ region: REGION });
  return client;
}

// Cached across requests: the JWKS is stable, and re-fetching it on every
// sign-in would make Cognito's availability a hard dependency of every login.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function keySet() {
  jwks ??= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
  return jwks;
}

/** Verify a Cognito ID token and return the claims worth acting on. */
export async function verifyIdToken(token: string): Promise<Claims> {
  const { payload } = await jwtVerify(token, keySet(), {
    issuer: ISSUER,
    audience: CLIENT_ID,
  });

  // An access token carries the same signature and issuer as an ID token, so
  // the signature alone does not tell them apart. Only an ID token asserts
  // who the user *is*; accepting an access token here would let a token
  // minted for a different purpose stand in for identity.
  if (payload.token_use !== "id") {
    throw new AuthError("Not an identity token.", "WRONG_TOKEN_USE");
  }

  const subject = typeof payload.sub === "string" ? payload.sub : "";
  if (!subject) throw new AuthError("Token has no subject.", "NO_SUBJECT");

  const email = typeof payload.email === "string" ? payload.email : "";
  const name = typeof payload.name === "string" ? payload.name : "";
  const preferred =
    typeof payload.preferred_username === "string" ? payload.preferred_username : "";

  return {
    subject,
    email,
    displayName: name || preferred || email.split("@")[0] || subject.slice(0, 8),
  };
}

/** Cognito's error names are not user-facing text; translate the ones we expect. */
function friendly(err: unknown): AuthError {
  const name = (err as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAuthorizedException":
      return new AuthError("Incorrect email or password.", "BAD_CREDENTIALS");
    case "UserNotFoundException":
      // Deliberately the same message as a wrong password: distinguishing
      // them tells an attacker which addresses are registered.
      return new AuthError("Incorrect email or password.", "BAD_CREDENTIALS");
    case "UserNotConfirmedException":
      return new AuthError("Confirm your email address first.", "UNCONFIRMED", 403);
    case "PasswordResetRequiredException":
      return new AuthError("Reset your password to continue.", "RESET_REQUIRED", 403);
    case "TooManyRequestsException":
    case "LimitExceededException":
      return new AuthError("Too many attempts. Wait a moment.", "RATE_LIMITED", 429);
    case "UsernameExistsException":
      return new AuthError("That email is already registered.", "ALREADY_EXISTS", 409);
    case "InvalidPasswordException":
      return new AuthError("That password does not meet the policy.", "WEAK_PASSWORD", 400);
    case "CodeMismatchException":
      return new AuthError("That confirmation code is not right.", "BAD_CODE", 400);
    case "ExpiredCodeException":
      return new AuthError("That code has expired. Request a new one.", "EXPIRED_CODE", 400);
    default:
      return new AuthError("Could not sign you in.", "AUTH_FAILED", 502);
  }
}

export async function signIn(email: string, password: string): Promise<Claims> {
  if (!cognitoConfigured()) {
    throw new AuthError("Sign-in is not configured.", "NOT_CONFIGURED", 503);
  }

  let idToken: string | undefined;
  try {
    const res = await idp().send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    );
    // A challenge (new password required, MFA) is not a failure, but this
    // flow cannot answer it — say so rather than reporting bad credentials.
    if (res.ChallengeName) {
      throw new AuthError(
        `This account needs ${res.ChallengeName} before it can sign in.`,
        "CHALLENGE_REQUIRED",
        403,
      );
    }
    idToken = res.AuthenticationResult?.IdToken;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw friendly(err);
  }

  if (!idToken) throw new AuthError("Cognito returned no identity token.", "NO_TOKEN", 502);
  return verifyIdToken(idToken);
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ confirmed: boolean }> {
  if (!cognitoConfigured()) {
    throw new AuthError("Sign-up is not configured.", "NOT_CONFIGURED", 503);
  }
  try {
    const res = await idp().send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          ...(displayName ? [{ Name: "name", Value: displayName }] : []),
        ],
      }),
    );
    return { confirmed: Boolean(res.UserConfirmed) };
  } catch (err) {
    throw friendly(err);
  }
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  try {
    await idp().send(
      new ConfirmSignUpCommand({ ClientId: CLIENT_ID, Username: email, ConfirmationCode: code }),
    );
  } catch (err) {
    throw friendly(err);
  }
}

export async function resendCode(email: string): Promise<void> {
  try {
    await idp().send(new ResendConfirmationCodeCommand({ ClientId: CLIENT_ID, Username: email }));
  } catch (err) {
    throw friendly(err);
  }
}
