/**
 * Single source of truth for the app's primary navigation. The Sidebar renders
 * these groups in order; the CommandPalette derives its digit (1–9) shortcuts
 * from the same visible order, so the two can never drift apart again.
 */
import { t } from '@/lib/i18n';
import {
  Home,
  MessageSquare,
  Share2,
  Clapperboard,
  Users,
  ListChecks,
  Sparkles,
  Network,
  Brain,
  Wallet,
  Filter,
  Workflow,
  Map,
  Plug,
  BarChart3,
  LayoutGrid,
  Layers,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: typeof Home };

export const NAV_OPERATE: NavItem[] = [
  { href: '/', label: t('nav.commandCore'), icon: Home },
  { href: '/comms', label: t('nav.communications'), icon: MessageSquare },
  { href: '/funnel', label: t('nav.growthFlow'), icon: Filter },
  { href: '/workflows', label: t('nav.workflows'), icon: Workflow },
  { href: '/social', label: t('nav.channelSignal'), icon: Share2 },
  { href: '/content', label: t('nav.contentEngine'), icon: Clapperboard },
  { href: '/finances', label: t('nav.growthLedger'), icon: Wallet },
];

// The agent workforce: the roster and the org chart that maps how they report.
export const NAV_AGENTS: NavItem[] = [
  { href: '/agents', label: t('nav.agents'), icon: Users },
  { href: '/tasks', label: t('nav.coaching'), icon: ListChecks },
  { href: '/skills', label: t('nav.skills'), icon: Sparkles },
  { href: '/org', label: t('nav.orgChart'), icon: Network },
];

// The knowledge layer the agents draw on.
export const NAV_INTELLIGENCE: NavItem[] = [{ href: '/brain', label: t('nav.gBrain'), icon: Brain }];

export const NAV_SYSTEM: NavItem[] = [
  { href: '/integrations', label: t('nav.connections'), icon: Plug },
  { href: '/roadmap', label: t('nav.roadmap'), icon: Map },
  { href: '/analytics', label: t('nav.casioMetric'), icon: BarChart3 },
  { href: '/reference', label: t('nav.referenceModel'), icon: LayoutGrid },
];

// At the very bottom: persona templates that can run variants of this platform.
export const NAV_LIBRARY: NavItem[] = [{ href: '/personas', label: t('nav.personas'), icon: Layers }];

/** Visible top-to-bottom order across all groups. */
export const NAV_ORDER: string[] = [
  ...NAV_OPERATE,
  ...NAV_AGENTS,
  ...NAV_INTELLIGENCE,
  ...NAV_SYSTEM,
  ...NAV_LIBRARY,
].map((n) => n.href);

/** Digit keys 1–9 jump to the first nine views in visible order. */
export const DIGIT_VIEWS: string[] = NAV_ORDER.slice(0, 9);
