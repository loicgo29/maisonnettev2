import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';

const authority =
  import.meta.env.VITE_AUTHENTIK_AUTHORITY ||
  'http://localhost:9000/application/o/maisonnettev2/';
const clientId = import.meta.env.VITE_AUTHENTIK_CLIENT_ID || 'maisonnettev2';

export const userManager = new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  stateStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  loadUserInfo: true,
  // PKCE is enabled by default in oidc-client-ts
  revokeAccessTokenOnSignout: true,
});

userManager.events.addUserLoaded(() => {
  console.log('[OIDC] User loaded');
});

userManager.events.addUserUnloaded(() => {
  console.log('[OIDC] User unloaded');
});

userManager.events.addAccessTokenExpiring(() => {
  console.log('[OIDC] Access token expiring, attempting silent renew');
});

userManager.events.addAccessTokenExpired(() => {
  console.log('[OIDC] Access token expired');
});

userManager.events.addSilentRenewError((err) => {
  console.error('[OIDC] Silent renew error:', err);
});

export async function getUser(): Promise<User | null> {
  try {
    return await userManager.getUser();
  } catch (err) {
    console.error('Error getting user:', err);
    return null;
  }
}

export async function getAuthHeaders() {
  const user = await getUser();
  if (!user) return {};
  return {
    Authorization: `Bearer ${user.access_token}`,
  };
}

export async function login() {
  try {
    await userManager.signinRedirect();
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
}

export async function logout() {
  try {
    await userManager.signoutRedirect();
  } catch (err) {
    console.error('Logout error:', err);
    throw err;
  }
}

export async function handleCallback() {
  try {
    return await userManager.signinCallback();
  } catch (err) {
    console.error('Callback error:', err);
    throw err;
  }
}
