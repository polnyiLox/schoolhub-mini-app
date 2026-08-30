import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  document.documentElement.className = '';
  delete window.Telegram;
});
