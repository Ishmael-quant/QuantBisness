import { isSupabaseConfigured, supabase } from './supabase-client.js';
import { getSignInErrorMessage } from './auth-errors.js';

const statusMessage = document.getElementById('adminStatus');
const loginPanel = document.getElementById('adminLoginPanel');
const adminPanel = document.getElementById('adminPanel');
const signInForm = document.getElementById('adminSignInForm');
const ideaForm = document.getElementById('ideaForm');
const ideaFormSection = document.getElementById('ideaFormSection');
const showIdeaFormButton = document.getElementById('showIdeaFormButton');
const recentIdeasTable = document.getElementById('adminRecentIdeas');
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

const budgetLabels = {
  p1000: 'Under 1,000',
  p50000: 'Under 50,000',
  p100000: 'Under 100,000',
  p500000: 'Under 500,000',
  p1000000: 'Under 1 million',
  'p1000000+': '1 million+'
};
const industryLabels = {
  tech: 'Technology',
  agric: 'Agriculture & food',
  digital: 'Digital',
  education: 'Education',
  stores: 'E-commerce & retail',
  other: 'Other'
};
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

function appendIdeaField(list, labelText, value) {
  const term = document.createElement('dt');
  term.textContent = labelText;
  const description = document.createElement('dd');
  description.textContent = value || 'Not specified';
  list.append(term, description);
  return description;
}

function appendIdeaLink(list, labelText, value) {
  const description = appendIdeaField(list, labelText, value);
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = value;
    description.replaceChildren(link);
  } catch {
    return;
  }
}

function createIdeaDetailsRow(idea) {
  const row = document.createElement('tr');
  row.className = 'admin-idea-details-row';
  row.id = `idea-details-${idea.id}`;
  row.hidden = true;
  const cell = document.createElement('td');
  cell.colSpan = 3;
  const details = document.createElement('div');
  details.className = 'admin-idea-details';
  const fields = document.createElement('dl');
  fields.className = 'admin-idea-fields';

  appendIdeaField(fields, 'Idea ID', idea.id);
  appendIdeaField(fields, 'Description', idea.description);
  appendIdeaField(fields, 'Detailed setup information', idea.details);
  appendIdeaField(fields, 'Slug', idea.slug);
  appendIdeaField(fields, 'Budget', budgetLabels[idea.budget_tier] || idea.budget_tier);
  appendIdeaField(fields, 'Industry', industryLabels[idea.industry] || idea.industry);
  appendIdeaField(fields, 'Province', regionLabels[idea.region] || idea.region);
  appendIdeaField(fields, 'Status', idea.status);
  appendIdeaLink(fields, 'Image URL', idea.image_url);
  appendIdeaField(fields, 'Image creator', idea.image_credit);
  appendIdeaLink(fields, 'Creator profile', idea.image_credit_url);
  appendIdeaField(fields, 'Image license', idea.image_license);
  appendIdeaLink(fields, 'License URL', idea.image_license_url);
  appendIdeaLink(fields, 'Additional details URL', idea.details_url);
  appendIdeaField(fields, 'Created', new Date(idea.created_at).toLocaleString());
  appendIdeaField(fields, 'Last updated', idea.updated_at ? new Date(idea.updated_at).toLocaleString() : null);
  appendIdeaField(fields, 'Reviewed', idea.reviewed_at ? new Date(idea.reviewed_at).toLocaleString() : null);
  appendIdeaField(fields, 'Submitted by user ID', idea.submitted_by);
  appendIdeaField(fields, 'Reviewed by user ID', idea.reviewed_by);

  const actions = document.createElement('div');
  actions.className = 'database-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Edit idea';
  edit.dataset.editId = idea.id;
  actions.append(edit);

  if (idea.status !== 'approved') {
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.textContent = 'Approve';
    approve.dataset.statusId = idea.id;
    approve.dataset.status = 'approved';
    actions.append(approve);
  }
  if (idea.status !== 'rejected') {
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.textContent = 'Reject';
    reject.dataset.statusId = idea.id;
    reject.dataset.status = 'rejected';
    actions.append(reject);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Delete';
  remove.dataset.deleteId = idea.id;
  actions.append(remove);

  details.append(fields, actions);
  cell.append(details);
  row.append(cell);
  return row;
}

async function loadIdeas() {
  const { data: ideas, error } = await supabase
    .from('business_ideas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentIdeas = [];
  const earlierIdeas = [];
  ideas.forEach(idea => {
    const target = new Date(idea.created_at).getTime() >= weekAgo ? recentIdeas : earlierIdeas;
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const toggleDetails = document.createElement('button');
    toggleDetails.className = 'admin-idea-title';
    toggleDetails.type = 'button';
    toggleDetails.textContent = idea.name;
    toggleDetails.dataset.detailsId = idea.id;
    toggleDetails.setAttribute('aria-expanded', 'false');
    toggleDetails.setAttribute('aria-controls', `idea-details-${idea.id}`);
    titleCell.append(toggleDetails);
    row.append(
      titleCell,
      createCell(idea.status),
      createCell(new Date(idea.created_at).toLocaleDateString())
    );
    target.push([row, createIdeaDetailsRow(idea)]);
  });
  renderIdeaRows(recentIdeasTable, recentIdeas, 'No ideas have been added in the last seven days.');
  renderIdeaRows(ideasTable, earlierIdeas, 'No earlier listings.');
  return ideas;
}

function renderIdeaRows(table, entries, emptyMessage) {
  table.replaceChildren();
  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = createCell(emptyMessage);
    cell.colSpan = 3;
    row.append(cell);
    table.append(row);
    return;
  }
  entries.forEach(([row, detailsRow]) => table.append(row, detailsRow));
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
    console.error('Could not sign in to admin.', error);
    setStatus(getSignInErrorMessage(error), 'error');
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
    console.error('Could not sign out.', error);
    setStatus('Unable to sign out. Please try again.', 'error');
  }
});

