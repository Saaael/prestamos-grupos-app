const STORAGE_KEY = 'prestamos-grupos-app-v1';

const state = {
  groups: []
};

const refs = {
  groupForm: document.getElementById('groupForm'),
  personForm: document.getElementById('personForm'),
  groupName: document.getElementById('groupName'),
  personGroupSelect: document.getElementById('personGroupSelect'),
  personName: document.getElementById('personName'),
  loanAmount: document.getElementById('loanAmount'),
  interestAmount: document.getElementById('interestAmount'),
  grantDate: document.getElementById('grantDate'),
  groupsContainer: document.getElementById('groupsContainer'),
  summaryGrid: document.getElementById('summaryGrid'),
  resetDemoBtn: document.getElementById('resetDemoBtn')
};

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value + 'T12:00:00');
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function addDays(dateString, days) {
  const date = new Date(dateString + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function calculateSchedule(person) {
  const principal = Number(person.loanAmount || 0);
  const interest = Number(person.interestAmount || 0);
  const total = principal + interest;
  const installments = 12;
  const payment = total / installments;
  const capitalPerInstallment = principal / installments;
  const interestPerInstallment = interest / installments;
  const firstDueDate = person.grantDate ? addDays(person.grantDate, 7) : null;
  const schedule = [];

  let remaining = principal;

  for (let i = 0; i < installments; i += 1) {
    const dueDate = firstDueDate ? addDays(firstDueDate, i * 7) : null;
    const capitalPaid = i === installments - 1 ? remaining : capitalPerInstallment;
    remaining = i === installments - 1 ? 0 : remaining - capitalPaid;

    const installment = {
      index: i + 1,
      date: dueDate,
      payment: payment,
      capital: Number(capitalPaid.toFixed(2)),
      interest: Number(interestPerInstallment.toFixed(2)),
      remainingBalance: Number(Math.max(remaining, 0).toFixed(2)),
      paid: !!person.schedule?.[i]?.paid,
      paidDate: person.schedule?.[i]?.paidDate || ''
    };

    schedule.push(installment);
  }

  return schedule;
}

function getDefaultGroups() {
  const grantedDate = '2026-09-18';
  const groupId = uid('group');
  const personId = uid('person');

  const samplePerson = {
    id: personId,
    name: 'San Juan Raymundo María Concepción',
    loanAmount: 10000,
    interestAmount: 2000,
    grantDate: grantedDate,
    notes: '',
    schedule: []
  };

  samplePerson.schedule = calculateSchedule(samplePerson);

  return [{
    id: groupId,
    name: 'Grupo de Préstamos',
    people: [samplePerson]
  }];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.groups));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        state.groups = parsed.map(group => ({
          ...group,
          people: (group.people || []).map(person => ({
            ...person,
            schedule: Array.isArray(person.schedule) ? person.schedule : calculateSchedule(person)
          }))
        }));
        return;
      }
    } catch (error) {
      console.error('Error loading state', error);
    }
  }

  state.groups = getDefaultGroups();
  saveState();
}

function ensurePersonSchedule(person) {
  if (!person.schedule || !Array.isArray(person.schedule) || person.schedule.length === 0) {
    person.schedule = calculateSchedule(person);
  }
}

function rebuildGroupSelect() {
  refs.personGroupSelect.innerHTML = '';

  state.groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    refs.personGroupSelect.appendChild(option);
  });
}

function getGroupTotals(group) {
  const totalLoan = group.people.reduce((sum, person) => sum + Number(person.loanAmount || 0), 0);
  const totalInterest = group.people.reduce((sum, person) => sum + Number(person.interestAmount || 0), 0);
  const totalPaid = group.people.reduce((sum, person) => {
    const personPaid = (person.schedule || []).filter(item => item.paid).length;
    return sum + personPaid;
  }, 0);
  const totalInstallments = group.people.reduce((sum, person) => sum + (person.schedule || []).length, 0);

  return {
    totalLoan,
    totalInterest,
    totalPaid,
    totalInstallments
  };
}

function renderSummary() {
  const groups = state.groups;
  const totalGroups = groups.length;
  const totalLoan = groups.reduce((sum, group) => sum + group.people.reduce((s, p) => s + Number(p.loanAmount || 0), 0), 0);
  const totalInterest = groups.reduce((sum, group) => sum + group.people.reduce((s, p) => s + Number(p.interestAmount || 0), 0), 0);
  const totalPaid = groups.reduce((sum, group) => sum + group.people.reduce((s, p) => s + (p.schedule || []).filter(item => item.paid).length, 0), 0);
  const totalInstallments = groups.reduce((sum, group) => sum + group.people.reduce((s, p) => s + (p.schedule || []).length, 0), 0);

  refs.summaryGrid.innerHTML = `
    <div class="stat-card">
      <div class="label">Grupos</div>
      <div class="value">${totalGroups}</div>
    </div>
    <div class="stat-card">
      <div class="label">Capital</div>
      <div class="value">${formatCurrency(totalLoan)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Interés</div>
      <div class="value">${formatCurrency(totalInterest)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Pagos</div>
      <div class="value">${totalPaid}/${totalInstallments}</div>
    </div>
  `;
}

function statusClass(item, person) {
  if (item.paid) return 'paid';
  const today = new Date();
  const dueDate = item.date ? new Date(item.date + 'T12:00:00') : null;
  if (dueDate && dueDate < today) return 'late';
  return 'pending';
}

