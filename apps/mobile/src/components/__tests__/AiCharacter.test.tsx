/**
 * AI Character Component Tests
 *
 * Test 7.23: test_character_avatar - AI 캐릭터 아바타 표시
 * Test 7.24: test_character_typing_indicator - 입력 중 표시 (...)
 * Test 7.25: test_character_sleep_state - 구독 없을 때 잠자는 상태 (Zzz)
 * Test 7.26: test_character_age_display - 캐릭터 나이 표시
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AiCharacter from '../AiCharacter';

describe('AiCharacter', () => {
  describe('test_character_avatar', () => {
    /**
     * Test 7.23: AI Character Avatar Display
     *
     * Given: AI Character component is rendered
     * When: Component displays the character
     * Then:
     *   - Avatar image or icon should be visible
     *   - Character should have distinctive appearance
     *   - Should be positioned appropriately in the chat
     */
    it('should display AI character avatar', () => {
      // Arrange & Act
      render(<AiCharacter status="idle" />);

      // Assert
      const avatar = screen.getByTestId('ai-character-avatar');
      expect(avatar).toBeTruthy();

      // Check for character visual element (emoji or image)
      const characterFace = screen.getByText('🤖');
      expect(characterFace).toBeTruthy();
    });

    it('should display character with custom style', () => {
      // Arrange & Act
      render(<AiCharacter status="idle" size="large" />);

      // Assert
      const avatar = screen.getByTestId('ai-character-avatar');
      expect(avatar.props.style).toContainEqual(
        expect.objectContaining({
          width: 60,
          height: 60,
        })
      );
    });
  });

  describe('test_character_typing_indicator', () => {
    /**
     * Test 7.24: Typing Indicator Display
     *
     * Given: AI is processing/generating a response
     * When: Character status is "typing"
     * Then:
     *   - Should display typing indicator (...)
     *   - Indicator should be animated or visually distinct
     *   - Should replace or overlay the default avatar
     */
    it('should display typing indicator when AI is typing', () => {
      // Arrange & Act
      render(<AiCharacter status="typing" />);

      // Assert
      const typingIndicator = screen.getByTestId('typing-indicator');
      expect(typingIndicator).toBeTruthy();

      // Check for typing dots
      const dots = screen.getByText('...');
      expect(dots).toBeTruthy();
    });

    it('should hide typing indicator when idle', () => {
      // Arrange & Act
      render(<AiCharacter status="idle" />);

      // Assert
      const typingIndicator = screen.queryByTestId('typing-indicator');
      expect(typingIndicator).toBeNull();
    });
  });

  describe('test_character_sleep_state', () => {
    /**
     * Test 7.25: Sleep State Display
     *
     * Given: User has no active subscription (after trial)
     * When: Character status is "sleeping"
     * Then:
     *   - Should display sleep indicator (Zzz)
     *   - Character should appear inactive/sleeping
     *   - Visual cue that character is unavailable
     */
    it('should display sleeping state when subscription is inactive', () => {
      // Arrange & Act
      render(<AiCharacter status="sleeping" />);

      // Assert
      const sleepIndicator = screen.getByTestId('sleep-indicator');
      expect(sleepIndicator).toBeTruthy();

      // Check for Zzz text
      const zzz = screen.getByText('Zzz');
      expect(zzz).toBeTruthy();
    });

    it('should show sleeping character emoji', () => {
      // Arrange & Act
      render(<AiCharacter status="sleeping" />);

      // Assert
      const sleepingFace = screen.getByText('😴');
      expect(sleepingFace).toBeTruthy();
    });
  });

  describe('test_character_age_display', () => {
    /**
     * Test 7.26: Character Age Display
     *
     * Given: AI character has an age/generation property
     * When: Component renders with age prop
     * Then:
     *   - Should display age or generation info
     *   - Age should be formatted appropriately (e.g., "3일째", "1살")
     *   - Should update based on creation date
     */
    it('should display character age', () => {
      // Arrange & Act
      const createdAt = new Date('2025-01-01');
      render(<AiCharacter status="idle" createdAt={createdAt} />);

      // Assert
      const ageDisplay = screen.getByTestId('character-age');
      expect(ageDisplay).toBeTruthy();

      // Check that age text exists (will vary based on current date)
      expect(screen.getByText(/일째|개월|살/)).toBeTruthy();
    });

    it('should calculate and display correct age', () => {
      // Arrange
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Act
      render(<AiCharacter status="idle" createdAt={threeDaysAgo} />);

      // Assert
      const ageText = screen.getByText('3일째');
      expect(ageText).toBeTruthy();
    });

    it('should display age in months after 30 days', () => {
      // Arrange
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      // Act
      render(<AiCharacter status="idle" createdAt={twoMonthsAgo} />);

      // Assert
      const ageText = screen.getByText('2개월');
      expect(ageText).toBeTruthy();
    });
  });
});