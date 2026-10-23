import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders an unrecognized status without crashing', () => {
    render(<StatusBadge status="SomeNewStatus" />);
    expect(screen.getByText('SomeNewStatus')).toBeInTheDocument();
  });

  it('applies a distinct style for critical-style statuses vs active', () => {
    const { container: activeContainer } = render(<StatusBadge status="Active" />);
    const { container: criticalContainer } = render(<StatusBadge status="Overdue" />);
    const activeClass = activeContainer.querySelector('span').className;
    const criticalClass = criticalContainer.querySelector('span').className;
    expect(activeClass).not.toBe(criticalClass);
  });
});