function renderGroups() {
  refs.groupsContainer.innerHTML = '';

  if (!state.groups.length) {
    refs.groupsContainer.innerHTML = '<div class="empty-state">Aún no hay grupos creados.</div>';
    return;
  }

  state.groups.forEach(group => {
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';

    const totals = getGroupTotals(group);
    groupCard.innerHTML = `
      <div class="group-header">
        <h3 class="group-name">${group.name}</h3>
        <span class="group-total">${group.people.length} personas</span>
      </div>
      <div class="person-list"></div>
    `;

    const personList = groupCard.querySelector('.person-list');

    if (!group.people.length) {
      personList.innerHTML = '<div class="empty-state">Este grupo todavía no tiene personas.</div>';
      refs.groupsContainer.appendChild(groupCard);
      return;
    }

    group.people.forEach(person => {
      ensurePersonSchedule(person);
      const personItem = document.createElement('div');
      personItem.className = 'person-item';

      const total = Number(person.loanAmount || 0) + Number(person.interestAmount || 0);
      const paidCount = (person.schedule || []).filter(item => item.paid).length;
      const nextInstallment = (person.schedule || []).find(item => !item.paid) || (person.schedule || []).at(-1);

      personItem.innerHTML = `
        <div class="person-top">
          <p class="person-name">${person.name}</p>
          <span class="status-badge ${nextInstallment && nextInstallment.paid ? 'paid' : 'pending'}">
            ${paidCount}/${(person.schedule || []).length} pagos
          </span>
        </div>
        <div class="person-meta">
          <span>Capital: ${formatCurrency(person.loanAmount)}</span>
          <span>Interés: ${formatCurrency(person.interestAmount)}</span>
          <span>Total: ${formatCurrency(total)}</span>
          <span>Pago semanal: ${formatCurrency(total / 12)}</span>
        </div>
        <div class="person-meta">
          <span>Entrega: ${formatDate(person.grantDate)}</span>
          <span>Próximo pago: ${nextInstallment ? formatDate(nextInstallment.date) : 'Completado'}</span>
        </div>
        <div class="person-actions">
          <button class="btn btn-secondary toggle-schedule" data-person-id="${person.id}">Ver pagos</button>
        </div>
        <div class="schedule" data-schedule-for="${person.id}" style="display: none;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Pago</th>
                <th>Capital</th>
                <th>Interés</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th>Pagado</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;

      const tbody = personItem.querySelector('tbody');
      (person.schedule || []).forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${item.index}</td>
          <td>${formatDate(item.date)}</td>
          <td>${formatCurrency(item.payment)}</td>
          <td>${formatCurrency(item.capital)}</td>
          <td>${formatCurrency(item.interest)}</td>
          <td>${formatCurrency(item.remainingBalance)}</td>
          <td><span class="status-badge ${statusClass(item, person)}">${item.paid ? 'Pagado' : (item.date && new Date(item.date + 'T12:00:00') < new Date() ? 'Atrasado' : 'Pendiente')}</span></td>
          <td class="checkbox-wrap">
            <input type="checkbox" data-toggle-payment="${person.id}" data-index="${item.index - 1}" ${item.paid ? 'checked' : ''} />
          </td>
        `;
        tbody.appendChild(row);
      });

      personList.appendChild(personItem);
    });

    refs.groupsContainer.appendChild(groupCard);
  });
}

function refreshPage() {
  rebuildGroupSelect();
  renderSummary();
  renderGroups();
  saveState();
}

function addGroup(event) {
  event.preventDefault();
  const name = refs.groupName.value.trim();
  if (!name) return;

  state.groups.push({
    id: uid('group'),
    name,
    people: []
  });

  refs.groupForm.reset();
  refreshPage();
}

function addPerson(event) {
  event.preventDefault();

  const groupId = refs.personGroupSelect.value;
  const name = refs.personName.value.trim();
  const loanAmount = Number(refs.loanAmount.value || 0);
  const interestAmount = Number(refs.interestAmount.value || 0);
  const grantDate = refs.grantDate.value;

  if (!groupId || !name || !loanAmount || !grantDate) return;

  const group = state.groups.find(item => item.id === groupId);
  if (!group) return;

  const newPerson = {
    id: uid('person'),
    name,
    loanAmount,
    interestAmount: interestAmount || loanAmount * 0.2,
    grantDate,
    schedule: []
  };

  newPerson.schedule = calculateSchedule(newPerson);
  group.people.push(newPerson);

  refs.personForm.reset();
  refreshPage();
}

function toggleSchedule(personId) {
  const scheduleEl = document.querySelector(`[data-schedule-for="${personId}"]`);
  if (!scheduleEl) return;
  scheduleEl.style.display = scheduleEl.style.display === 'none' ? 'block' : 'none';
}

function togglePayment(personId, index) {
  const group = state.groups.find(item => item.people.some(person => person.id === personId));
  if (!group) return;

  const person = group.people.find(item => item.id === personId);
  if (!person || !Array.isArray(person.schedule)) return;

  const item = person.schedule[index];
  if (!item) return;

  item.paid = !item.paid;
  item.paidDate = item.paid ? new Date().toISOString().split('T')[0] : '';
  refreshPage();
}

function bindEvents() {
  refs.groupForm.addEventListener('submit', addGroup);
  refs.personForm.addEventListener('submit', addPerson);

  refs.groupsContainer.addEventListener('click', event => {
    const toggleBtn = event.target.closest('.toggle-schedule');
    if (toggleBtn) {
      toggleSchedule(toggleBtn.dataset.personId);
    }
  });

  refs.groupsContainer.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-toggle-payment]');
    if (checkbox) {
      togglePayment(checkbox.dataset.togglePayment, Number(checkbox.dataset.index));
    }
  });

  refs.resetDemoBtn.addEventListener('click', () => {
    state.groups = getDefaultGroups();
    refreshPage();
  });
}

loadState();
bindEvents();
refreshPage();
