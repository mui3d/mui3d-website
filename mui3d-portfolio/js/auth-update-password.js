const config = window.Mui3DConfig?.supabase ?? {};
const form = document.getElementById('update-password-form');
const passwordInput = document.getElementById('new-password');
const confirmInput = document.getElementById('confirm-new-password');
const feedback = document.getElementById('update-password-feedback');
const submitButton = document.getElementById('update-password-submit');

if (!config.url || !config.publishableKey) {
  feedback.textContent = 'Account service is not configured yet.';
  feedback.dataset.type = 'error';
  submitButton.disabled = true;
} else {
  submitButton.disabled = true;
  submitButton.textContent = 'Preparing...';

  let supabase;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Missing recovery session');
    submitButton.disabled = false;
    submitButton.textContent = 'Update Password';
  } catch {
    feedback.textContent = 'This reset link is invalid or has expired. Request a new one from the login dialog.';
    feedback.dataset.type = 'error';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = '';

    if (!supabase) return;

    if (passwordInput.value.length < 8) {
      feedback.textContent = 'Password must be at least 8 characters.';
      feedback.dataset.type = 'error';
      passwordInput.focus();
      return;
    }

    if (passwordInput.value !== confirmInput.value) {
      feedback.textContent = 'Passwords do not match.';
      feedback.dataset.type = 'error';
      confirmInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    const { error } = await supabase.auth.updateUser({ password: passwordInput.value });
    submitButton.disabled = false;
    submitButton.textContent = 'Update Password';

    if (error) {
      feedback.textContent = 'This reset link is invalid or has expired. Request a new one from the login dialog.';
      feedback.dataset.type = 'error';
      return;
    }

    feedback.textContent = 'Password updated. Returning to Diabolo...';
    feedback.dataset.type = 'success';
    window.setTimeout(() => window.location.assign('diabolo.html'), 900);
  });
}
