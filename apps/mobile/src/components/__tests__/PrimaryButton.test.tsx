import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrimaryButton from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('should render with title', () => {
    const { getByText } = render(<PrimaryButton title="로그인" onPress={() => {}} />);
    expect(getByText('로그인')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="로그인" onPress={mockOnPress} />);

    const button = getByText('로그인');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton title="로그인" onPress={mockOnPress} disabled={true} />
    );

    const button = getByText('로그인');
    fireEvent.press(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should apply disabled style when disabled prop is true', () => {
    const { getByTestId } = render(
      <PrimaryButton title="로그인" onPress={() => {}} disabled={true} testID="button" />
    );

    const button = getByTestId('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
