import { useCallback, useEffect, useRef, useState } from 'react';
import { logApi } from '../services/api/logApi';
import { taskApi } from '../services/api/taskApi';
import type { CardUpsert, LogDetail, ParticipantIn } from '../types/log';

export interface WriteCard extends CardUpsert { _key: string; }

const mk = () => Math.random().toString(36).slice(2);
const draftKey = (d: string, s: string) => `sw-draft-${d}-${s}`;
const DEFAULT_CATEGORY_ID = 6; // skywatch_card_categories 테이블의 "기타" 카테고리 ID

/** 대표카드 우선순위 키워드 (제목 매칭) */
const PRIORITY_RE = /fdp.{0,5}cold|cold.{0,5}start|coldstart|적응자료.{0,10}(설치|적용)|6\.6\w*.{0,5}(설치|적용|배포)/i;

function pickRepKey(cards: WriteCard[], logTitle?: string): string {
  if (logTitle?.trim()) {
    const titleMatch = cards.find(c => c.title.trim() === logTitle.trim());
    if (titleMatch) return titleMatch._key;
  }
  const priority = cards.find(c => PRIORITY_RE.test(c.title));
  return priority?._key ?? cards[0]?._key ?? '';
}

function normalizeTags(input: string[]): string[] {
  return Array.from(new Set(input.map(t => t.trim()).filter(Boolean)));
}

