// --- Sort helpers ---
const _MESI = {
  gen:0, gennaio:0, feb:1, febbraio:1, mar:2, marzo:2,
  apr:3, aprile:3, mag:4, maggio:4, giu:5, giugno:5,
  lug:6, luglio:6, ago:7, agosto:7, set:8, settembre:8,
  ott:9, ottobre:9, nov:10, novembre:10, dic:11, dicembre:11,
};

function parseSettimana(str) {
  // Formato: "12 - 18 Gennaio" oppure "23 feb – 1 mar"
  const parts = str.split(/\s*[-–]\s*/);
  let day = null, month = null;
  for (const part of parts) {
    for (const token of part.toLowerCase().split(/\s+/)) {
      if (/^\d+$/.test(token) && day === null) day = parseInt(token);
      if (_MESI[token] !== undefined && month === null) month = _MESI[token];
    }
    if (day !== null && month !== null) break;
  }
  if (day === null || month === null) return new Date(9999, 0);
  return new Date(new Date().getFullYear(), month, day);
}

// --- Editing state ---
let editingIdPulizie  = null;
let editingIdComitiva = null;

// --- Tab switcher ---
let tabAttiva = 'pulizie';

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    tabAttiva = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('sezione-pulizie').classList.toggle('visible', tabAttiva === 'pulizie');
    document.getElementById('sezione-comitive').classList.toggle('visible', tabAttiva === 'comitive');
  });
});

// --- Helpers ---
function _uid_nome(partecipanti, id) {
  return (partecipanti.find(p => p.id === id) || {}).nome || id;
}

function makeSelect(partecipanti, placeholder) {
  const sel = document.createElement('select');
  const opt0 = document.createElement('option');
  opt0.value = ''; opt0.textContent = placeholder;
  sel.appendChild(opt0);
  partecipanti.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.nome;
    sel.appendChild(opt);
  });
  return sel;
}

function buildSelects(container, partecipanti) {
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    container.appendChild(makeSelect(partecipanti, i === 0 ? '— obbligatorio —' : '— facoltativo —'));
  }
}

function getSelectedIds(container) {
  return [...container.querySelectorAll('select')].map(s => s.value).filter(Boolean);
}

function badgeList(ids, partecipanti) {
  return ids.length
    ? ids.map(id => `<span class="badge">${_uid_nome(partecipanti, id)}</span>`).join('')
    : '<span style="color:#aaa;font-size:0.8rem">—</span>';
}

// --- Presenze ---
function calcolaPresenze(id, tipo, data) {
  if (tipo === 'pulizie') {
    return data.programmiPulizie.reduce((n, p) => {
      if (p.partecipantiGiovedi.includes(id))  n++;
      if (p.partecipantiDomenica.includes(id)) n++;
      return n;
    }, 0);
  }
  return data.programmiComitive.filter(c => c.conduttoreId === id).length;
}

// --- Render partecipanti ---
function renderParticipants(lista, emptyEl, partecipanti, tipo, appData) {
  lista.innerHTML = '';
  emptyEl.style.display = partecipanti.length === 0 ? 'block' : 'none';
  partecipanti.forEach(({ id, nome }) => {
    const count = calcolaPresenze(id, tipo, appData);
    const li = document.createElement('li');
    li.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
    li.innerHTML = `
      <span>${nome} <span style="color:#999;font-size:0.78rem">— ${count}</span></span>
      <button class="btn btn-danger btn-sm" style="padding:4px 9px;font-size:0.75rem;flex-shrink:0">✕</button>`;
    li.querySelector('button').addEventListener('click', () => {
      deletePartecipante(id, tipo);
      refresh();
    });
    lista.appendChild(li);
  });
}

