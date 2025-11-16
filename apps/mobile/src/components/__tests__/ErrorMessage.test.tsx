import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    const { getByText } = render(<ErrorMessage message="이메일을 입력해주세요" />);
    expect(getByText('이메일을 입력해주세요')).toBeTruthy();
  });

  it('should not render when message is empty', () => {
    const { queryByTestId } = render(<ErrorMessage message="" testID="error" />);
    expect(queryByTestId('error')).toBeNull();
  });

  it('should apply field error style by default', () => {
    const { getByTestId } = render(
      <ErrorMessage message="이메일을 입력해주세요" testID="error" />
    );

    const errorText = getByTestId('error');
    expect(errorText.props.style).toEqual(
      expect.objectContaining({
        color: '#FF3B30',
        fontSize: 14,
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
      })
    );
  });

  it('should apply server error style when variant is server', () => {
    const { getByTestId } = render(
      <ErrorMessage message="서버 오류가 발생했습니다" variant="server" testID="error" />
    );

    const errorText = getByTestId('error');
    expect(errorText.props.style).toEqual(
      expect.objectContaining({
        color: '#FF3B30',
        fontSize: 15,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#FFE5E5',
        borderRadius: 8,
        textAlign: 'center',
      })
    );
  });
});
