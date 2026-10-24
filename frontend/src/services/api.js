const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function addPrintJob(job) {
    await fetch(`${API_URL}/api/queue/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
    });
}

export async function reorderQueue(newQueue) {
    await fetch(`${API_URL}/api/queue/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQueue),
    });
}

export async function deletePrintJob(jobId) {
    await fetch(`${API_URL}/api/queue/delete/${jobId}`, {
        method: 'DELETE',
    });
}

export async function pauseQueue() {
  await fetch(`${API_URL}/api/queue/pause`, { method: 'POST' });
}

export async function resumeQueue() {
  await fetch(`${API_URL}/api/queue/resume`, { method: 'POST' });
}

export async function uploadGcodeFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_URL}/api/queue/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) console.error("Error en pujar el fitxer gcode");
  } catch (err) {
    console.error("Error de xarxa en pujar el fitxer:", err);
  }
}
