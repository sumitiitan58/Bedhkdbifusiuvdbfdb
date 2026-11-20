import { ArrowLeft, Compass } from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';

export default function NotFoundPage() {
  return (
    <PageLayout>
      <SeoHead
        title="Page Not Found — PREPSKM.IN"
        description="The requested page could not be found on PREPSKM.IN."
        canonicalPath="/"
        noIndex
      />
      <ResponsiveContainer size="narrow" className="py-20">
        <ReusableCard className="max-w-md mx-auto text-center space-y-4">
          <Compass className="w-10 h-10 text-[#E86F0C] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-[#0F214D] dark:text-white">
            Route Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The study page you requested does not exist. Use the navigation bar or return to the PREPSKM.IN homepage.
          </p>
          <ReusableButton variant="primary" to="/">
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </ReusableButton>
        </ReusableCard>
      </ResponsiveContainer>
    </PageLayout>
  );
}
