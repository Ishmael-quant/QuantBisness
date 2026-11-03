import { isSupabaseConfigured, supabase } from './supabase-client.js';

const cardGrid = document.getElementById('cardGrid');
const statusMessage = document.getElementById('databaseStatus');
const accountLink = document.querySelector('.main-nav a[href="account.html"]');
const favoriteIds = new Set();
const starterAssets = new Map(
  [...cardGrid.querySelectorAll('.idea-card')].map(card => [
    card.querySelector('h3').textContent.toLowerCase(),
    {
      imageUrl: card.querySelector('img')?.src,
      detailsUrl: card.querySelector('.idea-btn')?.href
    }
  ])
);
let currentUser = null;

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function safeHttpUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function createIdeaCard(idea) {
  const card = document.createElement('article');
  card.className = `idea-card ${idea.budget_tier} ${idea.industry} ${idea.region || 'all'}`;

  const starter = starterAssets.get(idea.name.toLowerCase());
  const imageUrl = safeHttpUrl(idea.image_url) || safeHttpUrl(starter?.imageUrl);
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = idea.name;
    image.loading = 'lazy';
    card.append(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'idea-image-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = '✦';
    card.append(placeholder);
  }

  const content = document.createElement('div');
  content.className = 'idea-content';

  const title = document.createElement('h3');
  title.textContent = idea.name;
  content.append(title);

  const description = document.createElement('p');
  description.textContent = idea.description;
  content.append(description);

  const detailsUrl = safeHttpUrl(idea.details_url) || safeHttpUrl(starter?.detailsUrl);
  if (detailsUrl) {
    const detailsLink = document.createElement('a');
    detailsLink.className = 'idea-btn';
    detailsLink.href = detailsUrl;
    detailsLink.textContent = 'Show more';
    content.append(detailsLink);
  }

  const favoriteButton = document.createElement('button');
  favoriteButton.className = 'idea-save';
  favoriteButton.type = 'button';
  favoriteButton.dataset.favoriteId = idea.id;
  favoriteButton.setAttribute('aria-pressed', String(favoriteIds.has(idea.id)));
  favoriteButton.textContent = favoriteIds.has(idea.id) ? 'Saved' : 'Save idea';
  content.append(favoriteButton);
  card.append(content);
  return card;
}

async function loadIdeas() {
  if (!isSupabaseConfigured) {
    setStatus('Showing starter ideas. Configure Supabase to load the live listing and save favorites.');
    return;
  }

  try {
    const { data: ideas, error } = await supabase
      .from('business_ideas')
      .select('id, name, description, image_url, details_url, budget_tier, industry, region')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    currentUser = userData.user;

    if (currentUser) {
      if (accountLink) accountLink.textContent = 'Account & saved ideas';
      const { data: favorites, error: favoritesError } = await supabase
        .from('idea_favorites')
        .select('idea_id')
        .eq('user_id', currentUser.id);
      if (favoritesError) throw favoritesError;
      favorites.forEach(({ idea_id }) => favoriteIds.add(idea_id));
    }

    cardGrid.querySelectorAll('.idea-card').forEach(card => card.remove());
    if (ideas.length) {
      const noResults = document.getElementById('no-results');
      const fragment = document.createDocumentFragment();
      ideas.forEach(idea => fragment.append(createIdeaCard(idea)));
      cardGrid.insertBefore(fragment, noResults);
      setStatus('');
    } else {
      setStatus('There are no approved business ideas yet.');
    }
    window.applyFilters();
  } catch (error) {
    setStatus(`Could not load the live listing: ${error.message}`, 'error');
  }
}

cardGrid.addEventListener('click', async event => {
  const button = event.target.closest('[data-favorite-id]');
  if (!button) return;

  if (!currentUser) {
    window.location.href = 'account.html';
    return;
  }

  const ideaId = button.dataset.favoriteId;
  button.disabled = true;
  try {
    if (favoriteIds.has(ideaId)) {
      const { error } = await supabase
        .from('idea_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('idea_id', ideaId);
      if (error) throw error;
      favoriteIds.delete(ideaId);
    } else {
      const { error } = await supabase
        .from('idea_favorites')
        .insert({ user_id: currentUser.id, idea_id: ideaId });
      if (error) throw error;
      favoriteIds.add(ideaId);
    }
    button.setAttribute('aria-pressed', String(favoriteIds.has(ideaId)));
    button.textContent = favoriteIds.has(ideaId) ? 'Saved' : 'Save idea';
    setStatus(favoriteIds.has(ideaId) ? 'Idea saved to your account.' : 'Idea removed from your saved list.', 'success');
  } catch (error) {
    setStatus(`Could not update saved ideas: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
});

loadIdeas();
