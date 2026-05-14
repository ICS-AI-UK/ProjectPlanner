const API = '/api/data';

export async function fetchData() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`GET ${API} failed: ${res.status}`);
  return res.json();
}

export async function saveData(state) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`POST ${API} failed: ${res.status}`);
  return res.json();
}
