import { useEffect } from 'react';
import { installGeometrySaver } from '../utils/popupGeometry';

export function usePopupGeometrySave(key: string) {
  useEffect(() => installGeometrySaver(key), [key]);
}
