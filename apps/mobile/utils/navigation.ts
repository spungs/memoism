import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';

export function resetToLogin() {
  if (navigationRef.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AuthLogin' }],
      })
    );
  }
}

export function navigateToLogin() {
  if (navigationRef.current) {
    navigationRef.current.navigate('AuthLogin');
  }
} 