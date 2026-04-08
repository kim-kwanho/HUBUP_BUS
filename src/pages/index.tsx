import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import styled from '@emotion/styled';
import { useRouter } from 'next/router';
import BusChangePanel from '@src/components/BusChangePanel';
import { useSsoUser } from '@src/hooks/useSsoUser';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

type TabId = 'faq' | 'bus' | 'qa';

const Page = styled.main`
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #eef0f4;
  color: #1a1d26;
`;

const Container = styled.div`
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
`;

const HeaderBlock = styled.header`
  text-align: center;
  margin-bottom: 24px;
`;

const MainTitle = styled.h1`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111827;
`;

const SubTitle = styled.p`
  margin: 0;
  font-size: 15px;
  color: #6b7280;
  line-height: 1.5;
`;

const Panel = styled.div`
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$active ? '#111827' : '#9ca3af')};
  position: relative;
  transition: color 0.15s ease;

  &:hover {
    color: ${(p) => (p.$active ? '#111827' : '#6b7280')};
  }

  &::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: ${(p) => (p.$active ? '#16a34a' : 'transparent')};
    transition: background 0.15s ease;
  }
`;

const TabIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

const TabLabel = styled.span`
  text-align: center;
  line-height: 1.25;
`;

const TabBody = styled.div`
  padding: 24px 20px 28px;
  min-height: 200px;
`;

const QaIntro = styled.div`
  margin-bottom: 18px;
`;

const QaIntroParagraph = styled.p`
  margin: 0 0 8px;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.65;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FAQList = styled.div`
  display: grid;
  gap: 12px;
`;

const FAQItem = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
`;

const Question = styled.div`
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #111827;
`;

const Answer = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
`;

const EmptyHint = styled.p`
  margin: 0;
  text-align: center;
  font-size: 15px;
  color: #9ca3af;
  padding: 32px 16px;
`;

const FormCard = styled.div`
  padding: 4px 0 0;
  display: grid;
  gap: 16px;
`;

const Label = styled.label`
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const QaFieldLabel = styled.span`
  display: inline-block;
  white-space: nowrap;
`;

const RequiredStar = styled.span`
  color: #b91c1c;
`;

const CategorySelect = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
  font-size: 15px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
  }
`;

const QaSubmitButton = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  border: none;
  background: #16a34a;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const QaNotice = styled.div<{ $variant: 'error' }>`
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.55;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
`;

/** hub_web `hub_up/page.tsx` · RegisterForm 완료 화면과 동일 톤(허브업 그린) */
const QaCompleteSection = styled.div`
  background: #fff;
  border-top: 8px solid #278f5a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  padding: 40px 20px 36px;
  text-align: center;
`;

const QaCompleteIcon = styled.div`
  font-size: 52px;
  line-height: 1;
  margin-bottom: 16px;
`;

const QaCompleteTitle = styled.h2`
  font-size: 22px;
  font-weight: 800;
  color: #1e7046;
  margin: 0 0 20px;
  letter-spacing: -0.02em;
`;

const QaCompleteMessage = styled.p`
  font-size: 15px;
  color: #3c4043;
  line-height: 1.75;
  margin: 0 0 20px;
  text-align: left;
  background: #f0fdf4;
  border-radius: 12px;
  padding: 18px 16px;
  border: 1px solid #bbf7d0;
`;

const QaCompleteNote = styled.p`
  font-size: 14px;
  color: #5f6368;
  margin: 0 0 20px;
  line-height: 1.55;
`;

const QaSecondaryButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(39, 143, 90, 0.35);
  background: #fff;
  color: #1e7046;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: #f0fdf4;
  }
`;

type FaqItem = { id: string; question: string; answer: string };

/** hub_web `hub_up/page.tsx` NoticeCard 문의 안내와 동일 */
const HUB_UP_CONTACT_LINE = '서기MC (010-8284-3283)';

const INQUIRY_CATEGORIES = ['접수', '숙소', '차량', '티셔츠', '기타'] as const;
type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

const TABS_ALL: { id: TabId; label: string; icon: string }[] = [
  { id: 'faq', label: '자주 묻는 질문', icon: '❓' },
  { id: 'bus', label: '버스 시간 변경', icon: '🚌' },
  { id: 'qa', label: '질문하기', icon: '✉️' }
];
const TABS = HUBUP_INQUIRIES_ENABLED ? TABS_ALL : TABS_ALL.filter((t) => t.id !== 'qa');

