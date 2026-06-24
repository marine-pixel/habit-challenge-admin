import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { sendPaymentCompleteAlimtalk, type ApplicantForNotification } from '@/lib/alimtalk-notifications';
import { sendStartGuideEmailIfOverseas } from '@/lib/email-notifications';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

const VALID_STATUSES = ['applied', 'paid', 'cancelled'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json() as { ids: unknown; status: unknown };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids 배열이 필요합니다.' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return Response.json({ error: '유효하지 않은 상태값입니다.' }, { status: 400 });
    }

    const supabase = adminClient();

    // paid로 변경하는 경우, 현재 paid가 아닌 대상자만 조회 (첫 paid 전환 시 알림톡 발송)
    let applicantsToNotify: ApplicantForNotification[] = [];
    if (status === 'paid') {
      const { data: current } = await supabase
        .from('applicants')
        .select('id, nickname, aid, email, phone, blog_url, class_type, writing_goal, personal_goal, is_overseas_resident')
        .in('id', ids as string[])
        .neq('status', 'paid');
      applicantsToNotify = (current ?? []) as ApplicantForNotification[];
    }

    const { error } = await supabase
      .from('applicants')
      .update({ status })
      .in('id', ids as string[]);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // 상태 변경 성공 후, 첫 paid 전환 대상자에게 신청 완료 메시지 알림톡 + 해외 거주자 이메일 발송
    if (applicantsToNotify.length > 0) {
      const alimtalkResults = await Promise.allSettled(
        applicantsToNotify.map((applicant) => sendPaymentCompleteAlimtalk(supabase, applicant))
      );
      alimtalkResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const applicant = applicantsToNotify[index];
          console.error(
            `[alimtalk] 신청 완료 메시지 알림톡 발송 실패 (id=${applicant?.id ?? 'unknown'}):`,
            result.reason instanceof Error ? result.reason.message : result.reason
          );
        }
      });

      const overseasApplicants = applicantsToNotify.filter((a) => a.is_overseas_resident);
      if (overseasApplicants.length > 0) {
        const emailResults = await Promise.allSettled(
          overseasApplicants.map((applicant) => sendStartGuideEmailIfOverseas(supabase, applicant))
        );
        emailResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            const applicant = overseasApplicants[index];
            console.error(
              `[email] 완료 안내 이메일 발송 실패 (id=${applicant?.id ?? 'unknown'}):`,
              result.reason instanceof Error ? result.reason.message : result.reason
            );
          }
        });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
