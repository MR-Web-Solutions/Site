import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector) => document.querySelector(selector);
const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const loginPanel = $('#login-panel');
const dashboardPanel = $('#dashboard-panel');
const loginForm = $('#login-form');
const loginMessage = $('#login-message');
const list = $('#enquiries-list');
const count = $('#enquiry-count');
const financeMessage = $('#finance-message');
const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && new URLSearchParams(window.location.search).get('preview') === 'finance';
let transactions = [];
let allocations = [];
let budgets = [];

function monthValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 7);
}

function todayValue() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function shiftMonth(value, offset) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function updateBudgetMonthLimits() {
  const input = $('#budget-month');
  const start = monthValue();
  input.min = start;
  input.max = shiftMonth(start, Number($('#budget-horizon').value) - 1);
  if (!input.value || input.value < input.min || input.value > input.max) input.value = shiftMonth(start, 1);
}

function monthBounds(value) {
  const [year, month] = value.split('-').map(Number);
  const start = `${value}-01`;
  const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { start, end };
}

function showFinanceMessage(message, type = 'success') {
  financeMessage.textContent = message;
  financeMessage.className = `finance-notice show ${type}`;
  window.setTimeout(() => { financeMessage.className = 'finance-notice'; }, 4500);
}

function showBudgetMessage(message, type = 'success') {
  const element = $('#budget-message');
  element.textContent = message;
  element.className = `finance-notice show ${type}`;
  window.setTimeout(() => { element.className = 'finance-notice'; }, 4500);
}

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
  await loadEnquiries();
}

async function deleteEnquiry(id, name) {
  if (!window.confirm(`Delete the enquiry from ${name}? This cannot be undone.`)) return;
  const { error } = await supabase.from('enquiries').delete().eq('id', id);
  if (error) { window.alert('We could not delete this enquiry. Please make sure the dashboard delete policy has been added.'); return; }
  await loadEnquiries();
}

async function loadEnquiries() {
  const { data, error } = await supabase.from('enquiries').select('*').order('created_at', { ascending: false });
  if (error) { list.innerHTML = '<p class="empty-state">You do not have access to these enquiries, or the database setup has not been run yet.</p>'; count.textContent = 'Access unavailable'; }
  else displayEnquiries(data);
}

