import { isSupabaseConfigured, supabase } from './supabase-client.js';
import { appendIdeaImageCredit } from './idea-image-credit.js';

const statusMessage = document.getElementById('ideaDetailStatus');
const content = document.getElementById('ideaDetailContent');
const params = new URLSearchParams(window.location.search);
const staticIdea = {
  slug: params.get('slug'),
  name: params.get('name'),
  description: params.get('description'),
  image_url: params.get('image'),
  image_credit: params.get('imageCredit'),
  image_credit_url: params.get('imageCreditUrl'),
  image_license: params.get('imageLicense'),
  image_license_url: params.get('imageLicenseUrl'),
  budget_tier: params.get('budget'),
  industry: params.get('industry'),
  region: params.get('region')
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
const budgetLabels = {
  p1000: 'Under 1,000',
  p50000: 'Under 50,000',
  p100000: 'Under 100,000',
  p500000: 'Under 500,000',
  p1000000: 'Under 1 million',
  'p1000000+': '1 million+'
};
const starterSlugs = new Set([
  'electronic-device-repairs',
  'e-commerce',
  'freelancing',
  'cassava-processing',
  'waste-to-energy-plant',
  'real-estate-property-tech',
  'technology-software-development',
  'fashion-beauty-industry',
  'tourism'
]);

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

function appendLinkedText(element, text) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  parts.forEach(part => {
    if (!/^https?:\/\//i.test(part)) {
      element.append(document.createTextNode(part));
      return;
    }

    const match = part.match(/^(https?:\/\/[^\s]+?)([.,;:!?)}\]]*)$/);
    const url = safeHttpUrl(match ? match[1] : part);
    if (!url) {
      element.append(document.createTextNode(part));
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = match ? match[1] : part;
    element.append(link);
    if (match?.[2]) element.append(document.createTextNode(match[2]));
  });
}

function renderIdea(idea) {
  document.title = `${idea.name} | Business Idea | QuantBisness`;
  document.querySelector('meta[name="description"]').content =
    `${idea.name}: explore the idea, consider its budget and industry, and plan practical first steps with QuantBisness.`;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = idea.description;
  document.getElementById('ideaTitle').textContent = idea.name;
  document.getElementById('breadcrumbTitle').textContent = idea.name;
  document.getElementById('ideaDescription').textContent = idea.description;

  const imageUrl = safeHttpUrl(idea.image_url);
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = idea.name;
    image.fetchPriority = 'high';
    const imageWrap = document.getElementById('ideaImageWrap');
    imageWrap.append(image);
    appendIdeaImageCredit(imageWrap, idea, 'idea-image-credit idea-detail-image-credit');
    imageWrap.hidden = false;
  }

  const facts = document.getElementById('ideaFacts');
  const labels = [
    budgetLabels[idea.budget_tier] && `Budget tier · ${budgetLabels[idea.budget_tier]}`,
    industryLabels[idea.industry],
    regionLabels[idea.region] || (idea.region
      ? `Province · ${idea.region.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())}`
      : 'Province · Open')
  ].filter(Boolean);
  labels.forEach(label => {
    const fact = document.createElement('span');
    fact.textContent = label;
    facts.append(fact);
  });

  content.hidden = false;
  setStatus('');
}

const repairBusinessSlugs = new Set([
  'electronic-device-repairs',
  'computer-hardware-repair-refurbishment'
]);

const tailoredGuideMarker = '[QuantBisness tailored setup guide v1]';

function parseTailoredSetupGuide(details) {
  const markerIndex = details?.indexOf(tailoredGuideMarker) ?? -1;
  if (markerIndex < 0) return null;

  const notes = details.slice(0, markerIndex).trim();
  const guideText = details.slice(markerIndex + tailoredGuideMarker.length).trim();
  const steps = guideText.split(/\n(?=\d+\.\s)/).filter(Boolean).map(section => {
    const [titleLine, ...lines] = section.split('\n');
    const description = lines.find(line => line.startsWith('Description:'))?.slice('Description:'.length).trim() || '';
    const resources = lines
      .filter(line => line.startsWith('Resource:'))
      .map(line => {
        const [label, url] = line.slice('Resource:'.length).split('|').map(value => value.trim());
        return { label, url };
      })
      .filter(resource => resource.label && resource.url);

    return {
      title: titleLine.replace(/^\d+\.\s*/, '').trim(),
      description,
      resources
    };
  });

  return { notes, steps };
}

