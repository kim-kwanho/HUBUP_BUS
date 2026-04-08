import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LegacySectionRedirect from '@src/components/LegacySectionRedirect';
import { HUBUP_INQUIRIES_ENABLED } from '@src/lib/hubup-inquiries-feature';

export default function QAWritePage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady || HUBUP_INQUIRIES_ENABLED) return;
    void router.replace('/#faq');
  }, [router.isReady, router]);

  if (!HUBUP_INQUIRIES_ENABLED) return null;
  return <LegacySectionRedirect hash="#qa" title="문의 작성 섹션으로 이동 중" />;
}
