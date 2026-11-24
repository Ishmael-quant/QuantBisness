function safeHttpUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function appendIdeaImageCredit(parent, idea, className = 'idea-image-credit') {
  const creditUrl = safeHttpUrl(idea.image_credit_url);
  const licenseUrl = safeHttpUrl(idea.image_license_url);
  if (!idea.image_credit || !creditUrl || !idea.image_license || !licenseUrl) return;

  const caption = document.createElement('p');
  caption.className = className;
  caption.append(document.createTextNode('Photo: '));
  const creditLink = document.createElement('a');
  creditLink.href = creditUrl;
  creditLink.target = '_blank';
  creditLink.rel = 'noopener noreferrer';
  creditLink.textContent = idea.image_credit;
  const licenseLink = document.createElement('a');
  licenseLink.href = licenseUrl;
  licenseLink.target = '_blank';
  licenseLink.rel = 'noopener noreferrer';
  licenseLink.textContent = idea.image_license;
  caption.append(creditLink, document.createTextNode(' · '), licenseLink);
  parent.append(caption);
}