function renderTransactions() {
  const body = $('#transactions-body');
  body.innerHTML = '';
  $('#transaction-count').textContent = `${transactions.length} ${transactions.length === 1 ? 'record' : 'records'}`;
  $('#transactions-empty').hidden = transactions.length > 0;
  transactions.forEach((entry) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${new Date(`${entry.transaction_date}T00:00:00`).toLocaleDateString('en-ZA')}</td>
      <td><span class="transaction-type ${entry.type}">${entry.type}</span></td>
      <td></td><td></td><td></td>
      <td class="amount ${entry.type}">${entry.type === 'expense' ? '−' : '+'}${currency.format(Number(entry.amount))}</td>
      <td></td>`;
    row.children[2].textContent = entry.category;
    row.children[3].textContent = entry.description;
    row.children[4].textContent = entry.payment_method || '—';
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'icon-button danger'; remove.setAttribute('aria-label', `Delete ${entry.description}`); remove.textContent = '×';
    remove.addEventListener('click', () => deleteTransaction(entry));
    row.lastElementChild.append(remove);
    body.append(row);
  });
}

function renderAllocationHistory() {
  const container = $('#allocation-history');
  container.innerHTML = '';
  if (!allocations.length) { container.innerHTML = '<p class="empty-state">No profit allocations saved for this month.</p>'; return; }
  allocations.forEach((allocation) => {
    const card = document.createElement('article');
    card.className = 'allocation-record';
    const items = (allocation.profit_allocation_items || []).map((item) => `<li><span></span><b>${Number(item.percentage).toFixed(1)}% · ${currency.format(Number(item.amount))}</b></li>`).join('');
    card.innerHTML = `<div class="allocation-record-top"><div><h4></h4><p>${new Date(`${allocation.allocation_date}T00:00:00`).toLocaleDateString('en-ZA')} · Profit base ${currency.format(Number(allocation.profit_base))}</p></div><strong>${currency.format(Number(allocation.total_allocated))}</strong></div><ul>${items}</ul>`;
    card.querySelector('h4').textContent = allocation.period_label;
    (allocation.profit_allocation_items || []).forEach((item, index) => { card.querySelectorAll('li span')[index].textContent = item.recipient; });
    container.append(card);
  });
}

function financeTotals() {
  const income = transactions.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = transactions.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0);
  const profit = income - expenses;
  const allocated = allocations.reduce((sum, entry) => sum + Number(entry.total_allocated), 0);
  return { income, expenses, profit, allocated, remaining: profit - allocated };
}

function renderFinanceSummary() {
  const totals = financeTotals();
  $('#income-total').textContent = currency.format(totals.income);
  $('#expense-total').textContent = currency.format(totals.expenses);
  $('#profit-total').textContent = currency.format(totals.profit);
  $('#allocated-total').textContent = currency.format(totals.allocated);
  $('#remaining-profit').textContent = `${currency.format(totals.remaining)} remains`;
  $('#allocation-profit-base').textContent = `${currency.format(Math.max(totals.profit, 0))} available`;
  updateAllocationTotals();
}

async function loadFinances() {
  const { start, end } = monthBounds($('#finance-month').value);
  const [transactionResult, allocationResult] = await Promise.all([
    supabase.from('financial_transactions').select('*').gte('transaction_date', start).lt('transaction_date', end).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('profit_allocations').select('*, profit_allocation_items(*)').gte('allocation_date', start).lt('allocation_date', end).order('allocation_date', { ascending: false })
  ]);
  if (transactionResult.error || allocationResult.error) {
    showFinanceMessage('Finance storage is not ready yet. Run finance-setup.sql in Supabase, then refresh this page.', 'error');
    transactions = []; allocations = [];
  } else {
    transactions = transactionResult.data || [];
    allocations = allocationResult.data || [];
  }
  renderTransactions();
  renderAllocationHistory();
  renderFinanceSummary();
}

function budgetTotals() {
  const income = budgets.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = budgets.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0);
  return { income, expenses, balance: income - expenses };
}

function renderBudgetSummary() {
  const totals = budgetTotals();
  $('#budget-income-total').textContent = currency.format(totals.income);
  $('#budget-expense-total').textContent = currency.format(totals.expenses);
  $('#budget-balance-total').textContent = currency.format(totals.balance);
  $('#budget-balance-total').classList.toggle('negative', totals.balance < 0);
}

function renderBudgetMonths() {
  const container = $('#budget-months');
  const horizon = Number($('#budget-horizon').value);
  const start = monthValue();
  container.innerHTML = '';
  for (let index = 0; index < horizon; index += 1) {
    const period = shiftMonth(start, index);
    const periodItems = budgets.filter((entry) => entry.period_month.slice(0, 7) === period);
    const income = periodItems.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount), 0);
    const expenses = periodItems.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0);
    const balance = income - expenses;
    const card = document.createElement('article');
    card.className = 'budget-month-card';
    const label = new Date(`${period}-01T00:00:00`).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
    card.innerHTML = `<div class="budget-month-top"><strong>${label}</strong><span class="${balance < 0 ? 'negative' : 'positive'}">${currency.format(balance)}</span></div>
      <div class="budget-bar"><span></span></div>
      <div class="budget-month-details"><span>Income <b>${currency.format(income)}</b></span><span>Costs <b>${currency.format(expenses)}</b></span></div>`;
    const maximum = Math.max(income, expenses, 1);
    card.querySelector('.budget-bar span').style.width = `${Math.min(100, Math.abs(balance) / maximum * 100)}%`;
    card.querySelector('.budget-bar').classList.toggle('negative', balance < 0);
    container.append(card);
  }
}

function renderBudgetItems() {
  const body = $('#budget-body');
  body.innerHTML = '';
  $('#budget-count').textContent = `${budgets.length} ${budgets.length === 1 ? 'estimate' : 'estimates'}`;
  $('#budget-empty').hidden = budgets.length > 0;
  budgets.forEach((entry) => {
    const row = document.createElement('tr');
    const period = entry.period_month.slice(0, 7);
    const monthLabel = new Date(`${period}-01T00:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
    row.innerHTML = `<td>${monthLabel}</td><td><span class="forecast-type ${entry.type}">${entry.type === 'income' ? 'Expected income' : 'Planned expense'}</span></td><td></td><td></td><td class="amount ${entry.type}">${currency.format(Number(entry.amount))}</td><td></td>`;
    row.children[2].textContent = entry.category;
    row.children[3].textContent = entry.description;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'icon-button danger'; remove.setAttribute('aria-label', `Delete forecast ${entry.description}`); remove.textContent = '×';
    remove.addEventListener('click', () => deleteBudgetItem(entry));
    row.lastElementChild.append(remove);
    body.append(row);
  });
  renderBudgetSummary();
  renderBudgetMonths();
}

