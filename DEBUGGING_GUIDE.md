# QuizScreen Debugging & Troubleshooting Guide

## Quick Reference

### Symptom 1: App Crashes When Score < 70%
**Root Cause:** Race condition between state update and navigation
**Solution:** Already implemented in refactored code
**Verify:**
```typescript
// Check that heartDeductionPending prevents re-entry:
if (showResult && !canContinue && !heartDeducted && !heartDeductionPending) {
  setHeartDeductionPending(true);  // ← Must be here
  // ... deduction logic
}
```

---

### Symptom 2: Out-of-Hearts Modal Doesn't Show
**Root Cause:** isOutOfHearts state not set, OR globalHearts timing issue
**Debug Steps:**
```typescript
// Add this log in the heart deduction effect:
console.log('HEART_DEDUCTION_DEBUG', {
  showResult,
  canContinue,
  globalHearts,
  heartsAfterDeduction: globalHearts - 1,
  shouldShowModal: (globalHearts - 1) <= 0,
  isOutOfHearts
});

// Expected output when hearts run out:
// shouldShowModal: true
// isOutOfHearts: true (set in next render)
```

**Fix:** Ensure the check is AFTER deduction completes:
```typescript
try {
  await deductHeartOnFailure();  // ← After this
  
  if (globalHearts - 1 <= 0) {  // ← NOW check
    setIsOutOfHearts(true);
  }
} finally {
  setHeartDeducted(true);
}
```

---

### Symptom 3: Navigation Back Gesture Not Prevented
**Root Cause:** navigationBlocked not added to beforeRemove dependency array
**Debug Steps:**
```typescript
console.log('BEFORE_REMOVE_DEBUG', {
  showResult,
  navigationBlocked,
  shouldPrevent: !showResult && !navigationBlocked
});
```

**Fix:** Check dependency array:
```typescript
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (!showResult && !navigationBlocked) {  // ← Both checks
      e.preventDefault();
      // ...
    }
  });
  return unsubscribe;
}, [navigation, showResult, navigationBlocked]);  // ← All included
```

---

### Symptom 4: ResultScreen Unmounts When Modal Shows
**Root Cause:** Old HeartEvaluationAndModal component was separate
**Solution:** Already implemented - OutOfHeartsInterceptor is a sibling, not replacement
**Verify:**
```typescript
if (showResult) {
  return (
    <>
      <ResultScreen {...props} />  {/* Always mounted */}
      <OutOfHeartsInterceptor      {/* Overlays on top */}
        isVisible={isOutOfHearts}
        {...props}
      />
    </>
  );
}
```

---

### Symptom 5: Retry Button Doesn't Work
**Root Cause:** State not fully reset, or showResult not properly set to false
**Debug Steps:**
```typescript
// In handleRetry:
console.log('RETRY_RESET', {
  currentIndexBefore: currentIndex,
  answersLengthBefore: answers.length,
  showResultBefore: showResult,
  isOutOfHeartsBefore: isOutOfHearts
});

// After reset completes, check:
console.log('RETRY_RESET_DONE', {
  currentIndexAfter: 0,
  answersLengthAfter: 0,
  showResultAfter: false,
  isOutOfHeartsAfter: false
});
```

**Fix:** Ensure all state variables reset:
```typescript
const handleRetry = useCallback(() => {
  setCurrentIndex(0);
  setAnswers([]);
  setShowResult(false);
  setResumeIndex(0);
  setResumeAnswers([]);
  setMatchRound(0);
  resetMatchStateForQuestion();
  setStepAnswers((prev) => {
    const next = [...prev];
    next[currentStep] = [];
    return next;
  });
  setIsOutOfHearts(false);  // ← Also reset OOF state
}, [currentStep, resetMatchStateForQuestion]);
```

---

### Symptom 6: Out-of-Hearts Modal Navigation Doesn't Work
**Root Cause:** navigationBlocked not set before navigate()
**Debug Steps:**
```typescript
// In onReturnToRoadmap:
console.log('OOF_NAV_START', { materialId, globalHearts });

// Check that navigationBlocked is set:
console.log('OOF_NAV_STATE', { navigationBlocked: true });

// Then navigate:
navigation.navigate('StudyJourney', { materialId });

console.log('OOF_NAV_END');
```

**Fix:**
```typescript
onReturnToRoadmap={() => {
  setNavigationBlocked(true);  // ← Must set FIRST
  try {
    console.warn('OOF_ROADMAP_NAVIGATION', { ... });
  } catch (e) {
    console.warn('OOF_ROADMAP_LOG_FAIL', e);
  }
  navigation.navigate('StudyJourney', { materialId });
}}
```

---

### Symptom 7: Heart Deduction Happens Multiple Times
**Root Cause:** heartDeductionPending flag missing or not checked
**Debug Steps:**
```typescript
// Log every time effect runs:
console.log('HEART_DEDUCTION_EFFECT_RUN', {
  showResult,
  canContinue,
  heartDeducted,
  heartDeductionPending,
  globalHearts
});
```

**Expected:** Should log exactly ONCE (or twice in dev strict mode)
**If logs repeat:** Check the condition:
```typescript
// WRONG:
if (showResult && !canContinue && !heartDeducted) {
  // Can run multiple times!
}

// RIGHT:
if (showResult && !canContinue && !heartDeducted && !heartDeductionPending) {
  setHeartDeductionPending(true);  // Blocks re-entry
  // ...
}
```

---

## Common Errors & Solutions