// --- Render turni pulizie ---
function renderTurniPulizie(programmi, partecipanti) {
  const container = document.getElementById('lista-turni-pulizie');
  const empty     = document.getElementById('empty-turni-pulizie');
  container.innerHTML = '';
  empty.style.display = programmi.length === 0 ? 'block' : 'none';

  [...programmi].sort((a, b) => parseSettimana(a.settimana) - parseSettimana(b.settimana)).forEach(t => {
    const card = document.createElement('div');
    card.className = 'turno-card';
    card.innerHTML = `
      <div class="turno-header">
        <div>
          <div class="turno-title">${t.incarico}</div>
          <div class="turno-week">${t.settimana}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" data-action="modifica" data-id="${t.id}">✎</button>
          <button class="btn btn-danger btn-sm"  data-action="elimina"  data-id="${t.id}">✕</button>
        </div>
      </div>
      <div class="turno-giorni">
        <div>
          <div class="turno-giorno-label">Giovedì</div>
          ${badgeList(t.partecipantiGiovedi, partecipanti)}
        </div>
        <div>
          <div class="turno-giorno-label">Domenica</div>
          ${badgeList(t.partecipantiDomenica, partecipanti)}
        </div>
      </div>`;
    card.querySelector('[data-action="elimina"]').addEventListener('click', e => {
      deleteProgramma(e.currentTarget.dataset.id, 'pulizie');
      refresh();
    });
    card.querySelector('[data-action="modifica"]').addEventListener('click', () => popolaFormPulizie(t));
    container.appendChild(card);
  });
}

// --- Render comitive ---
function renderComitive(programmi, partecipanti) {
  const container = document.getElementById('lista-comitive');
  const empty     = document.getElementById('empty-comitive');
  container.innerHTML = '';
  empty.style.display = programmi.length === 0 ? 'block' : 'none';

  [...programmi].sort((a, b) => new Date(a.data) - new Date(b.data)).forEach(c => {
    const card = document.createElement('div');
    card.className = 'comitiva-card';
    card.innerHTML = `
      <div class="comitiva-info">
        <div class="comitiva-data">${c.data || '—'}</div>
        <div class="comitiva-nome">${_uid_nome(partecipanti, c.conduttoreId)}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" data-action="modifica" data-id="${c.id}">✎</button>
        <button class="btn btn-danger btn-sm"  data-action="elimina"  data-id="${c.id}">✕</button>
      </div>`;
    card.querySelector('[data-action="elimina"]').addEventListener('click', e => {
      deleteProgramma(e.currentTarget.dataset.id, 'comitive');
      refresh();
    });
    card.querySelector('[data-action="modifica"]').addEventListener('click', () => popolaFormComitiva(c));
    container.appendChild(card);
  });
}

// --- Aggiorna select conduttore ---
function refreshSelectConduttore(partecipanti) {
  const sel = document.getElementById('select-conduttore');
  const val = sel.value;
  sel.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = ''; opt0.textContent = '— scegli conduttore —';
  sel.appendChild(opt0);
  partecipanti.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.nome;
    if (p.id === val) opt.selected = true;
    sel.appendChild(opt);
  });
}

// --- Refresh globale ---
function refresh() {
  const data = getAppData();
  renderParticipants(
    document.getElementById('lista-parti-pulizie'),
    document.getElementById('empty-parti-pulizie'),
    data.partecipantiPulizie, 'pulizie', data
  );
  renderParticipants(
    document.getElementById('lista-parti-comitive'),
    document.getElementById('empty-parti-comitive'),
    data.partecipantiComitive, 'comitive', data
  );
  buildSelects(document.getElementById('selects-giovedi'), data.partecipantiPulizie);
  buildSelects(document.getElementById('selects-domenica'), data.partecipantiPulizie);
  refreshSelectConduttore(data.partecipantiComitive);
  renderTurniPulizie(data.programmiPulizie, data.partecipantiPulizie);
  renderComitive(data.programmiComitive, data.partecipantiComitive);
}

