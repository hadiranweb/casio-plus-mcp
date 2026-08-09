import { getDb } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { PersonasViewer } from '@/components/PersonasViewer';
import { Badge } from '@/components/terminal';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function PersonasPage() {
  const personas = getDb().personas.all();

  return (
    <div>
      <PageHeader
        eyebrow={t('pages.personas.eyebrow')}
        title={t('pages.personas.title')}
        right={<Badge tone="accent">{personas.length} templates</Badge>}
      />
      <PersonasViewer personas={personas} />
    </div>
  );
}
