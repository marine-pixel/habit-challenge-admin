type Channel = 'alimtalk' | 'lms' | 'email';
type Provider = 'solapi' | 'gmail_smtp';
type TriggerType = 'application_created' | 'payment_marked_paid' | 'manual_send';
type LogStatus = 'success' | 'failed' | 'skipped';

interface LogMessageSendParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  channel: Channel;
  provider: Provider;
  trigger_type: TriggerType;
  template_name: string;
  template_code?: string | null;
  status: LogStatus;
  applicant_id?: string | null;
  aid?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logMessageSend(params: LogMessageSendParams): Promise<void> {
  const { supabase, ...fields } = params;
  try {
    const { error } = await supabase.from('message_logs').insert({
      channel: fields.channel,
      provider: fields.provider,
      trigger_type: fields.trigger_type,
      template_name: fields.template_name,
      template_code: fields.template_code ?? null,
      status: fields.status,
      applicant_id: fields.applicant_id ?? null,
      aid: fields.aid ?? null,
      recipient_name: fields.recipient_name ?? null,
      recipient_phone: fields.recipient_phone ?? null,
      recipient_email: fields.recipient_email ?? null,
      error_message: fields.error_message ?? null,
      metadata: fields.metadata ?? null,
    });
    if (error) {
      console.error('[message-logs] 로그 저장 실패:', error.message);
    }
  } catch (err) {
    console.error('[message-logs] 로그 저장 예외:', err instanceof Error ? err.message : err);
  }
}