nonAdminSignOutButton.addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    nonAdminSignOutButton.hidden = true;
    setStatus('You have signed out.', 'success');
  } catch (error) {
    console.error('Could not sign out.', error);
    setStatus('Unable to sign out. Please try again.', 'error');
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
      details: values.details.trim() || null,
      image_url: values.image_url || null,
      image_credit: values.image_credit.trim() || null,
      image_credit_url: values.image_credit_url || null,
      image_license: values.image_license.trim() || null,
      image_license_url: values.image_license_url || null,
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
  ideaFormSection.hidden = true;
  showIdeaFormButton.textContent = 'Add an idea';
  showIdeaFormButton.setAttribute('aria-expanded', 'false');
}

showIdeaFormButton.addEventListener('click', () => {
  if (!ideaFormSection.hidden) {
    resetForm();
    return;
  }
  resetForm();
  ideaFormSection.hidden = false;
  showIdeaFormButton.textContent = 'Hide idea form';
  showIdeaFormButton.setAttribute('aria-expanded', 'true');
  ideaFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

cancelEditButton.addEventListener('click', resetForm);

async function handleIdeaTableClick(event) {
  const button = event.target.closest('button');
  if (!button || !adminUser) return;

  if (button.dataset.detailsId) {
    const detailsRow = document.getElementById(`idea-details-${button.dataset.detailsId}`);
    detailsRow.hidden = !detailsRow.hidden;
    button.setAttribute('aria-expanded', String(!detailsRow.hidden));
    return;
  }

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
      ideaFormSection.hidden = false;
      showIdeaFormButton.textContent = 'Hide idea form';
      showIdeaFormButton.setAttribute('aria-expanded', 'true');
      ideaFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
}

recentIdeasTable.addEventListener('click', handleIdeaTableClick);
ideasTable.addEventListener('click', handleIdeaTableClick);

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
