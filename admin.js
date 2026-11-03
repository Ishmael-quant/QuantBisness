import { isSupabaseConfigured, supabase } from './supabase-client.js';

const statusMessage = document.getElementById('adminStatus');
const loginPanel = document.getElementById('adminLoginPanel');
const adminPanel = document.getElementById('adminPanel');
const signInForm = document.getElementById('adminSignInForm');
const ideaForm = document.getElementById('ideaForm');
const ideasTable = document.getElementById('adminIdeas');
const cancelEditButton = document.getElementById('cancelEditButton');
const nonAdminSignOutButton = document.getElementById('adminLoginSignOutButton');
let adminUser = null;

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function setBusy(form, busy) {
  form.querySelector('button[type="submit"]').disabled = busy;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

async function loadIdeas() {
  const { data: ideas, error } = await supabase
    .from('business_ideas')
    .select('id, name, slug, description, image_url, details_url, budget_tier, industry, region, status, submitted_by, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  ideasTable.replaceChildren();
  ideas.forEach(idea => {
    const row = document.createElement('tr');
    row.append(createCell(idea.name), createCell(idea.status), createCell(new Date(idea.created_at).toLocaleDateString()));

    const actions = document.createElement('td');
    const buttons = document.createElement('div');
    buttons.className = 'database-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.dataset.editId = idea.id;
    buttons.append(edit);

    if (idea.status !== 'approved') {
      const approve = document.createElement('button');
      approve.type = 'button';
      approve.textContent = 'Approve';
      approve.dataset.statusId = idea.id;
      approve.dataset.status = 'approved';
      buttons.append(approve);
    }
    if (idea.status !== 'rejected') {
      const reject = document.createElement('button');
      reject.type = 'button';
      reject.textContent = 'Reject';
      reject.dataset.statusId = idea.id;
      reject.dataset.status = 'rejected';
      buttons.append(reject);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.dataset.deleteId = idea.id;
    buttons.append(remove);
    actions.append(buttons);
    row.append(actions);
    ideasTable.append(row);
  });
  return ideas;
}

async function refreshAdmin() {
  if (!isSupabaseConfigured) return;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  adminUser = null;
  loginPanel.hidden = Boolean(user);
  adminPanel.hidden = true;
  nonAdminSignOutButton.hidden = !user;
  if (!user) return;

  const { data: role, error: roleError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  if (!role) {
    loginPanel.hidden = false;
    setStatus('This account does not have admin access. Ask an administrator to grant it.', 'error');
    return;
  }

  adminUser = user;
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  document.getElementById('adminSignedInAs').textContent = `Admin: ${user.email}`;
  await loadIdeas();
}

signInForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isSupabaseConfigured) return;
  setBusy(signInForm, true);
  try {
    const { email, password } = formValues(signInForm);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshAdmin();
  } catch (error) {
    setStatus(`Could not sign in to admin: ${error.message}`, 'error');
  } finally {
    setBusy(signInForm, false);
  }
});

document.getElementById('adminSignOutButton').addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    adminUser = null;
    adminPanel.hidden = true;
    loginPanel.hidden = false;
    nonAdminSignOutButton.hidden = true;
    setStatus('You have signed out.', 'success');
  } catch (error) {
    setStatus(`Could not sign out: ${error.message}`, 'error');
  }
});

nonAdminSignOutButton.addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    nonAdminSignOutButton.hidden = true;
    setStatus('You have signed out.', 'success');
  } catch (error) {
    setStatus(`Could not sign out: ${error.message}`, 'error');
  }
});

ideaForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!adminUser) return;
  setBusy(ideaForm, true);
  try {
    const values = formValues(ideaForm);
    const isPending = values.status === 'pending';
    const idea = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      image_url: values.image_url || null,
      details_url: values.details_url || null,
      budget_tier: values.budget_tier,
      industry: values.industry,
      region: values.region || null,
      status: values.status,
      reviewed_by: isPending ? null : adminUser.id,
      reviewed_at: isPending ? null : new Date().toISOString()
    };
    const id = values.id;
    const result = id
      ? await supabase.from('business_ideas').update(idea).eq('id', id)
      : await supabase.from('business_ideas').insert(idea);
    if (result.error) throw result.error;
    resetForm();
    await loadIdeas();
    setStatus(id ? 'Business idea updated.' : 'Business idea added.', 'success');
  } catch (error) {
    setStatus(`Could not save the idea: ${error.message}`, 'error');
  } finally {
    setBusy(ideaForm, false);
  }
});

function resetForm() {
  ideaForm.reset();
  ideaForm.elements.id.value = '';
  document.getElementById('ideaFormTitle').textContent = 'Add an idea';
  cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener('click', resetForm);

ideasTable.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || !adminUser) return;
  button.disabled = true;

  try {
    if (button.dataset.editId) {
      const { data: idea, error } = await supabase
        .from('business_ideas')
        .select('*')
        .eq('id', button.dataset.editId)
        .single();
      if (error) throw error;
      Object.entries(idea).forEach(([key, value]) => {
        if (ideaForm.elements[key]) ideaForm.elements[key].value = value ?? '';
      });
      document.getElementById('ideaFormTitle').textContent = `Edit: ${idea.name}`;
      cancelEditButton.hidden = false;
      ideaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (button.dataset.statusId) {
      const { error } = await supabase
        .from('business_ideas')
        .update({
          status: button.dataset.status,
          reviewed_by: adminUser.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', button.dataset.statusId);
      if (error) throw error;
      await loadIdeas();
      setStatus(`Idea ${button.dataset.status}.`, 'success');
    } else if (button.dataset.deleteId) {
      if (!window.confirm('Delete this business idea and its saved favorites?')) return;
      const { error } = await supabase
        .from('business_ideas')
        .delete()
        .eq('id', button.dataset.deleteId);
      if (error) throw error;
      await loadIdeas();
      setStatus('Business idea deleted.', 'success');
    }
  } catch (error) {
    setStatus(`Could not update the listing: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
});

if (!isSupabaseConfigured) {
  setStatus('Supabase is not configured. Add your project URL and anon key in supabase-config.js, then run supabase/schema.sql.', 'error');
  signInForm.querySelector('button').disabled = true;
} else {
  supabase.auth.onAuthStateChange(() => {
    window.setTimeout(() => refreshAdmin().catch(error => {
      setStatus(`Could not load admin tools: ${error.message}`, 'error');
    }), 0);
  });
  refreshAdmin().catch(error => {
    setStatus(`Could not load admin tools: ${error.message}`, 'error');
  });
}
