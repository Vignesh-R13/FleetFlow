import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Ship } from 'lucide-react';
import StatCard from '../components/StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Vessels" value={24} icon={Ship} />);
    expect(screen.getByText('Total Vessels')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders without an icon', () => {
    render(<StatCard label="Delayed Voyages" value={2} />);
    expect(screen.getByText('Delayed Voyages')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders a placeholder value like "—" for loading states', () => {
    render(<StatCard label="Total Vessels" value="—" icon={Ship} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
