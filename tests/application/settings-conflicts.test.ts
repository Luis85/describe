import { describe, expect, it, vi } from 'vitest';
import { SettingsStore } from '../../src/application/settings-store';

describe('first-use routing conflicts', () => {
  it('does not let a stale modal replace the route chosen by an earlier save', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const store = new SettingsStore(null, persist);
    const first = store.remember('file:png', 'First');
    const stale = store.remember('file:png', 'Stale');
    await first;
    await expect(stale).rejects.toThrow('newer destination');
    expect(store.value.extensionPaths['file:png']).toBe('First');
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('permits identical routes and explicit changes from the settings page', async () => {
    const store = new SettingsStore(null, () => Promise.resolve());
    await store.remember('file:png', '');
    await store.remember('file:png', '');
    await store.change(next => { next.extensionPaths['file:png'] = 'Updated'; });
    await expect(store.remember('file:png', 'Old')).rejects.toThrow('newer destination');
    expect(store.value.extensionPaths['file:png']).toBe('Updated');
    await store.forget('file:png');
    await store.remember('file:png', 'Fresh');
    expect(store.value.extensionPaths['file:png']).toBe('Fresh');
  });
});
