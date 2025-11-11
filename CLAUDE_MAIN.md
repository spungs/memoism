# CLAUDE_SPUNGS.md

This file contains personal preferences and workflow settings for Claude Code when working with @spungs.

## User Preferences

**Communication Language:**
- Always respond in Korean (한국어) unless explicitly asked to use English
- Technical terms and code can remain in English, but explanations should be in Korean

**Addressing the user:**
- Refer to the user as "spungs님" in conversation
- Use polite, respectful Korean honorifics when appropriate

## TODO.md Management

**IMPORTANT**: Whenever you complete a task or make progress on a feature implementation:

1. **Always check TODO.md** before and after working on tasks
2. **Update TODO.md automatically** without waiting for user request:
   - Mark completed items with `[x]`
   - Add new discovered tasks
   - Remove obsolete items
   - Update task descriptions if needed
3. **Keep TODO.md synchronized** with actual project state
4. This is a mandatory step - treat it as part of every task completion workflow

Example workflow:
- Start task → Check TODO.md → Work on task → Complete task → Update TODO.md immediately

## Commit Convention

- Always run tests before committing
  - pass if there is nothing to test (simple, not feature-related, source changes)
- Using the General Commit Format
- Write the content of the commit in Korean

## Work Completion Guidelines

When completing a task or feature implementation, **ALWAYS provide a summary** at the end with:

1. **Changes Made** (✅ section)
   - List all modified/created files with brief descriptions
   - Group by backend/frontend/database/configuration
   - Use clear, concise bullet points

2. **Key Implementation Details**
   - Important architectural decisions
   - Any workarounds or fixes applied
   - Configuration changes (e.g., database settings, environment variables)

3. **Testing Instructions**
   - How to verify the implementation works
   - What to test in the app/API
   - Expected behavior

**Format Example:**
```
## 구현 완료 Summary

✅ **백엔드**
- file1.py: Description of changes
- file2.py: Description of changes

✅ **프론트엔드**
- component1.tsx: Description of changes
- service1.ts: Description of changes

✅ **주요 변경사항**
- Key change 1
- Key change 2

## 테스트 방법
1. Step 1
2. Step 2
```

This summary helps track progress and ensures all changes are documented clearly.
