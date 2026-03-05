const API_URL = 'http://localhost:4000/api';

export async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) throw new Error(`Failed request: ${path}`);
  return response.json();
}
