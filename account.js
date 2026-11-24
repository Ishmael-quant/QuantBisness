import { isSupabaseConfigured, supabase } from './supabase-client.js';
import { getSignInErrorMessage } from './auth-errors.js';

const statusMessage = document.getElementById('accountStatus');
const authPanel = document.getElementById('authPanel');
const memberPanel = document.getElementById('memberPanel');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const authModeToggle = document.getElementById('authModeToggle');
const authModePrompt = document.getElementById('authModePrompt');
const supplierStatus = document.getElementById('supplierStatus');
const supplierContactsList = document.getElementById('supplierContactsList');
const supplierRegionFilter = document.getElementById('supplierRegionFilter');
let currentUser = null;
let memberDataRequest = 0;

const regionLabels = {
  central: 'Central Province',
  coast: 'Coast Province',
  eastern: 'Eastern Province',
  nairobi: 'Nairobi Province',
  north_eastern: 'North Eastern Province',
  nyanza: 'Nyanza Province',
  rift_valley: 'Rift Valley Province',
  western: 'Western Province'
};
const industryLabels = {
  tech: 'Technology',
  agric: 'Agriculture & food',
  digital: 'Digital',
  education: 'Education',
  stores: 'E-commerce & retail',
  other: 'Other'
};

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function setFeatureStatus(message, state = '') {
  supplierStatus.textContent = message;
  supplierStatus.dataset.state = state;
}

function showAccountView(view) {
  const panels = [...document.querySelectorAll('[data-account-panel]')];
  if (!panels.some(panel => panel.dataset.accountPanel === view)) {
    view = 'overview';
  }

  panels.forEach(panel => {
    panel.hidden = panel.dataset.accountPanel !== view;
  });
  document.querySelectorAll('[data-account-view]').forEach(link => {
    if (link.dataset.accountView === view) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (view === 'suppliers') loadSupplierContacts();
}

function showAuthMode(mode, updateHistory = false) {
  const isSignUp = mode === 'sign-up';
  signInForm.hidden = isSignUp;
  signUpForm.hidden = !isSignUp;
  authModePrompt.textContent = isSignUp ? 'Already have an account?' : 'Don’t have an account?';
  authModeToggle.textContent = isSignUp ? 'Sign in' : 'Sign up';
  authModeToggle.setAttribute('aria-controls', isSignUp ? 'signInForm' : 'signUpForm');

  if (updateHistory) {
    window.history.replaceState(null, '', isSignUp ? '#sign-up' : '#sign-in');
  }
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setBusy(form, busy) {
  form.querySelector('button[type="submit"]').disabled = busy;
}

function createListItem(titleText, detailText, actionId) {
  const item = document.createElement('li');
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = titleText;
  const detail = document.createElement('p');
  detail.textContent = detailText;
  content.append(title, detail);

  if (actionId) {
    const removeButton = document.createElement('button');
    removeButton.className = 'database-action';
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.dataset.favoriteId = actionId;
    item.append(content, removeButton);
  } else {
    item.append(content);
  }
  return item;
}

async function loadSupplierContacts() {
  if (!currentUser) return;
  setFeatureStatus('Loading supplier contacts...');
  supplierContactsList.replaceChildren();

  const { data, error } = await supabase.rpc('get_supplier_contacts', {
    p_region: supplierRegionFilter.value || null
  });
  if (error) {
    setFeatureStatus(`Could not load supplier contacts: ${error.message}`, 'error');
    return;
  }
  if (!Array.isArray(data)) {
    setFeatureStatus('Could not load supplier contacts: the response was not in the expected format.', 'error');
    return;
  }

  if (!data.length) {
    supplierContactsList.append(createListItem(
      'No supplier contacts listed yet',
      'The directory is waiting for verified contacts to be added.'
    ));
  } else {
    data.forEach(contact => {
      const details = [
        contact.company !== contact.name ? contact.company : null,
        regionLabels[contact.region] || 'Province not specified',
        industryLabels[contact.industry] || contact.industry,
        contact.country,
        contact.description
      ].filter(Boolean).join(' · ');
      const item = createListItem(contact.name, details);
      const contactLinks = document.createElement('div');
      contactLinks.className = 'supplier-contact-links';

      if (contact.email) {
        const email = document.createElement('a');
        email.href = `mailto:${contact.email}`;
        email.textContent = contact.email;
        contactLinks.append(email);
      }
      if (contact.phone) {
        const phone = document.createElement('a');
        phone.href = `tel:${contact.phone}`;
        phone.textContent = contact.phone;
        contactLinks.append(phone);
      }
      if (contact.website) {
        const website = document.createElement('a');
        website.href = contact.website;
        website.target = '_blank';
        website.rel = 'noopener noreferrer';
        website.textContent = 'Website';
        contactLinks.append(website);
      }
      if (contactLinks.childElementCount) item.append(contactLinks);
      supplierContactsList.append(item);
    });
  }

  setFeatureStatus(`${data.length} supplier contact${data.length === 1 ? '' : 's'} shown.`);
}

async function loadMemberData() {
  const request = ++memberDataRequest;
  const userId = currentUser?.id;
  if (!userId) return;

  const { data: favorites, error: favoriteError } = await supabase
    .from('idea_favorites')
    .select('idea_id')
    .eq('user_id', userId);
  if (favoriteError) throw favoriteError;

  if (request !== memberDataRequest || currentUser?.id !== userId) return;
  const ids = [...new Set(favorites.map(favorite => favorite.idea_id))];
  let ideas = [];
  if (ids.length) {
    const { data, error: ideasError } = await supabase
      .from('business_ideas')
      .select('id, name, description')
      .in('id', ids);
    if (ideasError) throw ideasError;
    ideas = [...new Map(data.map(idea => [idea.id, idea])).values()];
  }
  if (request !== memberDataRequest || currentUser?.id !== userId) return;

  const favoritesList = document.getElementById('favoritesList');
  favoritesList.replaceChildren();
  if (!ideas.length) {
    favoritesList.append(createListItem('No saved ideas yet', 'Browse the listing and save ideas you like.'));
    return;
  }

  ideas.forEach(idea => {
    const item = createListItem(idea.name, idea.description, idea.id);
    const titleLink = document.createElement('a');
    titleLink.href = `idea.html?id=${encodeURIComponent(idea.id)}`;
    titleLink.textContent = idea.name;
    item.firstElementChild.replaceChildren(titleLink, item.querySelector('p'));
    favoritesList.append(item);
  });
}

async function refreshAccount() {
  if (!isSupabaseConfigured) return;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setStatus(`Could not check your account: ${error.message}`, 'error');
    return;
  }

  currentUser = data.session?.user || null;
  authPanel.hidden = Boolean(currentUser);
  memberPanel.hidden = !currentUser;
  if (!currentUser) return;

  document.getElementById('signedInAs').textContent = `Signed in as ${currentUser.email}`;
  showAccountView(window.location.hash.slice(1).replace('account-', '') || 'overview');
  try {
    await loadMemberData();
    setStatus('');
  } catch (loadError) {
    setStatus(`Could not load your account data: ${loadError.message}`, 'error');
  }
}

authModeToggle.addEventListener('click', () => {
  const showSignUp = signInForm.hidden;
  showAuthMode(showSignUp ? 'sign-in' : 'sign-up', true);
  (showSignUp ? signInForm : signUpForm).querySelector('input').focus();
});

showAuthMode(window.location.hash === '#sign-up' ? 'sign-up' : 'sign-in');
window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash === '#sign-up' || hash === '#sign-in') {
    showAuthMode(hash.slice(1));
  } else if (currentUser) {
    showAccountView(hash.slice(1).replace('account-', '') || 'overview');
  }
});

signInForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isSupabaseConfigured) return;
  setBusy(signInForm, true);
  try {
    const { email, password } = formValues(signInForm);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    signInForm.reset();
    await refreshAccount();
  } catch (error) {
    console.error('Could not sign in.', error);
    setStatus(getSignInErrorMessage(error), 'error');
  } finally {
    setBusy(signInForm, false);
  }
});

signUpForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isSupabaseConfigured) return;
  setBusy(signUpForm, true);
  try {
    const { email, password } = formValues(signUpForm);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    signUpForm.reset();
    if (data.session) {
      await refreshAccount();
    } else {
      showAuthMode('sign-in', true);
      setStatus('Account created. Check your email to confirm it, then sign in.', 'success');
    }
  } catch (error) {
    console.error('Could not create your account.', error);
    setStatus('Unable to create your account. Please try again.', 'error');
  } finally {
    setBusy(signUpForm, false);
  }
});

supplierRegionFilter.addEventListener('change', loadSupplierContacts);

document.getElementById('signOutButton').addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await refreshAccount();
    setStatus('You have signed out.', 'success');
  } catch (error) {
    console.error('Could not sign out.', error);
    setStatus('Unable to sign out. Please try again.', 'error');
  }
});

document.getElementById('favoritesList').addEventListener('click', async event => {
  const button = event.target.closest('[data-favorite-id]');
  if (!button || !currentUser) return;
  button.disabled = true;
  try {
    const { error } = await supabase
      .from('idea_favorites')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('idea_id', button.dataset.favoriteId);
    if (error) throw error;
    await loadMemberData();
    setStatus('Idea removed from your saved list.', 'success');
  } catch (error) {
    setStatus(`Could not remove the saved idea: ${error.message}`, 'error');
    button.disabled = false;
  }
});

if (!isSupabaseConfigured) {
  setStatus('Supabase is not configured. Add your project URL and anon key in supabase-config.js, then run supabase/schema.sql.', 'error');
  signInForm.querySelector('button').disabled = true;
  signUpForm.querySelector('button').disabled = true;
} else {
  supabase.auth.onAuthStateChange(() => {
    window.setTimeout(() => refreshAccount(), 0);
  });
  refreshAccount();
}
