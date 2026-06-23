import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { sendPaymentCompleteAlimtalk } from '@/lib/alimtalk-notifications';
import { sendStartGuideEmailIfOverseas } from '@/lib/email-notifications';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      aid?: string;
      nickname?: string;
      email?: string;
      phone?: string;
      blog_url?: string;
      class_type?: string;
      status?: string;
      memo?: string;
      is_overseas_resident?: boolean;
      is_first_time?: boolean;
      challenge_month?: string;
    };

    if ('email' in body && !body.email) {
      return Response.json({ error: '이메일은 필수입니다.' }, { status: 400 });
    }

    // Partial update — only include fields explicitly present in the body
    const updateData: Record<string, unknown> = {};
    if ('aid' in body) updateData.aid = body.aid || null;
    if ('nickname' in body) updateData.nickname = body.nickname || null;
    if ('email' in body) updateData.email = body.email;
    if ('phone' in body) updateData.phone = body.phone || null;
    if ('blog_url' in body) updateData.blog_url = body.blog_url || null;
    if ('status' in body) updateData.status = body.status;
    if ('memo' in body) updateData.memo = body.memo || null;
    if ('is_overseas_resident' in body) updateData.is_overseas_resident = body.is_overseas_resident ?? false;
    if ('is_first_time' in body) updateData.is_first_time = body.is_first_time ?? false;
    if ('challenge_month' in body) updateData.challenge_month = body.challenge_month || null;
    if ('class_type' in body) {
      updateData.class_type = body.class_type || null;
      if (body.class_type === '베이직반') {
        updateData.writing_goal = 3;
        updateData.personal_goal = 1;
      } else if (body.class_type === '부스터반') {
        updateData.writing_goal = 5;
        updateData.personal_goal = 1;
      } else {
        updateData.writing_goal = null;
        updateData.personal_goal = null;
      }
    }

    const supabase = adminClient();

    // applied → paid 변경 시 알림톡 발송을 위해 현재 상태 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let previousApplicant: any = null;
    if (body.status === 'paid') {
      const { data: current } = await supabase
        .from('applicants')
        .select('id, status, nickname, aid, email, phone, blog_url, class_type, writing_goal, personal_goal, is_overseas_resident')
        .eq('id', id)
        .single();
      previousApplicant = current;
    }

    const { data, error } = await supabase
      .from('applicants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // applied에서 paid로 변경된 경우에만 시작 메시지 알림톡 + 해외 거주자 이메일 발송
    if (previousApplicant?.status === 'applied' && body.status === 'paid') {
      try {
        await sendPaymentCompleteAlimtalk(supabase, previousApplicant);
      } catch (err) {
        console.error('[alimtalk] 시작 메시지 알림톡 발송 실패:', err instanceof Error ? err.message : err);
      }
      if (previousApplicant.is_overseas_resident) {
        try {
          await sendStartGuideEmailIfOverseas(supabase, previousApplicant);
        } catch (err) {
          console.error('[email] 시작 안내 이메일 발송 실패:', err instanceof Error ? err.message : err);
        }
      }
    }

    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = adminClient();

    // 신청자 존재 확인
    const { data: existing, error: findError } = await supabase
      .from('applicants')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return Response.json({ error: '신청자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // message_logs의 applicant_id를 null 처리 (발송 로그 보존)
    await supabase
      .from('message_logs')
      .update({ applicant_id: null })
      .eq('applicant_id', id);

    // 신청자 삭제
    const { error: deleteError } = await supabase
      .from('applicants')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
