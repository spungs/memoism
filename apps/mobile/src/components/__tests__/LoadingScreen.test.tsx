import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingScreen from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('should render loading indicator', () => {
    const { getByTestId } = render(<LoadingScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should render with custom testID', () => {
    const { getByTestId } = render(<LoadingScreen testID="custom-loading" />);
    expect(getByTestId('custom-loading')).toBeTruthy();
  });

  it('should have correct activity indicator color', () => {
    const { getByTestId } = render(<LoadingScreen />);
    const indicator = getByTestId('loading-indicator');
    expect(indicator.props.color).toBe('#007AFF');
  });

  it('should have large size activity indicator', () => {
    const { getByTestId } = render(<LoadingScreen />);
    const indicator = getByTestId('loading-indicator');
    expect(indicator.props.size).toBe('large');
  });
});
