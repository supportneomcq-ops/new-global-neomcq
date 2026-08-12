'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  Image,
  UserPlus,
  BookOpen,
  HelpCircle,
  Cpu,
  CreditCard,
  Mail,
  Bell,
  Smartphone,
  Globe,
  Share2,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

const SETTINGS_TABS = [
  { label: 'General', href: '/admin/settings/general', icon: Settings },
  { label: 'Branding', href: '/admin/settings/branding', icon: Image },
  { label: 'Onboarding', href: '/admin/settings/onboarding', icon: UserPlus },
  { label: 'Learning', href: '/admin/settings/learning', icon: BookOpen },
  { label: 'MCQ', href: '/admin/settings/mcq', icon: HelpCircle },
  { label: 'AI Settings', href: '/admin/settings/ai', icon: Cpu },
  { label: 'Payment Settings', href: '/admin/settings/payments', icon: CreditCard },
  { label: 'Email Settings', href: '/admin/settings/email', icon: Mail },
  { label: 'Notification Settings', href: '/admin/settings/notifications', icon: Bell },
  { label: 'PWA', href: '/admin/settings/pwa', icon: Smartphone },
  { label: 'SEO Settings', href: '/admin/settings/seo', icon: Globe },
  { label: 'Integrations', href: '/admin/settings/integrations', icon: Share2 },
  { label: 'Feature Flags', href: '/admin/settings/features', icon: Sliders },
  { label: 'Advanced', href: '/admin/settings/advanced', icon: AlertTriangle },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Title Header */}
      <div>
        <h1 id="settings-header" className="text-2xl font-heading font-black flex items-center gap-2.5 text-white">
          <Settings className="w-6 h-6 text-[#6D5BFF]" />
          <span>Platform Settings Control Deck</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure global metadata, payment gateways, learning parameters, AI routing, and live integrations.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-800/60 pb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 flex gap-1.5">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href === '/admin/settings/general' && pathname === '/admin/settings');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#312ecb]/20 text-[#6D5BFF] border-b-2 border-[#6D5BFF]'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings Content Area */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}
