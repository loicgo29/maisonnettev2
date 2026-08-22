import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import * as OIDCManager from '../../src/auth/OIDCManager';

vi.mock('../../src/auth/OIDCManager');

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should load user on mount', async () => {
    const mockUser = {
      access_token: 'test_token',
      profile: {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(mockUser as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle getUser error gracefully', async () => {
    vi.mocked(OIDCManager.getUser).mockRejectedValueOnce(new Error('Auth failed'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should provide login and logout functions', () => {
    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('should call login function', async () => {
    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(null);
    vi.mocked(OIDCManager.login).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login();
    });

    expect(OIDCManager.login).toHaveBeenCalled();
  });

  it('should call logout function', async () => {
    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(null);
    vi.mocked(OIDCManager.logout).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(OIDCManager.logout).toHaveBeenCalled();
  });

  it('should not re-fetch user if already loaded', async () => {
    const mockUser = { access_token: 'test_token', profile: { sub: 'user-123' } };

    vi.mocked(OIDCManager.getUser).mockResolvedValueOnce(mockUser as any);

    const { result, rerender } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Re-render should not trigger another getUser call
    const callCount = vi.mocked(OIDCManager.getUser).mock.calls.length;
    rerender();

    expect(vi.mocked(OIDCManager.getUser).mock.calls.length).toBe(callCount);
  });
});
