import { render } from "@react-email/render";
import { briefMail, getResend } from "./resend";
import { buildVerifyUrl, VERIFICATION_TOKEN_TTL_HOURS } from "./verification";
import { PredictionVerificationEmail } from "@/emails/PredictionVerificationEmail";

export interface SendPredictionVerificationEmailInput {
  to: string;
  token: string;
  predictionId: string;
  rarityBand: string;
  storyLine: string;
}

export async function sendPredictionVerificationEmail(
  input: SendPredictionVerificationEmailInput,
): Promise<{ messageId: string | null }> {
  // Re-use the same /api/verify URL builder; the route will branch on
  // the simulator subscriber via query-string-driven redirect logic.
  const baseUrl = buildVerifyUrl(input.token);
  const verifyUrl = `${baseUrl}&redirect=scenario`;

  const subject = `[45A] Confirm tracking for prediction #${input.predictionId}`;

  const html = await render(
    PredictionVerificationEmail({
      verifyUrl,
      predictionId: input.predictionId,
      rarityBand: input.rarityBand,
      storyLine: input.storyLine,
      expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
    }),
  );
  const text = await render(
    PredictionVerificationEmail({
      verifyUrl,
      predictionId: input.predictionId,
      rarityBand: input.rarityBand,
      storyLine: input.storyLine,
      expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
    }),
    { plainText: true },
  );

  const resend = getResend();
  const result = await resend.emails.send({
    from: briefMail.from,
    replyTo: briefMail.replyTo,
    to: input.to,
    subject,
    html,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend send failed: ${result.error.name} ${result.error.message}`,
    );
  }
  return { messageId: result.data?.id ?? null };
}
