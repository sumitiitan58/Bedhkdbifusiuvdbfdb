import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { MentorshipAndCommunityHub } from '../components/mentorship/MentorshipAndCommunityHub';

export default function MentorsPage() {
  return (
    <PageLayout>
      <SeoHead
        title="1:1 Mentorship, Doubt Forum & Aspirant Community | Prepskm 2.0"
        description="Book 15–60 min 1:1 sessions with verified IIT & AIIMS mentors via cryptographic UPI passes, join live WebRTC calls, post doubts, and match with JEE/NEET study buddies."
        canonicalPath="/mentors"
      />
      <ResponsiveContainer className="py-6 sm:py-8">
        <MentorshipAndCommunityHub />
      </ResponsiveContainer>
    </PageLayout>
  );
}