// --- Popola form per modifica ---
function popolaFormPulizie(turno) {
  editingIdPulizie = turno.id;
  document.getElementById('input-settimana').value = turno.settimana;
  document.getElementById('input-incarico').value  = turno.incarico;
  const setSelects = (containerId, ids) => {
    document.querySelectorAll(`#${containerId} select`).forEach((sel, i) => {
      sel.value = ids[i] || '';
    });
  };
  setSelects('selects-giovedi',   turno.partecipantiGiovedi);
  setSelects('selects-domenica',  turno.partecipantiDomenica);
  document.getElementById('btn-salva-pulizie').textContent = 'Aggiorna Turno';
  document.getElementById('input-settimana').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function popolaFormComitiva(comitiva) {
  editingIdComitiva = comitiva.id;
  document.getElementById('input-data-comitiva').value    = comitiva.data;
  document.getElementById('select-conduttore').value      = comitiva.conduttoreId;
  document.getElementById('btn-salva-comitiva').textContent = 'Aggiorna Comitiva';
  document.getElementById('input-data-comitiva').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- Events: partecipanti ---
document.getElementById('btn-add-pulizie').addEventListener('click', () => {
  const input = document.getElementById('input-nome-pulizie');
  const nome = input.value.trim();
  if (!nome) return;
  savePartecipante(nome, 'pulizie');
  input.value = ''; input.focus();
  refresh();
});
document.getElementById('input-nome-pulizie').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-add-pulizie').click();
});

document.getElementById('btn-add-comitive').addEventListener('click', () => {
  const input = document.getElementById('input-nome-comitive');
  const nome = input.value.trim();
  if (!nome) return;
  savePartecipante(nome, 'comitive');
  input.value = ''; input.focus();
  refresh();
});
document.getElementById('input-nome-comitive').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-add-comitive').click();
});

// --- Events: salva turno pulizie ---
document.getElementById('btn-salva-pulizie').addEventListener('click', () => {
  const settimana = document.getElementById('input-settimana').value.trim();
  const incarico  = document.getElementById('input-incarico').value.trim();
  if (!settimana || !incarico) { alert('Inserisci settimana e incarico.'); return; }
  const dati = {
    settimana, incarico,
    partecipantiGiovedi:  getSelectedIds(document.getElementById('selects-giovedi')),
    partecipantiDomenica: getSelectedIds(document.getElementById('selects-domenica')),
  };
  if (editingIdPulizie) {
    updateProgrammaPulizie(editingIdPulizie, dati);
    editingIdPulizie = null;
    document.getElementById('btn-salva-pulizie').textContent = 'Salva Turno';
  } else {
    saveProgrammaPulizie(dati);
  }
  document.getElementById('input-settimana').value = '';
  document.getElementById('input-incarico').value  = '';
  refresh();
});

// --- Events: salva comitiva ---
document.getElementById('btn-salva-comitiva').addEventListener('click', () => {
  const data         = document.getElementById('input-data-comitiva').value;
  const conduttoreId = document.getElementById('select-conduttore').value;
  if (!data || !conduttoreId) { alert('Inserisci data e conduttore.'); return; }
  if (editingIdComitiva) {
    updateProgrammaComitive(editingIdComitiva, { data, conduttoreId });
    editingIdComitiva = null;
    document.getElementById('btn-salva-comitiva').textContent = 'Salva Comitiva';
  } else {
    saveProgrammaComitive({ data, conduttoreId });
  }
  document.getElementById('input-data-comitiva').value = '';
  document.getElementById('select-conduttore').value   = '';
  refresh();
});

// --- PDF ---
document.getElementById('btn-pdf-pulizie').addEventListener('click', generaPDFPulizie);
document.getElementById('btn-pdf-comitive').addEventListener('click', generaPDFComitive);

// --- Backup ---
document.getElementById('btn-esporta').addEventListener('click', esportaJSON);

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importaJSON(file);
    e.target.value = '';
    refresh();
    alert('Importazione completata.');
  } catch (err) {
    alert('Errore: ' + err);
  }
});

// --- Init ---
refresh();