import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@src/lib/supabase';

function supabaseEnvOk(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return Boolean(url && key);
}

/**
 * GET /api/hub-up/faqs
 * `hub_up_faqs` 에서 활성 FAQ 목록 (로그인 불필요)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!supabaseEnvOk()) {
      return res.status(503).json({
        success: false,
        message: 'Supabase 환경 변수가 설정되지 않았습니다.'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('hub_up_faqs')
      .select('id, question, answer')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[hub-up/faqs]', error);
      return res.status(500).json({
        success: false,
        message: 'FAQ를 불러오지 못했습니다.',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    return res.status(200).json({ success: true, data: data ?? [] });
  } catch (e) {
    console.error('api/hub-up/faqs:', e);
    const detail = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      detail: process.env.NODE_ENV === 'development' ? detail : undefined
    });
  }
}
