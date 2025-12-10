import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const uid = localStorage.getItem('zimmeter_uid');
  if (uid) {
    config.headers['x-user-id'] = uid;
  }
  return config;
});
