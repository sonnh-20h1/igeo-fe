'use client';

import { Wrench } from 'lucide-react';
import { dictionaries } from '@/features/i18n/dictionaries';

/**
 * Màn bảo trì full-screen — thay toàn bộ homepage khi bật.
 * Copy mặc định tiếng Anh. Bật/tắt bằng SHOW_HOME_MAINTENANCE trong home-page.tsx.
 */
export function HomeMaintenanceScreen() {
  const copy = dictionaries.en.home.maintenance;

  return (
    <div className='home-maintenance-screen' role='alert' aria-live='assertive'>
      <div className='home-maintenance-screen-body'>
        <span className='home-maintenance-screen-icon' aria-hidden>
          <Wrench className='size-8' strokeWidth={1.75} />
        </span>
        <h1 className='home-maintenance-screen-title'>{copy.title}</h1>
        <p className='home-maintenance-screen-message'>{copy.message}</p>
        {copy.timeNote ? (
          <p className='home-maintenance-screen-time'>{copy.timeNote}</p>
        ) : null}
      </div>
    </div>
  );
}
