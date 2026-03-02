function _nomeById(lista, id) {
  return (lista.find(p => p.id === id) || {}).nome || '—';
}

function generaPDFPulizie() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { programmiPulizie, partecipantiPulizie } = getAppData();

  const sorted = [...programmiPulizie].sort(
    (a, b) => parseSettimana(a.settimana) - parseSettimana(b.settimana)
  );

  doc.setFontSize(18);
  doc.setTextColor(15, 52, 96);
  doc.text('Programma Pulizie', 14, 18);

  const rows = sorted.map(t => [
    t.settimana,
    t.incarico,
    t.partecipantiGiovedi.map(id => _nomeById(partecipantiPulizie, id)).join(', ') || '—',
    t.partecipantiDomenica.map(id => _nomeById(partecipantiPulizie, id)).join(', ') || '—',
  ]);

  doc.autoTable({
    startY: 24,
    head: [['Settimana', 'Incarico', 'Giovedì', 'Domenica']],
    body: rows,
    headStyles: { fillColor: [15, 52, 96], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 35 } },
  });

  doc.save('programma_pulizie.pdf');
}

function generaPDFComitive() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { programmiComitive, partecipantiComitive } = getAppData();

  const sorted = [...programmiComitive].sort(
    (a, b) => new Date(a.data) - new Date(b.data)
  );

  doc.setFontSize(18);
  doc.setTextColor(230, 126, 34);
  doc.text('Programma Comitive', 14, 18);

  const rows = sorted.map(c => [
    c.data ? new Date(c.data).toLocaleDateString('it-IT') : '—',
    _nomeById(partecipantiComitive, c.conduttoreId),
  ]);

  doc.autoTable({
    startY: 24,
    head: [['Data', 'Conduttore']],
    body: rows,
    headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold', fontSize: 11 },
    alternateRowStyles: { fillColor: [255, 248, 240] },
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  doc.save('programma_comitive.pdf');
}