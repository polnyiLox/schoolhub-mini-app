import { createRoot } from 'react-dom/client';

import { SchoolHubApp } from '@/components/schoolhub-app';
import { Providers } from '@/components/providers';
import '@/app/globals.css';

createRoot(document.getElementById('root')!).render(
  <Providers>
    <SchoolHubApp />
  </Providers>,
);
