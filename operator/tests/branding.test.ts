import { afterEach, describe, expect, it } from 'vitest';
import { loadBranding, PLATFORM_NAME_EN } from '@/lib/branding';

describe('branding (platform + workspace display name)', () => {
  afterEach(() => {
    delete process.env.CASIO_WORKSPACE;
  });

  it('reads the workspace display name from the workspace config (casio → کاسیو پلاس)', () => {
    const branding = loadBranding();
    expect(branding.platformName).toBe(PLATFORM_NAME_EN);
    expect(branding.workspaceId).toBe('casio');
    expect(branding.workspaceName).toBe('کاسیو پلاس');
  });

  it('falls back to the workspace id when the config is missing', () => {
    process.env.CASIO_WORKSPACE = 'no-such-workspace';
    const branding = loadBranding();
    expect(branding.workspaceName).toBe('no-such-workspace');
  });
});