function normalizeParticipants(input: ParticipantIn[]): ParticipantIn[] {
  const seen = new Set<number>();
  const next: ParticipantIn[] = [];

  for (const participant of input) {
    if (!Number.isInteger(participant.user_id) || seen.has(participant.user_id)) continue;
    seen.add(participant.user_id);
    next.push({
      user_id: participant.user_id,
      role: participant.role || 'sub',
      sub_for: participant.sub_for ?? null,
      note: participant.note ?? null,
    });
  }

  if (next.length > 0 && !next.some(p => p.role === 'primary')) {
    next[0] = { ...next[0], role: 'primary' };
  }

  return next;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const defaultCards = (): WriteCard[] => [
  { _key: mk(), title: '', content: '', category_id: DEFAULT_CATEGORY_ID, position: 0, status: 'in_progress' },
  { _key: mk(), title: '', content: '', category_id: DEFAULT_CATEGORY_ID, position: 1, status: 'in_progress' },
];

export function useLogWrite(editTarget?: LogDetail | null) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(editTarget?.date ?? today);
  const [shiftType, setShiftType] = useState<string>(editTarget?.shift_type ?? '주간');
  const [tags, setTags] = useState<string[]>(editTarget?.tags ?? []);
  const [cards, setCards] = useState<WriteCard[]>(() =>
    editTarget?.cards.length
      ? editTarget.cards.map(c => ({ ...c, _key: mk() }))
      : defaultCards()
  );
  const [participants, setParticipants] = useState<ParticipantIn[]>(() =>
    editTarget?.participants.length
      ? editTarget.participants.map(p => ({ user_id: p.user_id, role: p.role }))
      : []
  );
  const [repCardKey, setRepCardKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 템플릿이 이미 적용된 (date, shiftType) 추적 — 중복 적용 방지
  const appliedTemplateKey = useRef<string | null>(null);

  useEffect(() => {
    if (editTarget) {
      const mapped = editTarget.cards.length
        ? editTarget.cards.map(c => ({ ...c, _key: mk() }))
        : defaultCards();
      setDate(editTarget.date);
      setShiftType(editTarget.shift_type);
      setTags(editTarget.tags ?? []);
      setCards(mapped);
      setParticipants(editTarget.participants.map(p => ({ user_id: p.user_id, role: p.role })));
      setRepCardKey(pickRepKey(mapped, editTarget.title ?? undefined));
      return;
    }
    // 새 일지 모드로 전환 시 템플릿 적용 이력 초기화
    appliedTemplateKey.current = null;
    const fresh = defaultCards();
    setDate(today);
    setShiftType('주간');
    setTags([]);
    setCards(fresh);
    setParticipants([]);
    setRepCardKey(pickRepKey(fresh));
  }, [editTarget?.id, today]);

  // 카드 제목이 바뀔 때마다 대표카드 재선정:
  // 우선순위 키워드 카드 > 현재 선택 유지(삭제된 경우만 카드1로) > 카드1
  useEffect(() => {
    if (cards.length === 0) return;
    const priority = cards.find(c => PRIORITY_RE.test(c.title));
    if (priority) {
      setRepCardKey(priority._key);
    } else if (!repCardKey || !cards.find(c => c._key === repCardKey)) {
      setRepCardKey(cards[0]._key);
    }
  }, [cards, repCardKey]);

  useEffect(() => {
    if (editTarget) return;
    try {
      const raw = localStorage.getItem(draftKey(date, shiftType));
      if (!raw) return;
      const draft = JSON.parse(raw);

      // 타입 안전성 검증
      if (!draft || typeof draft !== 'object') return;
      if (!Array.isArray(draft.cards)) return;

      const validCards = draft.cards.filter((c: any) =>
        typeof c === 'object' &&
        typeof c.title === 'string' &&
        typeof c.position === 'number'
      );

      if (validCards.length > 0) {
        const mapped = validCards.map((c: any) => ({
          id: c.id ?? null,
          title: c.title ?? '',
          content: c.content ?? '',
          category_id: c.category_id ?? DEFAULT_CATEGORY_ID,
          position: c.position ?? 0,
          status: c.status ?? 'open',
          _key: mk(),
        }));
        setCards(mapped);
        setRepCardKey(pickRepKey(mapped));
      }

      if (Array.isArray(draft.tags)) {
        setTags(normalizeTags(draft.tags.filter((t: any) => typeof t === 'string')));
      }

      // participants 검증
      if (Array.isArray(draft.participants)) {
        const validParticipants = draft.participants.filter((p: any) =>
          typeof p === 'object' &&
          typeof p.user_id === 'number' &&
          typeof p.role === 'string'
        );
        if (validParticipants.length > 0) setParticipants(validParticipants);
      }
    } catch { /* ignore corrupted draft */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shiftType]);

  // 새 일지 작성 시: 날짜·근무유형에 맞는 정기 템플릿을 불러와 카드 초기화
  useEffect(() => {
    if (editTarget) return;
    const key = `${date}|${shiftType}`;
    if (appliedTemplateKey.current === key) return;

    // draft가 있으면 템플릿 적용 건너뜀
    const hasDraft = !!localStorage.getItem(draftKey(date, shiftType));
    if (hasDraft) {
      appliedTemplateKey.current = key;
      return;
    }

    appliedTemplateKey.current = key;
    let cancelled = false;
    taskApi.templates.match(date, shiftType).then(res => {
      if (cancelled) return;
      const templates = res.data.data ?? [];
      if (templates.length === 0) return;

      const templateCards: WriteCard[] = templates.map((t, idx) => ({
        _key: mk(),
        title: t.template_title || t.name,
        content: t.template_body || '',
        category_id: DEFAULT_CATEGORY_ID,
        position: idx,
        status: 'in_progress',
      }));
      // 템플릿 카드가 1개면 빈 카드 1개 추가
      if (templateCards.length < 2) {
        templateCards.push({ _key: mk(), title: '', content: '', category_id: DEFAULT_CATEGORY_ID, position: templateCards.length, status: 'in_progress' });
      }
      setCards(templateCards);
      setRepCardKey(pickRepKey(templateCards));
    }).catch(() => { /* 조용히 무시 */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shiftType]);

  const saveDraft = useCallback((overrideTags?: string[]) => {
    if (!editTarget) {
      const draftTags = normalizeTags(overrideTags ?? tags);
      localStorage.setItem(
        draftKey(date, shiftType),
        JSON.stringify({ cards, participants: normalizeParticipants(participants), tags: draftTags })
      );
    }
  }, [editTarget, date, shiftType, cards, participants, tags]);

  const addCard = useCallback(() =>
    setCards(p => [...p, { _key: mk(), title: '', content: '', category_id: DEFAULT_CATEGORY_ID, position: p.length, status: 'in_progress' }]), []);

  const removeCard = useCallback((key: string) =>
    setCards(p => {
      const next = p.filter(c => c._key !== key).map((c, i) => ({ ...c, position: i }));
      setRepCardKey(rk => (rk === key ? (next[0]?._key ?? '') : rk));
      return next;
    }), []);

  const updateCard = useCallback((key: string, patch: Partial<WriteCard>) =>
    setCards(p => p.map(c => c._key === key ? { ...c, ...patch } : c)), []);

  const moveCard = useCallback((key: string, dir: -1 | 1) =>
    setCards(p => {
      const idx = p.findIndex(c => c._key === key);
      const next = idx + dir;
      if (next < 0 || next >= p.length) return p;
      const arr = [...p];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((c, i) => ({ ...c, position: i }));
    }), []);

  const submit = useCallback(async (overrideTags?: string[]) => {
    // 제목과 내용이 모두 비어있는 카드는 자동 제외
    const nonEmptyCards = cards.filter(c => c.title.trim() || stripHtml(c.content ?? ''));
    const missingTitle = nonEmptyCards.find(c => !c.title.trim());
    if (missingTitle) {
      const idx = cards.findIndex(c => c._key === missingTitle._key) + 1;
      setError(`카드 ${idx}의 제목을 입력해 주세요`);
      return null;
    }
    const validCards = nonEmptyCards
      .map((c, idx) => ({ ...c, position: idx, category_id: c.category_id || DEFAULT_CATEGORY_ID }));
    const normalizedParticipants = normalizeParticipants(participants);
    if (!validCards.length) { setError('일지 내용을 입력해 주세요'); return null; }
    if (!normalizedParticipants.length) { setError('근무자를 선택해 주세요'); return null; }

    // 대표카드 제목을 log title로 사용
    const repCard = cards.find(c => c._key === repCardKey) ?? cards[0];
    const title = repCard?.title.trim() || undefined;
    const normalizedTags = normalizeTags(overrideTags ?? tags);

    setIsSubmitting(true); setError(null);
    try {
      const res = editTarget
        ? await logApi.update(editTarget.id, { date, shift_type: shiftType, title, tags: normalizedTags, cards: validCards, participants: normalizedParticipants })
        : await logApi.create({ date, shift_type: shiftType, title, tags: normalizedTags, cards: validCards, participants: normalizedParticipants });
      if (!editTarget) localStorage.removeItem(draftKey(date, shiftType));
      return res.data.data ?? null;
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message ?? '저장에 실패했습니다');
      throw e;
    } finally { setIsSubmitting(false); }
  }, [editTarget, date, shiftType, tags, cards, participants, repCardKey]);

  return {
    date, setDate, shiftType, setShiftType,
    tags, setTags,
    cards, addCard, removeCard, updateCard, moveCard,
    repCardKey, setRepCardKey,
    participants, setParticipants,
    isSubmitting, error, submit, saveDraft,
  };
}
