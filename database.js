const STORAGE_KEY = 'app_pulizia_data';

function getAppData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const defaults = {
    partecipantiPulizie: [],
    partecipantiComitive: [],
    programmiPulizie: [],
    programmiComitive: [],
  };
  if (!raw) return defaults;
  try {
    const d = JSON.parse(raw);
    return {
      partecipantiPulizie:  Array.isArray(d.partecipantiPulizie)  ? d.partecipantiPulizie  : [],
      partecipantiComitive: Array.isArray(d.partecipantiComitive) ? d.partecipantiComitive : [],
      programmiPulizie:     Array.isArray(d.programmiPulizie)     ? d.programmiPulizie     : [],
      programmiComitive:    Array.isArray(d.programmiComitive)    ? d.programmiComitive    : [],
    };
  } catch {
    return defaults;
  }
}

function _save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function _uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// tipo: 'pulizie' | 'comitive'
function savePartecipante(nome, tipo) {
  const data = getAppData();
  const key = tipo === 'comitive' ? 'partecipantiComitive' : 'partecipantiPulizie';
  const nuovo = { id: _uid(), nome: nome.trim() };
  data[key].push(nuovo);
  _save(data);
  return nuovo;
}

// dati pulizie: { settimana, incarico, partecipantiGiovedi[], partecipantiDomenica[] }
function saveProgrammaPulizie(dati) {
  const data = getAppData();
  const nuovo = {
    id: _uid(),
    createdAt: new Date().toISOString(),
    settimana: dati.settimana || '',
    incarico: dati.incarico || '',
    partecipantiGiovedi:  (dati.partecipantiGiovedi  || []).slice(0, 3),
    partecipantiDomenica: (dati.partecipantiDomenica || []).slice(0, 3),
  };
  data.programmiPulizie.push(nuovo);
  _save(data);
  return nuovo;
}

// dati comitive: { data, conduttoreId }
function saveProgrammaComitive(dati) {
  const data = getAppData();
  const nuovo = {
    id: _uid(),
    createdAt: new Date().toISOString(),
    data: dati.data || '',
    conduttoreId: dati.conduttoreId || '',
  };
  data.programmiComitive.push(nuovo);
  _save(data);
  return nuovo;
}

function deletePartecipante(id, tipo) {
  const data = getAppData();
  const key = tipo === 'comitive' ? 'partecipantiComitive' : 'partecipantiPulizie';
  data[key] = data[key].filter(p => p.id !== id);
  _save(data);
}

function updateProgrammaPulizie(id, dati) {
  const data = getAppData();
  const idx = data.programmiPulizie.findIndex(p => p.id === id);
  if (idx === -1) return;
  data.programmiPulizie[idx] = {
    ...data.programmiPulizie[idx],
    settimana: dati.settimana || '',
    incarico: dati.incarico || '',
    partecipantiGiovedi:  (dati.partecipantiGiovedi  || []).slice(0, 3),
    partecipantiDomenica: (dati.partecipantiDomenica || []).slice(0, 3),
  };
  _save(data);
}

function updateProgrammaComitive(id, dati) {
  const data = getAppData();
  const idx = data.programmiComitive.findIndex(c => c.id === id);
  if (idx === -1) return;
  data.programmiComitive[idx] = {
    ...data.programmiComitive[idx],
    data: dati.data || '',
    conduttoreId: dati.conduttoreId || '',
  };
  _save(data);
}

function deleteProgramma(id, tipo) {
  const data = getAppData();
  const key = tipo === 'comitive' ? 'programmiComitive' : 'programmiPulizie';
  data[key] = data[key].filter(p => p.id !== id);
  _save(data);
}

function esportaJSON() {
  const data = getAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup_pulizie.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importaJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        const valid = ['partecipantiPulizie','partecipantiComitive','programmiPulizie','programmiComitive']
          .every(k => Array.isArray(d[k]));
        if (!valid) return reject('Formato JSON non valido.');
        _save(d);
        resolve(d);
      } catch {
        reject('Errore nel parsing del file.');
      }
    };
    reader.readAsText(file);
  });
}
