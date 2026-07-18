import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const loginPanel = document.querySelector('#login-panel');
const dashboardPanel = document.querySelector('#dashboard-panel');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const list = document.querySelector('#enquiries-list');
const count = document.querySelector('#enquiry-count');

function displayEnquiries(rows) {
  count.textContent = `${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'}`;
  list.innerHTML = '';
  if (!rows.length) { list.innerHTML = '<p class="empty-state">No enquiries yet.</p>'; return; }
  rows.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'enquiry-card';
    const title = document.createElement('h2'); title.textContent = entry.name;
    const details = document.createElement('p'); details.className = 'enquiry-meta';
    details.textContent = `${entry.business || 'No business supplied'} · ${entry.email} · ${new Date(entry.created_at).toLocaleString()}`;
    const packageLine = document.createElement('p'); packageLine.className = 'enquiry-package'; packageLine.textContent = entry.package || 'General enquiry';
    const message = document.createElement('p'); message.className = 'enquiry-copy'; message.textContent = entry.message;
    card.append(title, details, packageLine, message); list.append(card);
  });
}

async function openDashboard() {
  const { data, error } = await supabase.from('enquiries').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = '<p class="empty-state">You do not have access to these enquiries, or the database setup has not been run yet.</p>'; count.textContent = 'Access unavailable'; }
  else displayEnquiries(data);
  loginPanel.hidden = true; dashboardPanel.hidden = false;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); loginMessage.textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email: document.querySelector('#staff-email').value, password: document.querySelector('#staff-password').value });
  if (error) { loginMessage.textContent = error.message; return; }
  await openDashboard();
});

document.querySelector('#sign-out').addEventListener('click', async () => { await supabase.auth.signOut(); dashboardPanel.hidden = true; loginPanel.hidden = false; loginForm.reset(); });

const { data: { session } } = await supabase.auth.getSession();
if (session) openDashboard();
