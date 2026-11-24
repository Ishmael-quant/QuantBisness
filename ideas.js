import { isSupabaseConfigured, supabase } from './supabase-client.js';
import { appendIdeaImageCredit } from './idea-image-credit.js';

const cardGrid = document.getElementById('cardGrid');
const statusMessage = document.getElementById('databaseStatus');
const searchForm = document.getElementById('ideaSearchForm');
const fallbackIdeaImageUrl = new URL('idea-placeholder.svg', document.baseURI).href;
const favoriteIds = new Set();
const starterAssets = new Map(
  [...cardGrid.querySelectorAll('.idea-card')].map(card => [
    card.querySelector('h3').textContent.toLowerCase(),
    {
      imageUrl: card.querySelector('img')?.src
    }
  ])
);
let currentUser = null;

function ideaSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ideaDetailsUrl(idea) {
  const identifier = idea.id || idea.slug || ideaSlug(idea.name);
  const params = new URLSearchParams({
    [idea.id ? 'id' : 'slug']: identifier,
    name: idea.name,
    description: idea.description,
    budget: idea.budget_tier,
    industry: idea.industry
  });
  if (idea.image_url) params.set('image', idea.image_url);
  if (idea.image_credit) params.set('imageCredit', idea.image_credit);
  if (idea.image_credit_url) params.set('imageCreditUrl', idea.image_credit_url);
  if (idea.image_license) params.set('imageLicense', idea.image_license);
  if (idea.image_license_url) params.set('imageLicenseUrl', idea.image_license_url);
  if (idea.region) params.set('region', idea.region);
  return `idea.html?${params}`;
}

function linkIdeaCard(card, url) {
  const image = card.querySelector('img');
  if (image && !image.closest('a')) {
    const imageLink = document.createElement('a');
    imageLink.className = 'idea-card-media-link';
    imageLink.href = url;
    imageLink.setAttribute('aria-label', `View ${image.alt} business idea`);
    image.before(imageLink);
    imageLink.append(image);
  }

  const title = card.querySelector('h3');
  if (title && !title.querySelector('a')) {
    const titleLink = document.createElement('a');
    titleLink.className = 'idea-card-title-link';
    titleLink.href = url;
    titleLink.textContent = title.textContent;
    title.replaceChildren(titleLink);
  }

  const detailsLink = card.querySelector('.idea-btn');
  if (detailsLink) {
    detailsLink.href = url;
    detailsLink.textContent = 'View idea';
  }
}

cardGrid.querySelectorAll('.idea-card').forEach(card => {
  const name = card.querySelector('h3')?.textContent || '';
  const description = card.querySelector('.idea-content p')?.textContent || '';
  const [budget_tier, industry, region] = card.className.split(/\s+/).slice(1);
  const image = card.querySelector('img');
  if (image) addImageFallback(card, image);
  linkIdeaCard(card, ideaDetailsUrl({
    name,
    description,
    image_url: image?.src,
    budget_tier,
    industry,
    region: region === 'all' ? null : region
  }));
});

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  window.applyFilters();
});

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

function addImageFallback(card, image) {
  const showFallback = () => {
    if (image.dataset.fallback === 'true') return;
    image.dataset.fallback = 'true';
    card.querySelector('.idea-image-credit')?.remove();
    image.src = fallbackIdeaImageUrl;
  };

  image.addEventListener('error', showFallback, { once: true });
  if (image.complete && image.naturalWidth === 0 && image.src !== fallbackIdeaImageUrl) {
    showFallback();
  }
}

function createIdeaCard(idea) {
  const card = document.createElement('article');
  card.className = `idea-card ${idea.budget_tier} ${idea.industry} ${idea.region || 'all'}`;

  const starter = starterAssets.get(idea.name.toLowerCase());
  const imageUrl = safeHttpUrl(idea.image_url) || safeHttpUrl(starter?.imageUrl);
  const detailsUrl = ideaDetailsUrl(idea);
  const imageLink = document.createElement('a');
  imageLink.className = 'idea-card-media-link';
  imageLink.href = detailsUrl;
  imageLink.setAttribute('aria-label', `View ${idea.name} business idea`);
  const image = document.createElement('img');
  image.src = imageUrl || fallbackIdeaImageUrl;
  image.alt = idea.name;
  image.loading = 'lazy';
  addImageFallback(card, image);
  imageLink.append(image);
  card.append(imageLink);
  if (imageUrl) appendIdeaImageCredit(card, idea);

  const content = document.createElement('div');
  content.className = 'idea-content';

  const title = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.className = 'idea-card-title-link';
  titleLink.href = detailsUrl;
  titleLink.textContent = idea.name;
  title.append(titleLink);
  content.append(title);

  const description = document.createElement('p');
  description.textContent = idea.description;
  content.append(description);

  const detailsLink = document.createElement('a');
  detailsLink.className = 'idea-btn';
  detailsLink.href = detailsUrl;
  detailsLink.textContent = 'View idea';
  content.append(detailsLink);

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
      .select('id, name, slug, description, image_url, image_credit, image_credit_url, image_license, image_license_url, budget_tier, industry, region')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: userData, error: userError } = await supabase.auth.getSession();
    if (userError) throw userError;
    currentUser = userData.session?.user || null;

    if (currentUser) {
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