async function loadBudgets() {
  if (isLocalPreview) { renderBudgetItems(); return; }
  const start = monthValue();
  const end = shiftMonth(start, Number($('#budget-horizon').value));
  const { data, error } = await supabase.from('budget_forecasts').select('*')
    .gte('period_month', `${start}-01`).lt('period_month', `${end}-01`)
    .order('period_month', { ascending: true }).order('created_at', { ascending: true });
  if (error) {
    budgets = [];
    showBudgetMessage('Budget storage is not ready yet. Run the updated finance-setup.sql in Supabase, then refresh this page.', 'error');
  } else {
    budgets = data || [];
  }
  renderBudgetItems();
}

$('#budget-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isLocalPreview) { showBudgetMessage('This preview uses sample figures. Sign in on the live site to save forecasts.', 'error'); return; }
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    period_month: `${$('#budget-month').value}-01`,
    type: $('#budget-type').value,
    amount: Number($('#budget-amount').value),
    category: $('#budget-category').value.trim(),
    description: $('#budget-description').value.trim(),
    created_by: user?.email || null
  };
  const { error } = await supabase.from('budget_forecasts').insert(payload);
  if (error) { showBudgetMessage(error.message, 'error'); return; }
  event.target.reset();
  $('#budget-month').value = shiftMonth(monthValue(), 1);
  showBudgetMessage('Forecast item saved. Actual finances are unchanged.');
  await loadBudgets();
});

async function deleteBudgetItem(entry) {
  if (isLocalPreview) { showBudgetMessage('Sample forecasts cannot be changed in preview mode.', 'error'); return; }
  if (!window.confirm(`Delete the forecast for ${entry.description}?`)) return;
  const { error } = await supabase.from('budget_forecasts').delete().eq('id', entry.id);
  if (error) { showBudgetMessage(error.message, 'error'); return; }
  showBudgetMessage('Forecast item deleted.');
  await loadBudgets();
}

$('#transaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isLocalPreview) { showFinanceMessage('This preview uses sample figures. Sign in on the live site to save records.', 'error'); return; }
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    type: $('#transaction-type').value,
    amount: Number($('#transaction-amount').value),
    transaction_date: $('#transaction-date').value,
    category: $('#transaction-category').value.trim(),
    payment_method: $('#transaction-method').value,
    description: $('#transaction-reference').value.trim(),
    created_by: user?.email || null
  };
  const { error } = await supabase.from('financial_transactions').insert(payload);
  if (error) { showFinanceMessage(error.message, 'error'); return; }
  event.target.reset();
  $('#transaction-date').value = todayValue();
  showFinanceMessage('Transaction saved.');
  await loadFinances();
});

async function deleteTransaction(entry) {
  if (isLocalPreview) { showFinanceMessage('Sample transactions cannot be changed in preview mode.', 'error'); return; }
  if (!window.confirm(`Delete ${entry.description} for ${currency.format(Number(entry.amount))}?`)) return;
  const { error } = await supabase.from('financial_transactions').delete().eq('id', entry.id);
  if (error) { showFinanceMessage(error.message, 'error'); return; }
  showFinanceMessage('Transaction deleted.');
  await loadFinances();
}

function addAllocationLine(recipient = '', percentage = '') {
  const row = document.createElement('div');
  row.className = 'allocation-line';
  row.innerHTML = `<input class="allocation-recipient" required aria-label="Allocation recipient or purpose" placeholder="e.g. Tax reserve">
    <div class="percentage-input"><input class="allocation-percent" type="number" min="0.1" max="100" step="0.1" required aria-label="Allocation percentage" placeholder="0"><span>%</span></div>
    <output class="allocation-line-amount">R0.00</output>
    <button class="icon-button danger" type="button" aria-label="Remove allocation line">×</button>`;
  row.querySelector('.allocation-recipient').value = recipient;
  row.querySelector('.allocation-percent').value = percentage;
  row.querySelector('.allocation-percent').addEventListener('input', updateAllocationTotals);
  row.querySelector('button').addEventListener('click', () => { row.remove(); updateAllocationTotals(); });
  $('#allocation-items').append(row);
  updateAllocationTotals();
}

