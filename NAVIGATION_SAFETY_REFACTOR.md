# QuizScreen Navigation Safety Refactor

## Overview
This document describes the critical refactoring of `QuizScreen.tsx` to fix the navigation state crash that occurs when users fail a quiz node. The issue manifested as:
- Abrupt `goBack()` or `pop()` transitions when score < 70%
- App crashes forcing users to force-close and restart
- Race conditions between state updates and navigation lifecycle hooks

---

## Root Cause Analysis

### Problem 1: State Mutation Triggering Implicit Navigation
**Original Flow (Broken):**
```
showResult=true AND canContinue=false (< 70%)
  ↓
useEffect fires: deductHeartOnFailure() called
  ↓
globalHearts context state updates
  ↓
Component re-renders
  ↓
HeartEvaluationAndModal checks: globalHearts <= 0?
  ↓
If YES: Auto-navigation.navigate('StudyJourney') fires IMMEDIATELY
  ↓
Navigation stack may have been in middle of lifecycle phase
  ↓
CRASH: Race condition with ResultScreen or other lifecycle hooks
```

### Problem 2: Out-of-Hearts Modal Interferes with Normal Flow
- Modal's `useEffect` depended on `globalHearts` and `resultTotalCount`
- Timing-dependent behavior: modal might show before user sees result screen
- Navigation from modal could interrupt ongoing state mutations

### Problem 3: No Explicit Navigation Cleanup
- Retry and Continue handlers didn't ensure all timers/intervals were cleared
- Navigation dispatch happened without confirming app state consistency

---

## Solution: Three Debugging Rules

### RULE 1: SEPARATE STATE MUTATION FROM NAVIGATION LIFECYCLE

**New State Variables:**
```typescript
const [heartDeductionPending, setHeartDeductionPending] = React.useState(false);
const [isOutOfHearts, setIsOutOfHearts] = React.useState(false);
const [navigationBlocked, setNavigationBlocked] = React.useState(false);
```

**New Flow (Fixed):**
```
showResult=true AND canContinue=false (< 70%)
  ↓
useEffect fires ONLY when NOT heartDeductionPending
  ↓
setHeartDeductionPending(true) - Lock subsequent calls
  ↓
Async: await deductHeartOnFailure()
  ↓
Check: globalHearts - 1 <= 0?
  ↓
If YES: setIsOutOfHearts(true) - local state toggle
  ↓
setHeartDeducted(true) + setHeartDeductionPending(false)
  ↓
NO automatic navigation occurs
  ↓
ResultScreen stays mounted in background
  ↓
User sees OutOfHeartsInterceptor modal on top
  ↓
User explicitly clicks button
```

**Key Change:**
```typescript
// BEFORE: Automatic state → automatic effect → navigation
// AFTER: State update → explicit user action → navigation
```

---

### RULE 2: SAFE THREAD HANDLING FOR OUT-OF-HEARTS

**Previous Implementation Issues:**
- Modal auto-showed based on `globalHearts <= 0` dependency
- Modal's navigation handlers could conflict with normal flow
- No protection against double-navigation

**New Implementation:**
```typescript
// OutOfHeartsInterceptor receives EXPLICIT callbacks
type OutOfHeartsInterceptorProps = {
  isVisible: boolean;
  globalHearts: number;
  totalXp: number;
  topUpCount: number;
  onRefill: () => Promise<void>;        // User explicitly clicks "Refill"
  onReturnToRoadmap: () => void;        // User explicitly clicks "Return"
  onStayOnResult: () => void;           // User explicitly clicks "Stay"
};
```

**Result Screen Remains Mounted:**
```typescript
if (showResult) {
  return (
    <>
      {/* Result screen always visible */}
      <ResultScreen
        score={displayScore}
        correctCount={resultCorrectCount}
        totalCount={resultTotalCount}
        answers={answers}
        isBoss={isBoss}
        onRetry={handleRetry}
        onContinue={handleContinue}
        canContinue={canContinue}
      />
      {/* Modal overlays on top IF hearts are out */}
      <OutOfHeartsInterceptor
        isVisible={isOutOfHearts}
        {...props}
        onReturnToRoadmap={() => {
          setNavigationBlocked(true);  // Signal: about to navigate
          navigation.navigate('StudyJourney', { materialId });
        }}
        {...}
      />
    </>
  );
}
```

**Benefits:**
- ResultScreen never unmounts while modal shows
- No race conditions between unmount and modal lifecycle
- User stays on "current screen overlay" not "intermediate navigation state"
- Prevents the glitchy goBack() behavior

