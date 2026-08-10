// Backend API bilan ishlash uchun fetch o'ramchisi
import { API_URL } from './constants';

// Brauzerda tokenni localStorage dan olamiz
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ustoz_token');
}

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ustoz_token', token);
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ustoz_token');
  }
}

// Asosiy so'rov funksiyasi
export async function apiFetch(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (auth) {
    const token = getToken();
    if (token) opts.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, opts);

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data?.message || 'So\'rovda xatolik yuz berdi';
    const err = new Error(message);
    err.status = res.status;
    if (data?.code) err.code = data.code;
    throw err;
  }

  return data;
}

// Fayl yuklash (multipart/form-data). onProgress — 0..100 foiz.
export function uploadFile(path, file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* bo'sh */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data?.message || 'Fayl yuklashda xatolik'));
      }
    };
    xhr.onerror = () => reject(new Error('Tarmoq xatosi — fayl yuklanmadi'));
    xhr.send(form);
  });
}

// Faylni yuklab olish (CSV va h.k.). Endpoint token talab qilgani uchun
// oddiy <a href> ishlamaydi — javobni blob qilib olib, brauzerga saqlatamiz.
export async function downloadFile(path, fallbackName = 'hisobot.csv') {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'Faylni yuklab olishda xatolik';
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch { /* JSON emas */ }
    throw new Error(message);
  }

  // Fayl nomini server sarlavhasidan olamiz (bo'lmasa zaxira nom)
  const disp = res.headers.get('Content-Disposition') || '';
  const match = disp.match(/filename="?([^"]+)"?/);
  const name = match ? match[1] : fallbackName;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Qulay yordamchi metodlar
export const api = {
  get: (path, opts) => apiFetch(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => apiFetch(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => apiFetch(path, { ...opts, method: 'DELETE' }),
  upload: uploadFile,
  download: downloadFile,
};
