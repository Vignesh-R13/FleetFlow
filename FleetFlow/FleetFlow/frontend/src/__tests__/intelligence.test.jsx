import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RiskBadge from '../components/RiskBadge';
import HealthScore from '../components/HealthScore';
import { classifyHealth, classifyRisk } from '../utils/intelligence';

describe('classifyHealth', () => {
  it('classifies scores into the correct bands', () => {
    expect(classifyHealth(95).label).toBe('Healthy');
    expect(classifyHealth(80).label).toBe('Good');
    expect(classifyHealth(65).label).toBe('Attention');
    expect(classifyHealth(45).label).toBe('At Risk');
    expect(classifyHealth(10).label).toBe('Critical');
  });

  it('clamps out-of-range scores instead of breaking', () => {
    expect(classifyHealth(150).score).toBe(100);
    expect(classifyHealth(-20).score).toBe(0);
  });
});

describe('classifyRisk', () => {
  it('classifies scores into the correct bands', () => {
    expect(classifyRisk(80).label).toBe('Critical');
    expect(classifyRisk(60).label).toBe('High');
    expect(classifyRisk(40).label).toBe('Medium');
    expect(classifyRisk(10).label).toBe('Low');
  });
});

describe('RiskBadge', () => {
  it('renders the computed label and score for a given risk score', () => {
    render(<RiskBadge score={91} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('91')).toBeInTheDocument();
  });

  it('allows overriding the displayed label while keeping the score', () => {
    render(<RiskBadge score={20} label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });
});

describe('HealthScore', () => {
  it('renders the score and classification label by default', () => {
    render(<HealthScore score={92} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('can hide the label', () => {
    render(<HealthScore score={92} showLabel={false} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument();
  });
});
