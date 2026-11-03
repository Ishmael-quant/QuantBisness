import { isSupabaseConfigured, supabase } from './supabase-client.js';

const statusMessage = document.getElementById('accountStatus');
const authPanel = document.getElementById('authPanel');
const memberPanel = document.getElementById('memberPanel');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const submissionForm = document.getElementById('submissionForm');
let currentUser = null;

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function createListItem(titleText, detailText, actionLabel, actionId, actionType) {
  const item = document.createElement('li');
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = titleText;
  const detail = document.createElement('p');
  detail.textContent = detailText;
  content.append(title, detail);
  item.append(content);

  if (actionLabel) {
    const action = document.createElement('button');
    action.className = 'database-action';
    action.type = 'button';
    action.textContent = actionLabel;
    action.dataset[actionType] = actionId;
    item.append(action);
  }
  return item;
}

function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
}

async function loadMemberData() {
  const { data: favorites, error: favoriteError } = await supabase
    .from('idea_favorites')
    .select('idea_id')
    .eq('user_id', currentUser.id);
  if (favoriteError) throw favoriteError;

  const favoritesList = document.getElementById('favoritesList');
  favoritesList.replaceChildren();
  if (!favorites.length) {
    favoritesList.append(createListItem('No saved ideas yet', 'Browse the listing and save ideas you like.'));
  } else {
    const ids = favorites.map(favorite => favorite.idea_id);
    const { data: ideas, error: ideasError } = await supabase
      .from('business_ideas')
      .select('id, name, description, slug')
      .in('id', ids);
    if (ideasError) throw ideasError;
    ideas.forEach(idea => {
      const item = createListItem(
        idea.name,
        idea.description,
        'Remove',
        idea.id,
        'favoriteId'
      );
      const titleLink = document.createElement('a');
      titleLink.href = `ideas.html?search=${encodeURIComponent(idea.name)}`;
      titleLink.textContent = idea.name;
      item.firstElementChild.replaceChildren(titleLink, item.querySelector('p'));
      favoritesList.append(item);
    });
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from('business_ideas')
    .select('name, status, created_at')
    .eq('submitted_by', currentUser.id)
    .order('created_at', { ascending: false });
  if (submissionsError) throw submissionsError;

  const submissionsList = document.getElementById('submissionsList');
  submissionsList.replaceChildren();
  if (!submissions.length) {
    submissionsList.append(createListItem('No submissions yet', 'Your submitted ideas and review status will appear here.'));
  } else {
    submissions.forEach(idea => {
      const submittedOn = new Date(idea.created_at).toLocaleDateString();
      submissionsList.append(createListItem(
        idea.name,
        `Status: ${idea.status} · Submitted ${submittedOn}`
      ));
    });
  }
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
  try {
    await loadMemberData();
    setStatus('');
  } catch (loadError) {
    setStatus(`Could not load your account data: ${loadError.message}`, 'error');
  }
}

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
    setStatus(`Could not sign in: ${error.message}`, 'error');
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
      setStatus('Account created. Check your email to confirm it, then sign in.', 'success');
    }
  } catch (error) {
    setStatus(`Could not create your account: ${error.message}`, 'error');
  } finally {
    setBusy(signUpForm, false);
  }
});

document.getElementById('signOutButton').addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await refreshAccount();
    setStatus('You have signed out.', 'success');
  } catch (error) {
    setStatus(`Could not sign out: ${error.message}`, 'error');
  }
});

submissionForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) return;
  setBusy(submissionForm, true);
  try {
    const values = formValues(submissionForm);
    const baseSlug = values.name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const { error } = await supabase.from('business_ideas').insert({
      name: values.name.trim(),
      slug: `${baseSlug || 'business-idea'}-${crypto.randomUUID().slice(0, 8)}`,
      description: values.description.trim(),
      budget_tier: values.budget_tier,
      industry: values.industry,
      region: values.region || null,
      submitted_by: currentUser.id,
      status: 'pending'
    });
    if (error) throw error;
    submissionForm.reset();
    await loadMemberData();
    setStatus('Your idea has been submitted for review.', 'success');
  } catch (error) {
    setStatus(`Could not submit your idea: ${error.message}`, 'error');
  } finally {
    setBusy(submissionForm, false);
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
  submissionForm.querySelector('button').disabled = true;
} else {
  supabase.auth.onAuthStateChange(() => {
    window.setTimeout(() => refreshAccount(), 0);
  });
  refreshAccount();
}
