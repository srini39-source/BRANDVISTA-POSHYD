/* ==========================================================================
   BrandVista POS — Neon Auth integration
   Wraps @neondatabase/neon-js's auth client (Better Auth under the hood) so
   every page can: check/require a session, show the signed-in user's name,
   and sign out. Loaded as an ES module — see note in index.html about
   serving this site over http:// instead of opening the file directly,
   since browsers block module imports on file:// pages.
   ========================================================================== */

import { createAuthClient } from 'https://esm.sh/@neondatabase/neon-js/auth';

// Your project's Neon Auth Base URL (Neon Console → project → Auth →
// Configuration tab). Registered users are synced into the neon_auth.user
// table in your Neon Postgres database automatically.
const NEON_AUTH_URL = 'https://ep-round-frog-ahyb16cw.neonauth.c-3.us-east-1.aws.neon.tech/neondb/auth';

export const authClient = createAuthClient(NEON_AUTH_URL);

/**
 * Reads the current session. Returns { session, user } on success, or null
 * if nobody is signed in. Does not redirect — use requireAuth() for that.
 */
export async function getCurrentSession() {
  try {
    const { data } = await authClient.getSession();
    if (data?.session && data?.user) return data;
    return null;
  } catch (err) {
    console.error('Neon Auth: failed to read session', err);
    return null;
  }
}

/**
 * Guards a page: if nobody is signed in, redirects to the login page and
 * resolves to null. If signed in, resolves to the { session, user } data so
 * the caller can populate the UI. Call this at the top of every protected
 * page's module script.
 */
export async function requireAuth() {
  const data = await getCurrentSession();
  if (!data) {
    window.location.href = 'index.html';
    return null;
  }
  return data;
}

/** Builds 1-2 letter initials from a display name or email address. */
function initialsFrom(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

/**
 * Populates every element carrying data-user-name / data-user-initials /
 * data-user-email with the signed-in user's details, and wires up every
 * [data-sign-out] element (links or buttons) to actually sign out.
 */
export function initAuthUI(session) {
  const user = session?.user;
  if (!user) return;

  const displayName = user.name || user.email;
  document.querySelectorAll('[data-user-name]').forEach((el) => (el.textContent = displayName));
  document.querySelectorAll('[data-user-email]').forEach((el) => (el.textContent = user.email));
  document.querySelectorAll('[data-user-initials]').forEach((el) => (el.textContent = initialsFrom(displayName)));

  document.querySelectorAll('[data-sign-out]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      await authClient.signOut();
      window.location.href = 'index.html';
    });
  });
}

/** Convenience one-liner for protected pages: guard, then populate the UI. */
export async function protectPage() {
  const session = await requireAuth();
  if (session) initAuthUI(session);
  return session;
}
