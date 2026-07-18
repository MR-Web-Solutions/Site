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
  const openCount = rows.filter((entry) => entry.status !== 'done').length;
  count.textContent = `${openCount} open · ${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'} total`;
  list.innerHTML = '';
  if (!rows.length) { list.innerHTML = '<p class="empty-state">No enquiries yet.</p>'; return; }
  rows.forEach((entry) => {
    const card = document.createElement('article');
    const isDone = entry.status === 'done';
    card.className = `enquiry-card${isDone ? ' is-done' : ''}`;
    const title = document.createElement('h2'); title.textContent = entry.name;
    const details = document.createElement('p'); details.className = 'enquiry-meta';
    details.textContent = `${entry.business || 'No business supplied'} · ${entry.email} · ${new Date(entry.created_at).toLocaleString()}`;
    const packageLine = document.createElement('p'); packageLine.className = 'enquiry-package'; packageLine.textContent = entry.package || 'General enquiry';
    const message = document.createElement('p'); message.className = 'enquiry-copy'; message.textContent = entry.message;
    const status = document.createElement('span'); status.className = `enquiry-status ${isDone ? 'done' : 'open'}`; status.textContent = isDone ? 'Done' : 'Open';
    const actions = document.createElement('div'); actions.className = 'enquiry-actions';
    const toggle = document.createElement('button'); toggle.className = 'button small'; toggle.type = 'button'; toggle.textContent = isDone ? 'Mark open' : 'Mark done';
    toggle.addEventListener('click', () => updateEnquiry(entry.id, isDone ? 'open' : 'done'));
    const remove = document.createElement('button'); remove.className = 'button small danger'; remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteEnquiry(entry.id, entry.name));
    actions.append(toggle, remove);
    card.append(status, title, details, packageLine, message, actions); list.append(card);
  });
}

async function updateEnquiry(id, status) {
  const { error } = await supabase.from('enquiries').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id);
  if (error) { window.alert('We could not update this enquiry. Please make sure the dashboard update policy has been added.'); return; }
  await openDashboard();
}

async function deleteEnquiry(id, name) {
  if (!window.confirm(`Delete the enquiry from ${name}? This cannot be undone.`)) return;
  const { error } = await supabase.from('enquiries').delete().eq('id', id);
  if (error) { window.alert('We could not delete this enquiry. Please make sure the dashboard delete policy has been added.'); return; }
  await openDashboard();
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
