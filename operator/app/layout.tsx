import type { Metadata } from 'next';
import localFont from 'next/font/local';
// Vazirmatn (self-hosted via @fontsource): Persian glyphs with proper
// unicode-range splits; JetBrains Mono covers latin, Vazirmatn covers fa.
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import './globals.css';
import { getLocale, isRtl, t } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { CommandPalette } from '@/components/CommandPalette';
import { ConductorPanel } from '@/components/ConductorPanel';
import { getDb } from '@/lib/data';
import type { Command } from '@/lib/palette';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

// Self-hosted JetBrains Mono (next/font/local) so the build does not depend on
// reaching fonts.googleapis.com at compile time.
const fontMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: t('meta.title'),
  description: t('meta.description'),
};

const NAV_COMMANDS: Command[] = [
  { id: 'nav-home', label: t('nav.commandCore'), keywords: 'dashboard today overview start', href: '/', hint: 'view' },
  { id: 'nav-social', label: t('nav.channelSignal'), keywords: 'instagram tiktok twitter x youtube linkedin followers growth zernio casioplus', href: '/social', hint: 'view' },
  { id: 'nav-comms', label: t('nav.communications'), keywords: 'messages email whatsapp slack inbox unified feed', href: '/comms', hint: 'view' },
  { id: 'nav-agents', label: t('nav.agents'), keywords: 'runtime run real roster', href: '/agents', hint: 'view' },
  { id: 'nav-connections', label: t('nav.connections'), keywords: 'integrations tools status creds', href: '/integrations', hint: 'view' },
  { id: 'nav-roadmap', label: t('nav.roadmap'), keywords: 'plan phases quarters', href: '/roadmap', hint: 'view' },
  { id: 'nav-analytics', label: t('nav.casioMetric'), keywords: 'metrics numbers', href: '/analytics', hint: 'view' },
  { id: 'nav-reference', label: t('nav.referenceModel'), keywords: 'domains business brm', href: '/reference', hint: 'view' },
  { id: 'nav-org', label: t('nav.orgChart'), keywords: 'org chart hierarchy departments tree structure leads specialists', href: '/org', hint: 'view' },
  { id: 'nav-brain', label: t('nav.gBrain'), keywords: 'brain knowledge core markdown vector pgvector supabase embeddings zeroentropy graph doctor', href: '/brain', hint: 'view' },
  // Local apps discovered on this machine — open in a new tab
  { id: 'ext-command-center', label: 'Command Center', keywords: 'command-center kanban missions port 4000', href: 'http://localhost:4000', hint: 'localhost' },
  { id: 'ext-remotion', label: 'Remotion Studio', keywords: 'video render pipeline port 3789', href: 'http://localhost:3789', hint: 'localhost' },
  { id: 'ext-skool', label: 'Skool Community', keywords: 'launchpad cohort community posts', href: 'https://www.skool.com/launchpad-cohort', hint: 'web' },
  { id: 'ext-attio', label: 'Attio CRM', keywords: 'deals pipeline vantage', href: 'https://app.attio.com', hint: 'web' },
  { id: 'ext-fathom', label: 'Fathom Calls', keywords: 'meetings recordings notes', href: 'https://fathom.video', hint: 'web' },
];

function buildCommands(): Command[] {
  const db = getDb();
  const tools: Command[] = db.tools.all().map((t) => ({
    id: `tool-${t.id}`,
    label: t.name,
    keywords: `${t.category} ${t.description}`,
    href: '/integrations',
    hint: 'tool',
  }));
  const agents: Command[] = db.agents.all().map((a) => ({
    id: `agent-${a.id}`,
    label: a.name,
    keywords: `${a.role} ${a.description}`,
    href: '/agents',
    hint: 'agent',
  }));
  return [...NAV_COMMANDS, ...agents, ...tools];
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const rtl = isRtl(locale);
  return (
    <html lang={locale} dir={rtl ? 'rtl' : 'ltr'} className={fontMono.variable} suppressHydrationWarning>
      <head>
        {/* Apply the persisted theme before first paint — no dark↔light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Sidebar />
        {/* os-shell yields to the Conductor dock: the panel sets --conductor-w
            and the whole content column glides left instead of being covered */}
        <div
          className="os-shell ml-[232px] flex min-h-screen min-w-0 flex-col rtl:ml-0 rtl:mr-[232px]"
          style={{ [rtl ? 'marginLeft' : 'marginRight']: 'var(--conductor-w, 0px)' }}
        >
          <Topbar />
          <main className="min-w-0 flex-1 px-8 pb-16 pt-7 wide:px-10 ultra:px-12">
            {/* Width tiers: 1280 on laptops · 1760 on large monitors ·
                full-bleed on 32"/ultrawide. See tailwind screens wide/ultra. */}
            <div className="mx-auto max-w-[1280px] wide:max-w-[1760px] ultra:max-w-none">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette commands={buildCommands()} />
        {/* Notion-style agent dock — the Conductor, aware of the current screen */}
        <ConductorPanel />
      </body>
    </html>
  );
}
