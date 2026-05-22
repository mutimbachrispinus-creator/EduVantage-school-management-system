import Nav from '@/components/landing/Nav';
import Hero from '@/components/landing/Hero';
import StatsStrip from '@/components/landing/StatsStrip';
import CurriculumAdapter from '@/components/landing/CurriculumAdapter';
import PortalsWorkspace from '@/components/landing/PortalsWorkspace';
import FeatureCatalog from '@/components/landing/FeatureCatalog';
import SecurityBlueprint from '@/components/landing/SecurityBlueprint';
import DemoHighlight from '@/components/landing/DemoHighlight';
import Comparison from '@/components/landing/Comparison';
import FAQSection from '@/components/landing/FAQSection';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';
import ChatBot from '@/components/ChatBot';

export const metadata = {
  title: 'EduVantage | Complete School Management Platform',
  description: 'EduVantage simplifies admissions, fee collections, academics, payroll, and messaging. Manage your entire school efficiently with an intuitive, all-in-one system.',
};

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900 font-inter overflow-x-hidden max-w-[100vw]">
      <Nav />
      <Hero />
      <StatsStrip />
      <CurriculumAdapter />
      <PortalsWorkspace />
      <FeatureCatalog />
      <SecurityBlueprint />
      <DemoHighlight />
      <Comparison />
      <FAQSection />
      
      {/* 
        In a real server component, you could fetch plans from the DB here and pass them:
        const plans = await db.query.plans.findMany();
        <PricingSection plans={plans} />
      */}
      <PricingSection />
      
      <Footer />

      <div className="fixed bottom-6 left-6 z-[9998]">
        <ChatBot />
      </div>
    </div>
  );
}