function updateAllocationTotals() {
  const profit = Math.max(financeTotals().profit, 0);
  const lines = [...document.querySelectorAll('.allocation-line')];
  let percentage = 0;
  lines.forEach((line) => {
    const value = Number(line.querySelector('.allocation-percent').value || 0);
    percentage += value;
    line.querySelector('.allocation-line-amount').textContent = currency.format(profit * value / 100);
  });
  $('#allocation-percentage').textContent = `${percentage.toFixed(1)}%`;
  $('#allocation-amount').textContent = currency.format(profit * percentage / 100);
  $('#allocation-percentage').classList.toggle('over-limit', percentage > 100);
}

$('#add-allocation-item').addEventListener('click', () => addAllocationLine());

$('#allocation-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isLocalPreview) { showFinanceMessage('This preview uses sample figures. Sign in on the live site to save an allocation.', 'error'); return; }
  const totals = financeTotals();
  if (totals.profit <= 0) { showFinanceMessage('There is no positive profit available to allocate for this month.', 'error'); return; }
  const items = [...document.querySelectorAll('.allocation-line')].map((line) => ({
    recipient: line.querySelector('.allocation-recipient').value.trim(),
    percentage: Number(line.querySelector('.allocation-percent').value)
  }));
  const percentageTotal = items.reduce((sum, item) => sum + item.percentage, 0);
  if (!items.length || percentageTotal <= 0 || percentageTotal > 100) {
    showFinanceMessage('Add at least one allocation and keep the total at or below 100%.', 'error'); return;
  }
  const amountTotal = totals.profit * percentageTotal / 100;
  if (amountTotal > totals.remaining + 0.01) {
    showFinanceMessage(`Only ${currency.format(Math.max(totals.remaining, 0))} remains unallocated for this month.`, 'error'); return;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { data: allocation, error } = await supabase.from('profit_allocations').insert({
    allocation_date: `${$('#finance-month').value}-01`,
    period_label: $('#allocation-label').value.trim(),
    profit_base: totals.profit,
    total_allocated: amountTotal,
    notes: $('#allocation-notes').value.trim() || null,
    created_by: user?.email || null
  }).select().single();
  if (error) { showFinanceMessage(error.message, 'error'); return; }
  const { error: itemsError } = await supabase.from('profit_allocation_items').insert(items.map((item) => ({
    allocation_id: allocation.id,
    recipient: item.recipient,
    percentage: item.percentage,
    amount: totals.profit * item.percentage / 100
  })));
  if (itemsError) {
    await supabase.from('profit_allocations').delete().eq('id', allocation.id);
    showFinanceMessage(itemsError.message, 'error'); return;
  }
  event.target.reset();
  $('#allocation-items').innerHTML = '';
  addAllocationLine('Owner distribution', 50);
  addAllocationLine('Tax reserve', 25);
  addAllocationLine('Business reinvestment', 25);
  showFinanceMessage('Profit allocation saved.');
  await loadFinances();
});

