import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const button = document.querySelector('.menu-button');
const links = document.querySelector('.nav-links');
if (button) button.addEventListener('click', () => { links.classList.toggle('open'); button.setAttribute('aria-expanded', links.classList.contains('open')); });
document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => links?.classList.remove('open')));

const form = document.querySelector('form');
if (form) {
  const selectedPackage = new URLSearchParams(window.location.search).get('package');
  const serviceSelect = document.querySelector('#service');
  const messageField = document.querySelector('#message');
  const formMessage = document.querySelector('.form-message');
  if (selectedPackage && serviceSelect) {
    const option = Array.from(serviceSelect.options).find((item) => item.value === selectedPackage);
    if (option) serviceSelect.value = selectedPackage;
    if (messageField && !messageField.value) messageField.value = `I'm interested in the ${selectedPackage}. Please tell me more.`;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = { name: document.querySelector('#name').value.trim(), business: document.querySelector('#business').value.trim(), email: document.querySelector('#email').value.trim(), package: serviceSelect?.value || 'General enquiry', message: messageField.value.trim() };
    submitButton.disabled = true; formMessage.classList.add('show'); formMessage.textContent = 'Sending your enquiry…';
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-enquiry`, { method: 'POST', headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Submission failed');
      form.reset(); formMessage.textContent = 'Thank you — your enquiry has been received. We will be in touch soon.';
    } catch { formMessage.textContent = 'We could not send your enquiry just yet. Please message us on WhatsApp instead.'; }
    submitButton.disabled = false;
  });
}

const heroMessage = document.querySelector('[data-rotating-message]');
if (heroMessage) {
  const messages = ['Your business deserves a <em>powerful</em> online presence.', 'Make a <em>stronger</em> first impression online.', 'Turn more visitors into <em>real customers.</em>', 'A smarter website starts with a <em>clear vision.</em>', 'Give your business the <em>digital edge.</em>'];
  let index = Math.floor(Math.random() * messages.length);
  const show = () => { heroMessage.classList.remove('message-visible'); window.setTimeout(() => { heroMessage.innerHTML = messages[index]; heroMessage.classList.add('message-visible'); }, 180); };
  show(); window.setInterval(() => { index = (index + 1) % messages.length; show(); }, 5 * 60 * 1000);
}