function renderSetupGuide(details, slug) {
  const repairSteps = [
    {
      title: 'Choose Your Niche and Business Model',
      description: 'Decide which devices and repairs to focus on, such as phones, computers, or common hardware faults. Validate local demand, your skills, startup budget, parts availability, and whether you will repair in-shop, offer pickup, or provide services to organizations.'
    },
    {
      title: 'Register and Get Local Permits',
      description: 'Choose a business structure and confirm the current registration, tax, and county permit requirements for your location before opening. Requirements can vary by activity and county, so verify them with the relevant Kenyan authorities.',
      resources: [
        {
          label: 'Business planning video — BizMove (5:17)',
          url: 'https://www.youtube.com/watch?v=rNmzsCBdKnE&t=317s'
        }
      ]
    },
    {
      title: 'Buy Essential Tools and Parts',
      description: 'Start with reliable tools for inspection, diagnosis, safe disassembly, cleaning, and common repairs. Stock only frequently used parts at first, buy from suppliers you can verify, and add specialized board-level equipment as customer demand and skills grow.',
      resources: [
        {
          label: 'Tools for starting a phone-repair business in Kenya',
          url: 'https://musicandfilmacademy.ac.ke/electronics-hardware-repair/tools-needed-to-start-phone-repair-business-in-kenya/'
        },
        {
          label: 'How to start a successful repair business',
          url: 'https://repairbiz.store/blog/how-to-start-a-successful-repair-business'
        },
        {
          label: 'Mobile repair workstation demonstration — ETech47',
          url: 'https://www.youtube.com/watch?v=Zu1FYqNLGo4'
        }
      ]
    },
    {
      title: 'Set Up Operations and Attract Customers',
      description: 'Use a consistent intake, diagnosis, quotation, customer approval, repair, testing, and handover process. Keep clear records of devices and parts, protect customer data, explain warranties and limitations, and build trust through referrals, reviews, and local partnerships.'
    }
  ];
  const defaultSteps = [
    ['Problem + Customer', 'Validation', 'Define the problem you will solve and identify the customers who experience it. Speak with potential customers and test whether they would pay for a solution.'],
    ['Offer + Model', 'Value & delivery', 'Describe the value you provide, how customers will receive it, and how the business will earn revenue.'],
    ['Numbers + Funding', 'Financial viability', 'Estimate startup costs, ongoing expenses, pricing, sales, and cash needs. Identify realistic funding sources and test whether the numbers can work.'],
    ['Legal + Operations', 'Compliance & systems', 'Check registration, permits, tax, and other local requirements. Plan suppliers, tools, processes, and record-keeping.'],
    ['Launch + Feedback Loop', 'Growth', 'Start with a manageable launch, gather customer feedback, measure results, and improve before expanding.']
  ];
  const formula = document.getElementById('ideaSetupFormula');
  const tailoredGuide = parseTailoredSetupGuide(details || '');
  const steps = repairBusinessSlugs.has(slug)
    ? repairSteps.map(step => [step.title, null, step.description, step.resources || []])
    : tailoredGuide
      ? tailoredGuide.steps.map(step => [step.title, null, step.description, step.resources])
      : defaultSteps.map(([title, subtitle, description]) => [title, subtitle, description, []]);
  steps.forEach(([title, subtitle, description, resources], index) => {
    const card = document.createElement('article');
    const number = document.createElement('span');
    number.textContent = subtitle ? `0${index + 1} · ${subtitle}` : `0${index + 1}`;
    const heading = document.createElement('h3');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = description;
    card.append(number, heading, copy);
    resources.forEach(resource => {
      const link = document.createElement('a');
      link.href = resource.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = resource.label;
      card.append(link);
    });
    formula.append(card);
  });
  formula.hidden = false;

  const practicalDetails = document.getElementById('ideaPracticalDetails');
  const paragraphs = (tailoredGuide?.notes || details || '').trim().split(/\n\s*\n/).filter(Boolean);
  paragraphs.forEach(text => {
    const paragraph = document.createElement('p');
    appendLinkedText(paragraph, text);
    practicalDetails.append(paragraph);
  });

  document.getElementById('ideaPracticalSection').hidden = false;
}

async function loadIdea() {
  const id = params.get('id');
  const slug = params.get('slug');
  if (!id && !slug) {
    setStatus('Choose an idea from the listing to view its details.', 'error');
    return;
  }

  if (isSupabaseConfigured) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const isSignedIn = Boolean(sessionData.session?.user);
    const column = id ? 'id' : 'slug';
    const { data, error } = await supabase
      .from('business_ideas')
      .select('slug, name, description, image_url, image_credit, image_credit_url, image_license, image_license_url, budget_tier, industry, region')
      .eq(column, id || slug)
      .eq('status', 'approved')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      if (slug && starterSlugs.has(slug) && staticIdea.name && staticIdea.description) {
        renderIdea(staticIdea);
      } else {
        setStatus('This idea is no longer available. Browse the approved ideas for other opportunities.', 'error');
      }
      if (!isSignedIn) document.getElementById('ideaGuideSignIn').hidden = false;
      else renderSetupGuide(staticIdea.details, staticIdea.slug || slug);
      return;
    }

    let setupDetails = null;
    let setupDetailsStatus = '';
    if (isSignedIn) {
      const { data: setupData, error: setupError } = await supabase
        .from('business_ideas')
        .select('details')
        .eq(column, id || slug)
        .eq('status', 'approved')
        .maybeSingle();
      if (setupError?.code === '42703' && setupError.message.includes('details')) {
        setupDetailsStatus = 'Idea loaded, but its additional setup notes are unavailable. Run supabase/member-access-simplification.sql in the Supabase SQL Editor to add them.';
      } else if (setupError) {
        throw setupError;
      } else {
        setupDetails = setupData?.details || null;
      }
    }

    renderIdea(data);
    if (isSignedIn) {
      renderSetupGuide(setupDetails, data.slug || slug);
      if (setupDetailsStatus) setStatus(setupDetailsStatus, 'error');
    } else {
      document.getElementById('ideaGuideSignIn').hidden = false;
    }
    return;
  }

  if (staticIdea.name && staticIdea.description) {
    renderIdea(staticIdea);
    document.getElementById('ideaGuideSignIn').hidden = false;
  } else {
    setStatus('Idea details are unavailable. Return to the listing and choose one of the starter ideas.', 'error');
  }
}

loadIdea().catch(error => {
  console.error('Could not load business idea details.', error);
  setStatus(`Could not load this idea: ${error.message}`, 'error');
});
