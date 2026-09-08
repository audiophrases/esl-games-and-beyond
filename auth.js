/* ==========================================================================
   ESL Games and Beyond — admin sign-in (Google)

   Same Google OAuth client as English Hub and PinPlay, so there is only one
   client to keep in step. The client ID is public by design; it ships in the
   page.

   ONE-TIME SETUP — the origin must be authorised or the button 400s:

     1. Open  https://console.cloud.google.com/apis/credentials
     2. Open the Web client ending  ...8aacskg99idu0uqnbr181id33gf8fet4
     3. Under "Authorised JavaScript origins" make sure these are listed:
            https://audiophrases.github.io
            http://127.0.0.1:8080          (only for local testing)
        Add, don't replace — PinPlay and English Hub share this client.

   This is a public static site, so the check runs in the browser and is a
   courtesy lock, not real security. It keeps the admin controls out of the
   way of students; it does not protect anything secret. Everything this
   catalog holds is public anyway — the real gate on publishing is the GitHub
   token, which lives only in the tab that typed it.
   ========================================================================== */

const ADMIN_CLIENT_ID = '673678320233-8aacskg99idu0uqnbr181id33gf8fet4.apps.googleusercontent.com';

// Lowercase only — the address from Google is lowercased before comparing.
const ADMIN_ALLOWED_EMAILS = [
    'eugenimonfort@iecomaruga.cat',
    'eugenime@gmail.com',
    'emonfor3@xtec.cat'
];

// Distinct from English Hub's key: both sites sit on audiophrases.github.io
// and therefore share one sessionStorage.
const ADMIN_AUTH_KEY = 'eslAdminEmail';

/* -------------------------------------------------------------------------- */

function adminSignedInEmail() {
    try { return sessionStorage.getItem(ADMIN_AUTH_KEY); } catch (e) { return null; }
}

function adminIsSignedIn() {
    const email = adminSignedInEmail();
    return !!email && ADMIN_ALLOWED_EMAILS.indexOf(email) !== -1;
}

function adminSignOut() {
    try { sessionStorage.removeItem(ADMIN_AUTH_KEY); } catch (e) {}
    try { sessionStorage.removeItem('eslGithubToken'); } catch (e) {}
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
    location.reload();
}

// Reads the payload out of the Google ID token (a JWT: header.payload.signature).
function adminDecodeJwt(token) {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    b64 += '='.repeat((4 - (b64.length % 4)) % 4);
    try {
        const json = decodeURIComponent(atob(b64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function adminShowAuthError(message) {
    const box = document.getElementById('auth-error');
    if (box) {
        box.textContent = message;
        box.hidden = false;
    } else {
        alert(message);
    }
}

// Google calls this with the signed credential once an account is picked.
function adminHandleCredential(response) {
    const payload = adminDecodeJwt(response && response.credential);

    if (!payload || payload.aud !== ADMIN_CLIENT_ID || payload.email_verified === false) {
        adminShowAuthError('That sign-in could not be verified. Please try again.');
        return;
    }

    const email = String(payload.email || '').toLowerCase();
    if (ADMIN_ALLOWED_EMAILS.indexOf(email) === -1) {
        adminShowAuthError(email
            ? email + ' is not an admin account for this site.'
            : 'That account is not an admin account for this site.');
        return;
    }

    try { sessionStorage.setItem(ADMIN_AUTH_KEY, email); } catch (e) {}
    if (typeof window.onAdminAuthSuccess === 'function') window.onAdminAuthSuccess(email);
}

// The GSI library loads async, so wait for it rather than assuming it is there.
function adminWhenGsiReady(onReady, onTimeout) {
    let waited = 0;
    (function check() {
        if (window.google && google.accounts && google.accounts.id) { onReady(); return; }
        waited += 100;
        if (waited >= 8000) { if (onTimeout) onTimeout(); return; }
        setTimeout(check, 100);
    })();
}

let adminGsiInitialised = false;

// Draws the real Google button into the element with the given id.
// Call it only once the container is visible — a hidden container renders 0px wide.
function adminRenderSignIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    adminWhenGsiReady(function () {
        if (!adminGsiInitialised) {
            google.accounts.id.initialize({
                client_id: ADMIN_CLIENT_ID,
                callback: adminHandleCredential,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            adminGsiInitialised = true;
        }
        container.innerHTML = '';
        google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 260
        });
    }, function () {
        container.textContent = 'Could not reach Google Sign-In. Check the connection and reload.';
    });
}