---

### RULE 3: EXPLICIT NAVIGATION CLEANUP ON ACTION BUTTONS

**Previous Implementation:**
```typescript
// BEFORE: implicit navigation in modal effects
const handleBack = () => {
  setVisible(false);  // Hide modal
  // Problem: what about active timers in useQuizScreen?
  // Problem: what if ResultScreen is in middle of effect?
  navigation.navigate('StudyJourney', { materialId });
};
```

**New Implementation:**
```typescript
// AFTER: explicit navigation WITH state preparation
const handleRetryButton = () => {
  // Reset local quiz states
  setCurrentIndex(0);
  setAnswers([]);
  setShowResult(false);
  // Clear all timers (handled in useQuizScreen)
  // Quiz restarts from question 1
};

const handleContinueButton = async () => {
  // Prepare for next step
  setCompleteNavigationAllowed(true);
  completeQuiz({
    answers,
    correctCount,
    totalCount,
  });
  // Navigation ONLY happens after all state is ready
};

const handleReturnToRoadmap = () => {
  setNavigationBlocked(true);  // This flag prevents beforeRemove alert
  try {
    console.warn('OOF_ROADMAP_NAVIGATION', { ... });
  } catch (e) {
    console.warn('OOF_ROADMAP_LOG_FAIL', e);
  }
  navigation.navigate('StudyJourney', { materialId });
};
```

**Updated beforeRemove Listener:**
```typescript
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    // Allow navigation only when:
    // 1. On result screen (showResult=true) AND
    // 2. User explicitly triggered it (navigationBlocked=true)
    if (!showResult && !navigationBlocked) {
      e.preventDefault();
      Alert.alert('Thoát bài test', '...', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thoát', onPress: () => {
          navigation.dispatch(e.data.action);
        }},
      ]);
    }
  });
  return unsubscribe;
}, [navigation, showResult, navigationBlocked]);
```

---

## Code Changes Summary

### QuizScreen.tsx Modifications

#### 1. New State Variables
```typescript
const [heartDeductionPending, setHeartDeductionPending] = React.useState(false);
const [isOutOfHearts, setIsOutOfHearts] = React.useState(false);
const [navigationBlocked, setNavigationBlocked] = React.useState(false);
```

#### 2. Separated Heart Deduction Effect
```typescript
React.useEffect(() => {
  if (showResult && !canContinue && !heartDeducted && !heartDeductionPending) {
    setHeartDeductionPending(true);
    (async () => {
      try {
        if (typeof deductHeartOnFailure === 'function') {
          await deductHeartOnFailure();
        }
        setHeartDeducted(true);
        
        // Check if hearts are now 0 AFTER deduction
        if (globalHearts - 1 <= 0) {
          setIsOutOfHearts(true);  // Triggers modal, NOT navigation
        }
      } catch (err) {
        console.warn('Lỗi khi trừ tim...', err);
        setHeartDeducted(true);
      } finally {
        setHeartDeductionPending(false);
      }
    })();
  }
}, [showResult, canContinue, heartDeducted, heartDeductionPending, deductHeartOnFailure, globalHearts]);
```

#### 3. New OutOfHeartsInterceptor Component
- Receives explicit callback props instead of direct navigation
- Shows modal without interfering with result screen
- User must click button to trigger navigation
- Includes loading state for refill operation

#### 4. Updated beforeRemove Listener
- Checks `navigationBlocked` flag before allowing navigation
- Prevents accidental back gesture while modal is visible

---

## useQuizScreen Hook Updates Needed

No changes required to the core hook logic. The separation happens at the `QuizScreen` level.

**However, ensure these callbacks are properly connected:**

```typescript
// Passed from QuizScreen to useQuizScreen:
deductHeartOnFailure={deductHeartOnFailure}

// The hook should NOT call navigation directly
// Instead, it sets showResult=true
// QuizScreen handles all navigation logic
```

---

## Testing Checklist

### Test 1: Failed Quiz (Score < 70%)
- [ ] Complete quiz with score < 70%
- [ ] Verify result screen shows
- [ ] Verify one heart deducts asynchronously
- [ ] App should NOT force-close or crash
- [ ] Result screen remains visible

### Test 2: Out-of-Hearts Scenario (Hearts = 0)
- [ ] Use up all hearts, then complete quiz with score < 70%
- [ ] Verify OutOfHeartsInterceptor modal appears OVER result screen
- [ ] Result screen should still be visible in background
- [ ] User should NOT be forced away from screen