function parseTabFromHash(hash: string): TabId | null {
  const h = hash.replace(/^#/, '');
  if (h === 'faq' || h === 'bus') return h;
  if (h === 'qa') return HUBUP_INQUIRIES_ENABLED ? 'qa' : 'faq';
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const { userId, isLoading: ssoLoading } = useSsoUser();
  const [activeTab, setActiveTab] = useState<TabId>('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [category, setCategory] = useState<InquiryCategory>('접수');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qaComplete, setQaComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!HUBUP_INQUIRIES_ENABLED && hash === '#qa') {
        const url = `${window.location.pathname}${window.location.search}#faq`;
        window.history.replaceState(null, '', url);
        setActiveTab('faq');
        return;
      }
      const tab = parseTabFromHash(hash);
      if (tab) setActiveTab(tab);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [router.isReady, router.asPath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFaqLoading(true);
      setFaqError(null);
      try {
        const res = await fetch('/api/hub-up/faqs');
        const raw = await res.text();
        let json: { success?: boolean; data?: FaqItem[]; message?: string };
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          throw new Error('FAQ 응답을 해석할 수 없습니다. 서버를 확인해 주세요.');
        }
        if (!res.ok) {
          throw new Error(typeof json?.message === 'string' ? json.message : 'FAQ를 불러오지 못했습니다.');
        }
        if (!cancelled) {
          setFaqs(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setFaqs([]);
          setFaqError(e instanceof Error ? e.message : '오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) setFaqLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, '', url);
  };

  /** hub_web `RegisterForm` handleSubmit 패턴: res.ok → data.error, 성공 시 완료 화면 + scrollTop */
  const handleQaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitError('질문 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim(),
          subject: category,
          pageUrl: `${window.location.pathname}${window.location.search || ''}`
        })
      });

      let data: { success?: boolean; message?: string; error?: string; data?: unknown };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setSubmitError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      if (!res.ok) {
        setSubmitError(
          data.error ||
            data.message ||
            '제출 중 오류가 발생했습니다. 다시 시도해주세요.'
        );
        return;
      }

      if (data.success !== true) {
        setSubmitError(data.error || data.message || '등록에 실패했습니다.');
        return;
      }

      setQaComplete(true);
      setCategory('접수');
      setMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQaComplete = () => {
    setQaComplete(false);
    setSubmitError(null);
  };

  return (
    <Page>
      <Container>
        <HeaderBlock>
          <MainTitle>[허브업] 문의 센터</MainTitle>
          <SubTitle>궁금한 점이 있으신가요?</SubTitle>
        </HeaderBlock>

        <Panel>
          <TabBar role="tablist" aria-label="문의 센터 메뉴">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                $active={activeTab === tab.id}
                onClick={() => selectTab(tab.id)}
              >
                <TabIcon aria-hidden>{tab.icon}</TabIcon>
                <TabLabel>{tab.label}</TabLabel>
              </TabButton>
            ))}
          </TabBar>

          <TabBody>
            {activeTab === 'faq' && (
              <div role="tabpanel" aria-label="자주 묻는 질문">
                {faqLoading && <EmptyHint>불러오는 중…</EmptyHint>}
                {!faqLoading && faqError && <EmptyHint style={{ color: '#b91c1c' }}>{faqError}</EmptyHint>}
                {!faqLoading && !faqError && faqs.length === 0 && (
                  <EmptyHint>등록된 FAQ가 없습니다.</EmptyHint>
                )}
                {!faqLoading && !faqError && faqs.length > 0 && (
                  <FAQList>
                    {faqs.map((item) => (
                      <FAQItem key={item.id}>
                        <Question>{item.question}</Question>
                        <Answer>{item.answer}</Answer>
                      </FAQItem>
                    ))}
                  </FAQList>
                )}
              </div>
            )}

            {activeTab === 'bus' && (
              <div role="tabpanel" aria-label="버스 시간 변경">
                <BusChangePanel userId={userId ?? null} ssoLoading={ssoLoading} />
              </div>
            )}

            {activeTab === 'qa' && (
              <div role="tabpanel" aria-label="질문하기">
                {qaComplete ? (
                  <QaCompleteSection>
                    <QaCompleteIcon aria-hidden>✅</QaCompleteIcon>
                    <QaCompleteTitle>제출이 완료되었습니다!</QaCompleteTitle>
                    <QaCompleteMessage>
                      질문이 접수되었습니다.
                      <br />
                      <br />
                      담당자가 확인 후 연락드릴 예정입니다.
                    </QaCompleteMessage>
                    <QaCompleteNote>📞 문의: {HUB_UP_CONTACT_LINE}</QaCompleteNote>
                    <QaSecondaryButton type="button" onClick={resetQaComplete}>
                      다른 질문 제출하기
                    </QaSecondaryButton>
                  </QaCompleteSection>
                ) : (
                  <>
                    <QaIntro>
                      <QaIntroParagraph>FAQ에서 답을 찾지 못하셨나요?</QaIntroParagraph>
                      <QaIntroParagraph>
                        아래에 질문을 남겨 주시면 담당자가 확인 후 연락드립니다.
                      </QaIntroParagraph>
                    </QaIntro>

                    <form onSubmit={handleQaSubmit}>
                      <FormCard>
                        {submitError && <QaNotice $variant="error">{submitError}</QaNotice>}
                        <Label>
                          <QaFieldLabel>
                            카테고리<RequiredStar>*</RequiredStar>
                          </QaFieldLabel>
                          <CategorySelect
                            value={category}
                            onChange={(e) => {
                              setCategory(e.target.value as InquiryCategory);
                              setSubmitError(null);
                            }}
                            aria-label="문의 카테고리"
                          >
                            {INQUIRY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </CategorySelect>
                        </Label>

                        <Label>
                          <QaFieldLabel>
                            질문 내용<RequiredStar>*</RequiredStar>
                          </QaFieldLabel>
                          <TextArea
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value);
                              setSubmitError(null);
                            }}
                            placeholder="궁금한 점을 자유롭게 입력해 주세요."
                            rows={8}
                          />
                        </Label>

                        <QaSubmitButton type="submit" disabled={submitting}>
                          {submitting ? '제출 중…' : '질문 제출하기'}
                        </QaSubmitButton>
                      </FormCard>
                    </form>
                  </>
                )}
              </div>
            )}
          </TabBody>
        </Panel>
      </Container>
    </Page>
  );
}
