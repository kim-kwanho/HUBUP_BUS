import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '@src/components/admin/AdminShell';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/bus-requests');
  }, [router]);

  return (
    <AdminShell title="버스 변경 요청">
      <p style={{ color: 'rgba(148,163,184,0.9)' }}>버스 변경 요청 페이지로 이동 중입니다…</p>
    </AdminShell>
  );
}
