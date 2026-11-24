import { isSupabaseConfigured, supabase } from './supabase-client.js';

const signInLinks = document.querySelectorAll('[data-auth-link="sign-in"]');
const accountLinks = document.querySelectorAll('[data-auth-link="account"]');

function showAuthLinks(isSignedIn) {
  signInLinks.forEach(link => { link.hidden = isSignedIn; });
  accountLinks.forEach(link => { link.hidden = !isSignedIn; });
}

if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((_event, session) => {
    showAuthLinks(Boolean(session));
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error(`Could not check authentication for navigation: ${error.message}`);
  } else {
    showAuthLinks(Boolean(data.session));
  }
}
