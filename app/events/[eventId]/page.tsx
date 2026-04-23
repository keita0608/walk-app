import { redirect } from 'next/navigation';

// Redirect to ranking as the default event view for users
export default function EventPage({ params }: { params: { eventId: string } }) {
  redirect(`/events/${params.eventId}/ranking`);
}
