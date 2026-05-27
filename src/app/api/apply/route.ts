import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { sendAlimtalkMessage, buildAlimtalkVariables } from '@/lib/solapi';

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('서버 환경변수가 설정되지 않았습니다.');
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { aid, nickname, email, phone, blog_url, class_type, goal, privacy_agreed, is_overseas_resident } = body as {
    aid: string;
    nickname: string;
    email: string;
    phone: string;
    blog_url: string;
    class_type: string;
    goal: string | null;
    privacy_agreed: boolean;
    is_overseas_resident?: boolean;
  };

  if (!aid || !/^\d{6}$/.test(String(aid))) {
    return Response.json({ error: 'AID는 숫자 6자리를 입력해주세요.' }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }

  if (!privacy_agreed) {
    return Response.json({ error: '개인정보 수집 및 이용에 동의해주세요.' }, { status: 400 });
  }

  if (!class_type || !['베이직반', '부스터반'].includes(class_type)) {
    return Response.json({ error: '참여 반을 선택해주세요.' }, { status: 400 });
  }

  const writing_goal = class_type === '베이직반' ? 3 : 5;
  const personal_goal = 1;

  let supabase: ReturnType<typeof createSupabaseClient>;
  try {
    supabase = createSupabaseClient();
  } catch {
    return Response.json({ error: '서버 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { error } = await supabase.from('applicants').insert({
    aid,
    nickname,
    email,
    phone,
    blog_url,
    class_type,
    writing_goal,
    personal_goal,
    goal: goal ?? null,
    privacy_agreed,
    is_overseas_resident: is_overseas_resident ?? false,
    status: 'applied',
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return Response.json(
      { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }

  // 알림톡 발송 (실패해도 신청 저장 결과는 유지)
  try {
    const { data: allTemplates } = await supabase
      .from('message_templates')
      .select('solapi_template_code, variables, message_category, name, title')
      .eq('channel', 'alimtalk')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    const template = allTemplates?.find(
      (t) =>
        t.message_category === '입금 메세지' ||
        t.message_category === 'payment' ||
        (t.name && String(t.name).includes('입금')) ||
        (t.title && String(t.title).includes('입금'))
    );

    if (!template) {
      console.warn('[alimtalk] 활성화된 입금 요청 알림톡 템플릿이 없습니다.');
    } else if (!template.solapi_template_code) {
      console.warn('[alimtalk] solapi_template_code가 없어 발송을 건너뜁니다.');
    } else {
      const applicantData = {
        name: nickname,
        nickname,
        aid,
        email,
        phone,
        blog_url,
        class_type,
        writing_goal,
        personal_goal,
        is_overseas_resident: is_overseas_resident ?? false,
      };
      const variables = buildAlimtalkVariables(template.variables, applicantData);
      await sendAlimtalkMessage({
        to: phone,
        templateId: String(template.solapi_template_code),
        variables,
      });
      const maskedPhone = phone
        ? phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2')
        : '-';
      console.log(`[alimtalk] 발송 성공: ${maskedPhone}`);
    }
  } catch (err) {
    console.error('[alimtalk] 발송 실패:', err instanceof Error ? err.message : err);
  }

  return Response.json({ success: true }, { status: 201 });
}
