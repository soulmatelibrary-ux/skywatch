import { useEffect, useState } from 'react';
import { cardStatusesApi } from '../services/api/cardStatusesApi';
import type { CardStatusItem } from '../types/log';

let _cache: CardStatusItem[] | null = null;
const _listeners: Array<(s: CardStatusItem[]) => void> = [];

function notify(s: CardStatusItem[]) {
  _cache = s;
  _listeners.forEach(fn => fn(s));
}

export function useCardStatuses() {
  const [statuses, setStatuses] = useState<CardStatusItem[]>(_cache ?? []);

  useEffect(() => {
    _listeners.push(setStatuses);
    if (_cache) {
      setStatuses(_cache);
    } else {
      cardStatusesApi.list().then(res => {
        notify(res.data.data ?? []);
      }).catch(() => {});
    }
    return () => {
      const idx = _listeners.indexOf(setStatuses);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }, []);

  return statuses;
}
