import { GoogleAuth } from 'google-auth-library';
import { logger } from '../utils/logger';

interface MeetingInput {
  title: string;
  startsAt: Date;
  endsAt: Date;
  attendeeEmail?: string;
}

function getCredentials() {
  const raw = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON;
  if (!raw || !process.env.GOOGLE_CALENDAR_ID) return null;

  try {
    return JSON.parse(raw);
  } catch {
    logger.warn('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is not valid JSON. Google Meet creation is disabled.');
    return null;
  }
}

export async function createGoogleMeet(input: MeetingInput): Promise<string | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const client = await auth.getClient();
    const requestId = `scs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const response = await client.request<any>({
      url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}/events`,
      method: 'POST',
      params: { conferenceDataVersion: 1, sendUpdates: 'all' },
      data: {
        summary: input.title,
        description: 'Sanyog Conformity Solutions consultation.',
        start: { dateTime: input.startsAt.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: input.endsAt.toISOString(), timeZone: 'Asia/Kolkata' },
        attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : [],
        conferenceData: {
          createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      },
    });

    return response.data?.hangoutLink ?? response.data?.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === 'video')?.uri ?? null;
  } catch (error: any) {
    logger.error('Google Meet creation failed', { message: error?.message });
    return null;
  }
}
