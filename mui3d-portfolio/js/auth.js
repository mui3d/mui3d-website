const config = window.Mui3DConfig?.supabase ?? {};
const isConfigured = Boolean(config.url && config.publishableKey);
let supabase;
let supabaseLoad;

export async function getSupabase() {
  if (!isConfigured) return null;
  if (supabase) return supabase;
  if (!supabaseLoad) {
    supabaseLoad = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({ createClient }) => {
      supabase = createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return supabase;
    });
  }
  return supabaseLoad;
}

const dialog = document.getElementById('auth-dialog');
const trigger = document.getElementById('account-trigger');
const triggerLabel = document.getElementById('account-trigger-label');
const closeButton = document.getElementById('auth-close');
const formView = document.getElementById('auth-form-view');
const messageView = document.getElementById('auth-message-view');
const accountView = document.getElementById('auth-account-view');
const form = document.getElementById('auth-form');
const title = document.getElementById('auth-title');
const intro = document.getElementById('auth-intro');
const emailInput = document.getElementById('auth-email');
const passwordField = document.getElementById('auth-password-field');
const passwordInput = document.getElementById('auth-password');
const confirmField = document.getElementById('auth-confirm-field');
const confirmInput = document.getElementById('auth-confirm-password');
const feedback = document.getElementById('auth-feedback');
const resendButton = document.getElementById('auth-resend');
const submitButton = document.getElementById('auth-submit');
const forgotButton = document.getElementById('auth-forgot');
const switchCopy = document.getElementById('auth-switch-copy');
const switchButton = document.getElementById('auth-switch');
const messageTitle = document.getElementById('auth-message-title');
const messageCopy = document.getElementById('auth-message-copy');
const returnLoginButton = document.getElementById('auth-return-login');
const accountEmail = document.getElementById('auth-account-email');
const accountFeedback = document.getElementById('auth-account-feedback');
const logoutButton = document.getElementById('auth-logout');
const googleButton = document.getElementById('auth-google');
const googleOptions = document.getElementById('auth-google-options');
let authBusy = false;

function googleRedirectUrl() {
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return `${local ? window.location.origin : 'https://mui3d.com'}/store/diabolo.html`;
}

let mode = 'login';
let currentUser = null;
let lastFocusedElement = null;
let pendingVerificationEmail = '';

function readAuthCallbackError() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
  const keys = ['error', 'error_code', 'error_description'];
  const code = url.searchParams.get('error_code') || hashParams.get('error_code');
  const error = url.searchParams.get('error') || hashParams.get('error');
  const description = url.searchParams.get('error_description') || hashParams.get('error_description');

  if (!code && !error && !description) return null;

  keys.forEach((key) => {
    url.searchParams.delete(key);
    hashParams.delete(key);
  });
  const remainingHash = hashParams.toString();
  url.hash = remainingHash ? `#${remainingHash}` : '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

  return { code, error, description };
}

const callbackError = readAuthCallbackError();

function showOnly(view) {
  formView.hidden = view !== 'form';
  messageView.hidden = view !== 'message';
  accountView.hidden = view !== 'account';
}

function setFeedback(message, type = '') {
  feedback.textContent = message;
  feedback.dataset.type = type;
}

function hideResend() {
  pendingVerificationEmail = '';
  resendButton.hidden = true;
  resendButton.disabled = false;
}

function setBusy(isBusy, label) {
  authBusy = isBusy;
  googleButton.disabled = isBusy;
  switchButton.disabled = isBusy;
  forgotButton.disabled = isBusy;
  form.querySelectorAll('input, button').forEach((element) => {
    element.disabled = isBusy;
  });
  submitButton.textContent = isBusy ? label : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Log In';
}

function setMode(nextMode) {
  if (authBusy) return;
  mode = nextMode;
  form.reset();
  setFeedback('');
  hideResend();
  showOnly('form');

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  googleOptions.hidden = isForgot;
  title.textContent = isRegister ? 'Create your Mui3D account' : isForgot ? 'Reset password' : 'Log in';
  intro.textContent = isRegister
    ? 'Create an account with your email and password.'
    : isForgot
      ? 'Enter your email and we will send a secure reset link.'
      : 'Continue to the Mui3D experience.';
  passwordField.hidden = isForgot;
  confirmField.hidden = !isRegister;
  passwordInput.required = !isForgot;
  confirmInput.required = isRegister;
  passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  submitButton.textContent = isRegister ? 'Create Account' : isForgot ? 'Send Reset Link' : 'Log In';
  forgotButton.hidden = isForgot || isRegister;
  switchCopy.firstChild.textContent = isRegister ? 'Already have an account? ' : isForgot ? 'Remembered your password? ' : "Don't have an account? ";
  switchButton.textContent = isRegister || isForgot ? 'Log in' : 'Create account';
}

function showMessage(heading, copy) {
  messageTitle.textContent = heading;
  messageCopy.textContent = copy;
  showOnly('message');
  returnLoginButton.focus();
}

function updateAccount(user) {
  currentUser = user;
  trigger.classList.toggle('is-signed-in', Boolean(user));
  triggerLabel.textContent = user?.email || 'Account / Sign In';
  accountEmail.textContent = user?.email || '';
  // Defer consumers so database calls run outside Supabase's auth callback lock.
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('mui3d:auth', { detail: { user: currentUser } })), 0);
}

export function getAuthUser() { return currentUser; }

export function requestSignIn(message) {
  openDialog();
  setFeedback(message);
}

function openDialog() {
  lastFocusedElement = document.activeElement;
  accountFeedback.textContent = '';
  if (currentUser) showOnly('account');
  else setMode('login');
  dialog.showModal();
  window.setTimeout(() => (currentUser ? logoutButton : emailInput).focus(), 0);
}

