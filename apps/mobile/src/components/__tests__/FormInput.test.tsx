import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormInput from '../FormInput';

describe('FormInput', () => {
  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(
      <FormInput placeholder="이메일" value="" onChangeText={() => {}} />
    );
    expect(getByPlaceholderText('이메일')).toBeTruthy();
  });

  it('should display the provided value', () => {
    const { getByDisplayValue } = render(
      <FormInput placeholder="이메일" value="test@example.com" onChangeText={() => {}} />
    );
    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('should call onChangeText when text changes', () => {
    const mockOnChange = jest.fn();
    const { getByPlaceholderText } = render(
      <FormInput placeholder="이메일" value="" onChangeText={mockOnChange} />
    );

    const input = getByPlaceholderText('이메일');
    fireEvent.changeText(input, 'new@example.com');

    expect(mockOnChange).toHaveBeenCalledWith('new@example.com');
  });

  it('should render as secure text entry when secureTextEntry is true', () => {
    const { getByPlaceholderText } = render(
      <FormInput
        placeholder="비밀번호"
        value="password123"
        onChangeText={() => {}}
        secureTextEntry={true}
      />
    );

    const input = getByPlaceholderText('비밀번호');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('should use email-address keyboard type when specified', () => {
    const { getByPlaceholderText } = render(
      <FormInput
        placeholder="이메일"
        value=""
        onChangeText={() => {}}
        keyboardType="email-address"
      />
    );

    const input = getByPlaceholderText('이메일');
    expect(input.props.keyboardType).toBe('email-address');
  });

  it('should apply autoCapitalize none by default', () => {
    const { getByPlaceholderText } = render(
      <FormInput placeholder="이메일" value="" onChangeText={() => {}} />
    );

    const input = getByPlaceholderText('이메일');
    expect(input.props.autoCapitalize).toBe('none');
  });
});
