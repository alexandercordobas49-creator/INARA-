import { describe, expect, it } from 'vitest';
import { evaluateSignals } from '../src/services/riskService.js';

function signals(overrides = {}) {
  return {
    totalXp: 500,
    totalSessions: 10,
    absentSessions: 0,
    recentSessions: 10,
    recentAbsences: 0,
    recentLates: 0,
    recentXpEvents: 5,
    currentStreak: 5,
    routesStarted: 1,
    completedMissions: 2,
    ...overrides
  };
}

describe('evaluateSignals', () => {
  it.each([
    [{ absentSessions: 0, recentXpEvents: 5, currentStreak: 5 }, 'low'],
    [{ absentSessions: 4, recentXpEvents: 2, currentStreak: 1 }, 'medium'],
    [{ totalXp: 100, absentSessions: 7, recentAbsences: 3, recentXpEvents: 0, currentStreak: 0, routesStarted: 0, completedMissions: 0 }, 'high'],
    [{ totalXp: 100, totalSessions: 10, absentSessions: 10, recentSessions: 0, recentAbsences: 10, recentXpEvents: 0, currentStreak: 0, routesStarted: 0, completedMissions: 0 }, 'critical']
  ])('produce el nivel %s', (overrides, expectedLevel) => {
    const evaluation = evaluateSignals(signals(overrides));
    expect(evaluation.level).toBe(expectedLevel);
    expect(evaluation.score).toBeGreaterThanOrEqual(0);
    expect(evaluation.score).toBeLessThanOrEqual(100);
  });

  it('deriva la causa principal de asistencia real', () => {
    const evaluation = evaluateSignals(signals({ absentSessions: 4, recentAbsences: 3 }));
    expect(evaluation.mainReason).toContain('ausencias');
    expect(evaluation.factors.some((factor) => factor.code === 'attendance')).toBe(true);
  });
});