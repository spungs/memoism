import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorScreen from '../ErrorScreen';

describe('ErrorScreen', () => {
  it('should render error message', () => {
    const { getByText } = render(<ErrorScreen message="데이터를 불러오는데 실패했습니다" />);
    expect(getByText('데이터를 불러오는데 실패했습니다')).toBeTruthy();
  });

  it('should render with custom testID', () => {
    const { getByTestId } = render(
      <ErrorScreen message="에러 발생" testID="custom-error" />
    );
    expect(getByTestId('custom-error')).toBeTruthy();
  });

  it('should have error text style', () => {
    const { getByTestId } = render(<ErrorScreen message="에러 발생" />);
    const errorText = getByTestId('error-text');
    expect(errorText.props.style).toEqual(
      expect.objectContaining({
        fontSize: 16,
        color: '#FF3B30',
      })
    );
  });
});