function closeDialog() {
  dialog.close();
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function authErrorMessage(error) {
  const message = error?.message?.toLowerCase() || '';
  if (message.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Please verify your email before logging in.';
  if (message.includes('already registered') || message.includes('already exists')) return 'An account already exists for this email.';
  if (message.includes('rate limit')) return 'Too many attempts. Please wait and try again.';
  if (message.includes('password')) return 'Please use a password with at least 8 characters.';
  return 'Something went wrong. Please try again.';
}

function isEmailUnconfirmed(error) {
  const message = error?.message?.toLowerCase() || '';
  return error?.code === 'email_not_confirmed' || message.includes('email not confirmed');
}

async function handleSubmit(event) {
  event.preventDefault();
  if (authBusy) return;
  setFeedback('');
  hideResend();

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!validEmail(email)) {
    setFeedback('Please enter a valid email address.', 'error');
    emailInput.focus();
    return;
  }

  if (mode !== 'forgot' && password.length < 8) {
    setFeedback('Password must be at least 8 characters.', 'error');
    passwordInput.focus();
    return;
  }

  if (mode === 'register' && password !== confirmInput.value) {
    setFeedback('Passwords do not match.', 'error');
    confirmInput.focus();
    return;
  }

  if (!isConfigured) {
    setFeedback('Account service is not configured yet.', 'error');
    return;
  }

  try {
    setBusy(true, mode === 'register' ? 'Creating...' : mode === 'forgot' ? 'Sending...' : 'Logging in...');
    const client = await getSupabase();
    if (mode === 'register') {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/store/diabolo.html` },
      });
      if (error) throw error;
      if (data.session) {
        updateAccount(data.user);
        showOnly('account');
      } else {
        showMessage('Check your email', `We sent a verification link to ${email}. Verify your email to activate your Mui3D account.`);
      }
    } else if (mode === 'forgot') {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/store/update-password.html`,
      });
      if (error) throw error;
      showMessage('Check your email', `If an account exists for ${email}, a password reset link is on its way.`);
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      dialog.close();
    }
  } catch (error) {
    setFeedback(authErrorMessage(error), 'error');
    if (mode === 'login' && isEmailUnconfirmed(error)) {
      pendingVerificationEmail = email;
      resendButton.hidden = false;
    }
  } finally {
    setBusy(false);
  }
}

trigger.addEventListener('click', openDialog);
googleButton.addEventListener('click', async () => {
  if (authBusy) return;
  setFeedback('');
  hideResend();
  if (!isConfigured) {
    setFeedback('Account service is not configured yet.', 'error');
    return;
  }
  setBusy(true, 'Please wait...');
  googleButton.textContent = 'Connecting...';
  try {
    const client = await getSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: googleRedirectUrl() },
    });
    if (error) throw error;
  } catch {
    setFeedback('Google sign-in could not be started. Please try again or log in with email.', 'error');
  } finally {
    setBusy(false);
    googleButton.textContent = 'Continue with Google';
  }
});
closeButton.addEventListener('click', closeDialog);
form.addEventListener('submit', handleSubmit);
forgotButton.addEventListener('click', () => setMode('forgot'));
switchButton.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
returnLoginButton.addEventListener('click', () => setMode('login'));

resendButton.addEventListener('click', async () => {
  if (!pendingVerificationEmail || !isConfigured) return;
  resendButton.disabled = true;
  resendButton.textContent = 'Sending...';
  try {
    const client = await getSupabase();
    const { error } = await client.auth.resend({
      type: 'signup',
      email: pendingVerificationEmail,
      options: { emailRedirectTo: `${window.location.origin}/store/diabolo.html` },
    });
    if (error) throw error;
    setFeedback('Verification email sent. Please check your inbox.', 'success');
    resendButton.hidden = true;
  } catch (error) {
    setFeedback(authErrorMessage(error), 'error');
  } finally {
    resendButton.disabled = false;
    resendButton.textContent = 'Resend verification email';
  }
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
});

dialog.addEventListener('close', () => {
  form.reset();
  setFeedback('');
});

logoutButton.addEventListener('click', async () => {
  if (!isConfigured) return;
  logoutButton.disabled = true;
  accountFeedback.textContent = '';
  const client = await getSupabase();
  const { error } = await client.auth.signOut();
  logoutButton.disabled = false;
  if (error) {
    accountFeedback.textContent = 'Could not log out. Please try again.';
    accountFeedback.dataset.type = 'error';
  } else {
    dialog.close();
  }
});

async function initializeAuth() {
  if (!isConfigured) {
    updateAccount(null);
    return;
  }

  try {
    const client = await getSupabase();
    client.auth.onAuthStateChange((_event, session) => updateAccount(session?.user ?? null));
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    updateAccount(session?.user ?? null);
    // Only clean successful callback parameters after the SDK restores the session.
    if (session) {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      if (hash.has('access_token') || url.searchParams.has('code')) {
        ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'type', 'provider_token', 'provider_refresh_token'].forEach(key => hash.delete(key));
        url.searchParams.delete('code');
        url.hash = hash.toString();
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
  } catch {
    updateAccount(null);
  }
}

if (callbackError) {
  const isExpired = callbackError.code === 'otp_expired'
    || callbackError.description?.toLowerCase().includes('expired');
  showMessage(
    isExpired ? 'Verification link unavailable' : 'Sign-in not completed',
    isExpired
      ? 'This verification link has expired or has already been used. If your account is already verified, you can log in normally.'
      : 'Sign-in was cancelled or could not be completed. Please try again or log in with email.'
  );
  dialog.showModal();
  window.setTimeout(() => returnLoginButton.focus(), 0);
}

export const authReady = initializeAuth();