$('#export-finances').addEventListener('click', () => {
  if (!transactions.length) { showFinanceMessage('There are no transactions to export for this month.', 'error'); return; }
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Date', 'Type', 'Category', 'Description', 'Payment method', 'Amount (ZAR)'], ...transactions.map((entry) => [entry.transaction_date, entry.type, entry.category, entry.description, entry.payment_method, Number(entry.amount).toFixed(2)])];
  const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `mr-web-finances-${$('#finance-month').value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelectorAll('.finance-tab').forEach((tab) => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.finance-tab').forEach((button) => button.classList.toggle('is-active', button === tab));
    document.querySelectorAll('.finance-workspace').forEach((view) => { view.hidden = view.id !== tab.dataset.financeView; });
    if (tab.dataset.financeView === 'budget-finance-view') await loadBudgets();
  });
});

document.querySelectorAll('.dashboard-tab').forEach((tab) => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.dashboard-tab').forEach((button) => button.classList.toggle('is-active', button === tab));
    document.querySelectorAll('.dashboard-view').forEach((view) => { view.hidden = view.id !== tab.dataset.view; });
    if (tab.dataset.view === 'finance-view') await loadFinances();
  });
});

async function openDashboard() {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  await loadEnquiries();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); loginMessage.textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email: $('#staff-email').value, password: $('#staff-password').value });
  if (error) { loginMessage.textContent = error.message; return; }
  loginMessage.textContent = '';
  await openDashboard();
});

$('#sign-out').addEventListener('click', async () => {
  await supabase.auth.signOut({ scope: 'local' });
  dashboardPanel.hidden = true; loginPanel.hidden = false; loginForm.reset();
});

$('#finance-month').value = monthValue();
$('#transaction-date').value = todayValue();
$('#budget-month').value = shiftMonth(monthValue(), 1);
updateBudgetMonthLimits();
addAllocationLine('Owner distribution', 50);
addAllocationLine('Tax reserve', 25);
addAllocationLine('Business reinvestment', 25);
$('#finance-month').addEventListener('change', loadFinances);
$('#budget-horizon').addEventListener('change', async () => {
  updateBudgetMonthLimits();
  await loadBudgets();
});

if (isLocalPreview) {
  transactions = [
    { id: 'demo-1', transaction_date: `${monthValue()}-21`, type: 'income', amount: 6800, category: 'Website project', description: 'Business Website final payment', payment_method: 'Bank transfer' },
    { id: 'demo-2', transaction_date: `${monthValue()}-16`, type: 'income', amount: 1650, category: 'Maintenance plan', description: 'Three monthly care plans', payment_method: 'Debit order' },
    { id: 'demo-3', transaction_date: `${monthValue()}-12`, type: 'expense', amount: 899, category: 'Software', description: 'Design and productivity tools', payment_method: 'Card' },
    { id: 'demo-4', transaction_date: `${monthValue()}-08`, type: 'expense', amount: 520, category: 'Domain and hosting', description: 'Client hosting renewals', payment_method: 'Card' },
    { id: 'demo-5', transaction_date: `${monthValue()}-04`, type: 'expense', amount: 750, category: 'Marketing', description: 'Local campaign spend', payment_method: 'Bank transfer' }
  ];
  allocations = [{
    id: 'demo-allocation',
    allocation_date: `${monthValue()}-01`,
    period_label: 'Monthly profit plan',
    profit_base: 6281,
    total_allocated: 4710.75,
    profit_allocation_items: [
      { recipient: 'Owner distribution', percentage: 35, amount: 2198.35 },
      { recipient: 'Tax reserve', percentage: 20, amount: 1256.20 },
      { recipient: 'Business reinvestment', percentage: 20, amount: 1256.20 }
    ]
  }];
  budgets = [
    { id: 'budget-1', period_month: `${shiftMonth(monthValue(), 1)}-01`, type: 'expense', amount: 400, category: 'Software', description: 'Codex subscription' },
    { id: 'budget-2', period_month: `${shiftMonth(monthValue(), 1)}-01`, type: 'expense', amount: 300, category: 'Domains', description: 'Upcoming domain renewals' },
    { id: 'budget-3', period_month: `${shiftMonth(monthValue(), 1)}-01`, type: 'income', amount: 3500, category: 'Website project', description: 'Expected client balance' },
    { id: 'budget-4', period_month: `${shiftMonth(monthValue(), 2)}-01`, type: 'expense', amount: 900, category: 'Marketing', description: 'Campaign budget' },
    { id: 'budget-5', period_month: `${shiftMonth(monthValue(), 2)}-01`, type: 'income', amount: 1800, category: 'Maintenance income', description: 'Care plan renewals' }
  ];
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  document.querySelectorAll('.dashboard-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === 'finance-view'));
  document.querySelectorAll('.dashboard-view').forEach((view) => { view.hidden = view.id !== 'finance-view'; });
  renderTransactions();
  renderAllocationHistory();
  renderFinanceSummary();
  showFinanceMessage('Preview mode — the figures below are examples and will not be saved.');
} else {
  await supabase.auth.signOut({ scope: 'local' });
  dashboardPanel.hidden = true;
  loginPanel.hidden = false;
}