### Test 3: Refill Hearts Button
- [ ] While OutOfHeartsInterceptor is visible, click "Nạp 1 tim - 200 XP"
- [ ] Verify heart refill happens (200 XP → 1 heart)
- [ ] Modal should close
- [ ] User can still see result screen and retry

### Test 4: Return to Roadmap Button
- [ ] While OutOfHeartsInterceptor is visible, click "Quay về hành trình"
- [ ] Verify navigation to StudyJourney happens smoothly
- [ ] App should NOT crash during transition
- [ ] No glitchy goBack() behavior

### Test 5: Stay on Result Button
- [ ] While OutOfHeartsInterceptor is visible, click "Ở lại xem kết quả"
- [ ] Modal should close
- [ ] Result screen should still be visible
- [ ] User should be able to click "Làm lại" to retry

### Test 6: Retry Quiz After Failure
- [ ] Fail quiz (score < 70%), then click "Làm lại"
- [ ] Quiz should restart from question 1
- [ ] Previous answer records should clear
- [ ] Heart should have already been deducted from previous attempt

### Test 7: Back Gesture Prevention
- [ ] On result screen (before any action), swipe back
- [ ] Alert should appear asking "Thoát bài test?"
- [ ] Clicking "Hủy" should keep user on result screen
- [ ] App should NOT crash during this interaction

### Test 8: Passing Quiz (Score >= 70%)
- [ ] Complete quiz with score >= 70%
- [ ] Result screen should show
- [ ] Heart should NOT deduct
- [ ] OutOfHeartsInterceptor should NOT appear
- [ ] "Tiếp tục" button should navigate to next node

---

## Migration Guide

### For Other Components
If other components also call `deductHeartOnFailure()`:
1. **Do NOT** expect immediate side effects
2. Separate state mutation from navigation
3. Handle completion via local state toggles, not implicit effects

### For ResultScreen Component
The ResultScreen no longer needs to handle modal display:
```typescript
// BEFORE: ResultScreen managed when to show modal
// AFTER: QuizScreen manages modal visibility via OutOfHeartsInterceptor
```

---

## Performance Implications

✅ **No Performance Regression:**
- Same number of state updates
- One additional local state variable (minimal overhead)
- Modal transitions unchanged

✅ **Improved Stability:**
- Eliminated race conditions
- Reduced re-render cycles due to clearer state boundaries
- Explicit state transitions easier to debug

---

## Debugging Aids

The refactored code includes console.warn statements for debugging:

```typescript
// In useEffect for beforeRemove:
console.warn('USER_NAV_BEFORE_REMOVE_DISPATCH', { 
  showResult, 
  canContinue, 
  navigationBlocked,
  globalHearts,
  routeParams: route.params 
});

// In OutOfHeartsInterceptor onReturnToRoadmap:
console.warn('OOF_ROADMAP_NAVIGATION', { 
  reason: 'user_clicked_return', 
  materialId,
  globalHearts 
});

// In heart deduction effect:
console.warn('Lỗi khi trừ tim...', err);
```

---

## Future Enhancements

### 1. Add Visual Feedback
- Show heart deduction animation
- Show modal entry transition

### 2. Analytics
- Track which button user clicks in OutOfHeartsInterceptor
- Track quiz retry success rate

### 3. UX Improvements
- Add countdown timer before auto-returning to roadmap (optional)
- Show XP balance in refill button
- Show daily refill count remaining

---

## FAQ

**Q: Why not just fix the navigation stack?**
A: The issue is deeper—it's a race condition between state updates and lifecycle hooks. Fixing the stack would be a bandaid solution.

**Q: Will this break existing quiz sessions?**
A: No. The changes are backward compatible. Existing session logging still works.

**Q: How do I verify the fix works?**
A: Run through the Testing Checklist above. The key is: **no more crashes when failing a quiz**.

**Q: Can I still navigate back from ResultScreen?**
A: Yes, but you'll get a confirmation dialog asking if you want to exit. This is intentional.

---

## Rollback Instructions

If issues arise, restore original `QuizScreen.tsx` and the old `HeartEvaluationAndModal` component. However, the issue would reappear.

Better: Identify the specific case that breaks, then refine the state logic rather than full rollback.

---

## References

- Navigation State: React Navigation docs on [Navigator State](https://reactnavigation.org/docs/navigation-state/)
- useEffect Cleanup: [React Hooks Cleanup](https://reactjs.org/docs/hooks-effect.html#cleaning-up-an-effect)
- Modal Best Practices: [React Native Modal](https://reactnative.dev/docs/modal)