### Error: "Cannot read property 'navigate' of undefined"
**Cause:** navigation prop not passed to component
**Solution:**
```typescript
// Verify component signature:
export default function QuizScreen({ route, navigation }: QuizScreenProps) {
  // navigation should be available
}

// In OutOfHeartsInterceptor, pass navigation from parent:
// NOT directly passed, use callback props instead
onReturnToRoadmap={() => {
  // navigation.navigate called in parent QuizScreen
}}
```

---

### Error: "setState called on unmounted component"
**Cause:** Effect cleanup not working, or component unmounting mid-operation
**Solution:**
```typescript
// Always cleanup effects:
useEffect(() => {
  let isMounted = true;
  
  const deductAsync = async () => {
    if (isMounted) {
      await deductHeartOnFailure();
      if (isMounted) {
        setIsOutOfHearts(true);
      }
    }
  };
  
  // ... call deductAsync()
  
  return () => {
    isMounted = false;  // Cleanup
  };
}, [dependencies]);
```

---

### Error: "Modal visible prop must be true/false"
**Cause:** isOutOfHearts not a boolean
**Solution:**
```typescript
// Verify state initialization:
const [isOutOfHearts, setIsOutOfHearts] = React.useState(false);  // ← Default false

// Type check in OutOfHeartsInterceptor:
<Modal visible={isOutOfHearts} ...>
  {/* isOutOfHearts must be boolean */}
</Modal>
```

---

## Testing Scenarios

### Test Case 1: Low Score Path
```typescript
// Setup: Complete quiz with 3/10 correct = 30% score
// Expected:
// 1. showResult → true
// 2. canContinue → false (30% < 70%)
// 3. heartDeductionPending → true
// 4. await deductHeartOnFailure()
// 5. globalHearts: 5 → 4
// 6. isOutOfHearts → false (4 > 0)
// 7. heartDeducted → true
// 8. ResultScreen shows with "Làm lại" button
// 9. No OutOfHeartsInterceptor modal
```

### Test Case 2: Zero Hearts Path
```typescript
// Setup: Complete quiz with score < 70%, globalHearts = 1
// Expected:
// 1. showResult → true
// 2. canContinue → false
// 3. await deductHeartOnFailure()
// 4. globalHearts: 1 → 0
// 5. Check: 0 - 1 <= 0? YES
// 6. isOutOfHearts → true
// 7. ResultScreen + OutOfHeartsInterceptor visible
// 8. User clicks "Quay về hành trình"
// 9. navigationBlocked → true
// 10. navigation.navigate('StudyJourney', { materialId })
```

### Test Case 3: Pass Path
```typescript
// Setup: Complete quiz with 8/10 correct = 80% score
// Expected:
// 1. showResult → true
// 2. canContinue → true (80% >= 70%)
// 3. Session logging effect fires
// 4. Streak update effect fires
// 5. Heart deduction effect SKIPPED (canContinue=true)
// 6. ResultScreen shows with "Tiếp tục" button enabled
// 7. No OutOfHeartsInterceptor modal
```

---

## Performance Monitoring

### Metrics to Track
```typescript
// Time from result screen to modal show:
const startTime = performance.now();
setShowResult(true);
// ... wait for effect to run
const endTime = performance.now();
console.log('Result to Modal time:', endTime - startTime, 'ms');
// Expected: < 300ms

// Re-render count:
let renderCount = 0;
useEffect(() => {
  renderCount++;
  console.log('Render count:', renderCount);
}, []);  // Dependency array triggers on every render

// Memory usage:
console.log('Memory before quiz:', performance.memory.usedJSHeapSize);
// ... run quiz
console.log('Memory after quiz:', performance.memory.usedJSHeapSize);
```

---

## Chrome DevTools Debugging

### Enable React Profiler
1. Install React DevTools extension
2. Open DevTools → Profiler tab
3. Start recording
4. Fail a quiz (score < 70%)
5. Stop recording
6. Look for unexplained re-renders

### Debug State Changes
1. Open Debugger tab
2. Add breakpoint in heart deduction effect:
   ```typescript
   setHeartDeductionPending(true);  // ← Breakpoint here
   ```
3. Step through:
   - Does `deductHeartOnFailure()` complete?
   - Is `globalHearts` updated?
   - Does `isOutOfHearts` toggle?

### Trace Navigation
1. Open Console tab
2. Search logs for:
   ```
   USER_NAV_BEFORE_REMOVE_DISPATCH
   OOF_ROADMAP_NAVIGATION
   HEART_DEDUCTION_START
   ```
3. Verify order of operations

---

## Rollback Checklist

If you need to revert the refactor:
1. Restore original `QuizScreen.tsx` from git
2. Restore original `HeartEvaluationAndModal` component
3. Remove new state variables:
   - heartDeductionPending
   - isOutOfHearts
   - navigationBlocked
4. Run tests to confirm old behavior
5. **Note:** Old behavior has the crash issue

---

## Validation Checklist

After deployment, verify:
- [ ] No crash reports for quiz failure scenarios
- [ ] Out-of-hearts modal shows when expected
- [ ] Users can navigate back from quiz without crash
- [ ] Retry button works and resets quiz properly
- [ ] Heart deduction only happens once per quiz
- [ ] Navigation to StudyJourney works smoothly
- [ ] ResultScreen analytics visible to users
- [ ] No memory leaks in production

---

## Performance Budget

- Modal overlay: < 50ms show time
- Heart deduction: < 200ms async operation
- Navigation transition: < 300ms total
- State reset (retry): < 100ms
- **Total acceptable: < 1000ms from result to interactive**

---

## Support Resources

If you hit issues not covered above:
1. Check console.warn logs first
2. Search NAVIGATION_SAFETY_REFACTOR.md for similar cases
3. Review state flow diagram in QUIZ_STATE_MANAGEMENT.md
4. Enable React DevTools Profiler
5. Check browser DevTools Performance tab
