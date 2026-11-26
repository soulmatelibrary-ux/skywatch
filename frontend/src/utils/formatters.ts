import type { ShiftType, CardStatus } from '../types/log';

export const SHIFT_LABEL: Record<ShiftType, string> = {
  '주간': '주간',
  '야간': '야간',
  '주야': '주야',
  '비번': '비번',
  '휴가': '휴가',
  '공지': '공지',
};

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  open: '진행중',
  hold: '보류',
  done: '완료',
};

export const CARD_STATUS_COLOR: Record<CardStatus, string> = {
  open:  'bg-blue-100 text-blue-700',
  hold:  'bg-yellow-100 text-yellow-700',
  done:  'bg-green-100 text-green-700',
};
