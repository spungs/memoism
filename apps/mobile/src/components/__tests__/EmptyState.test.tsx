import React from 'react';
import { render } from '@testing-library/react-native';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('should render empty message', () => {
    const { getByText } = render(<EmptyState message="작성된 일기가 없습니다" />);
    expect(getByText('작성된 일기가 없습니다')).toBeTruthy();
  });

  it('should render with custom testID', () => {
    const { getByTestId } = render(
      <EmptyState message="빈 상태" testID="custom-empty" />
    );
    expect(getByTestId('custom-empty')).toBeTruthy();
  });

  it('should have empty text style', () => {
    const { getByTestId } = render(<EmptyState message="빈 상태" />);
    const emptyText = getByTestId('empty-text');
    expect(emptyText.props.style).toEqual(
      expect.objectContaining({
        fontSize: 16,
        color: '#8E8E93',
      })
    );
  });
});
