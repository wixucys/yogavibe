import { act, render, screen } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

import { useDebounce } from './useDebounce';

const DebounceProbe = ({ value, delay }: { value: string; delay: number }) => {
  const debounced = useDebounce(value, delay);
  return <div data-testid="debounced-value">{debounced}</div>;
};

const Host = () => {
  const [value, setValue] = useState('one');

  useEffect(() => {
    setValue('two');
  }, []);

  return <DebounceProbe value={value} delay={300} />;
};

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('updates value after configured delay', () => {
    render(<Host />);

    expect(screen.getByTestId('debounced-value')).toHaveTextContent('one');

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('one');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('two');
  });
});
