# Quiz Navigation State Management Reference

## State Flow Diagram

### Success Path (Score >= 70%)
```
START: showResult=false
  ↓
User completes all questions
  ↓
handleNextQuestion() triggered
  ↓
currentIndex >= totalCount? YES
  ↓
setShowResult(true)
  ↓
showResult=true, canContinue=true (score >= 70%)
  ↓
useEffect: Session logging fires
  ↓
useEffect: Streak update fires
  ↓
NO heart deduction (score passed)
  ↓
ResultScreen shows with "Tiếp tục" button enabled
  ↓
User clicks "Tiếp tục"
  ↓
handleContinue() called
  ↓
setCompleteNavigationAllowed(true)
  ↓
completeQuiz() → navigation.navigate('StudyJourney')
  ↓
END: Navigate to next node
```

### Failure Path (Score < 70%) - WITHOUT Out-of-Hearts
```
START: showResult=false
  ↓
User completes all questions but score < 70%
  ↓
setShowResult(true)
  ↓
showResult=true, canContinue=false (score < 70%)
  ↓
useEffect: Session logging SKIPPED (canContinue=false)
  ↓
useEffect: Streak update SKIPPED (score < 70%)
  ↓
useEffect: Heart deduction TRIGGERED
  ↓
setHeartDeductionPending(true)
  ↓
await deductHeartOnFailure()
  ↓
globalHearts: 5 → 4
  ↓
Check: 4 - 1 <= 0? NO
  ↓
setIsOutOfHearts(false) - Modal NOT shown
  ↓
setHeartDeducted(true)
  ↓
setHeartDeductionPending(false)
  ↓
ResultScreen shows with "Làm lại" button
  ↓
User sees: "Làm lại" (Retry) button
  ↓
User clicks "Làm lại"
  ↓
handleRetry() called:
  - setCurrentIndex(0)
  - setAnswers([])
  - setShowResult(false)
  - resetMatchStateForQuestion()
  ↓
Quiz restarts from question 1
  ↓
State loop starts again
```

### Failure Path (Score < 70%) - WITH Out-of-Hearts
```
START: showResult=false, globalHearts=1
  ↓
User completes all questions, score < 70%
  ↓
setShowResult(true)
  ↓
showResult=true, canContinue=false
  ↓
useEffect: Heart deduction TRIGGERED
  ↓
setHeartDeductionPending(true)
  ↓
await deductHeartOnFailure()
  ↓
globalHearts: 1 → 0
  ↓
Check: 0 - 1 <= 0? YES ← KEY DIFFERENCE
  ↓
setIsOutOfHearts(true) ← TRIGGERS MODAL
  ↓
setHeartDeducted(true)
  ↓
setHeartDeductionPending(false)
  ↓
ResultScreen mounted with OutOfHeartsInterceptor modal overlay
  ↓
Modal visible with three buttons:
  1. "Nạp 1 tim - 200 XP" (if XP >= 200 AND topUpCount < 3)
  2. "Quay về hành trình" (always enabled)
  3. "Ở lại xem kết quả" (always enabled)
  ↓
User clicks "Quay về hành trình"
  ↓
onReturnToRoadmap() callback fires:
  - setNavigationBlocked(true)
  - navigation.navigate('StudyJourney', { materialId })
  ↓
beforeRemove listener allows navigation (navigationBlocked=true)
  ↓
END: Navigate to StudyJourney
```

### Back Gesture Prevention
```
User on QuizScreen (showResult=false)
  ↓
User swipes back / clicks back button
  ↓
beforeRemove listener fires
  ↓
Check: !showResult && !navigationBlocked? YES
  ↓
e.preventDefault()
  ↓
Alert dialog: "Thoát bài test? Bài test có thể không được lưu"
  ↓
User clicks "Hủy" → dismiss alert, stay on quiz
  ↓
User clicks "Thoát" → navigation.dispatch(e.data.action)
  ↓
END: Allow navigation
```

---

## State Variables Reference

### Primary Control States
```typescript
// Whether result screen is currently showing
showResult: boolean

// Whether user's score meets passing threshold (>= 70%)
canContinue: boolean  // derived from score >= 70%

// Whether result screen is allowed to navigate away
navigationBlocked: boolean  // set to true only on explicit user action
```

### Heart Deduction States
```typescript
// Track if heart deduction effect is running
heartDeductionPending: boolean

// Whether heart deduction effect has completed
heartDeducted: boolean

// Whether to show out-of-hearts modal
isOutOfHearts: boolean

// Global user hearts (from AuthContext)
globalHearts: number
```

### Session States
```typescript
// Whether quiz session has been logged to database
sessionLogged: boolean

// Whether daily streak check has been triggered
streakUpdated: boolean
```

---

## useEffect Dependencies

### Effect 1: beforeRemove Listener
```typescript
useEffect(() => {
  // Prevent navigation during quiz
  // Allow navigation when explicitly triggered by user
}, [navigation, showResult, navigationBlocked])
```

**Triggers When:**
- Navigation object changes
- showResult changes (quiz complete vs in-progress)
- navigationBlocked changes (user clicked action button)

**Does:**
- Prevents accidental back gesture
- Allows intentional navigation after user action

---

### Effect 2: Session Logging
```typescript
useEffect(() => {
  // Log quiz attempt to database
  if (showResult && canContinue && !sessionLogged && user?.id) {
    // This is a successful quiz completion
    // Log it to quiz_sessions table
  }
}, [showResult, canContinue, sessionLogged, user?.id, ...])
```

**Triggers When:**
- Result screen appears (showResult=true)
- User passed the quiz (canContinue=true)
- Session hasn't been logged yet (sessionLogged=false)
- User is logged in (user?.id exists)

**Does NOT Trigger When:**
- Score < 70% (canContinue=false)
- Already logged (sessionLogged=true)

**Critical:** Triggers ONLY ONCE because of sessionLogged flag

---

### Effect 3: Streak Update
```typescript
useEffect(() => {
  // Update daily streak for passing quizzes
  if (showResult && canContinue && !streakUpdated && user?.id) {
    checkAndTriggerDailyStreak(user.id)
  }
}, [showResult, canContinue, streakUpdated, user?.id, ...])
```

**Triggers When:**
- Result screen appears AND
- User passed (canContinue=true) AND
- Streak hasn't been updated yet (streakUpdated=false) AND
- User is logged in

**Critical:** Only for PASSING quizzes (score >= 70%)

---

### Effect 4: Heart Deduction (NEW - CRITICAL FIX)
```typescript
useEffect(() => {
  // Deduct heart for failing quizzes
  if (showResult && !canContinue && !heartDeducted && !heartDeductionPending) {
    setHeartDeductionPending(true);  // Lock re-entry
    
    (async () => {
      try {
        await deductHeartOnFailure();
        
        // KEY: Check hearts AFTER deduction
        if (globalHearts - 1 <= 0) {
          setIsOutOfHearts(true);  // Show modal
        }
      } finally {
        setHeartDeducted(true);
        setHeartDeductionPending(false);
      }
    })();
  }
}, [
  showResult,
  canContinue,
  heartDeducted,
  heartDeductionPending,  // ← Critical to prevent duplicate calls
  deductHeartOnFailure,
  globalHearts
])
```

**Triggers When:**
- Result screen shows (showResult=true)
- User failed (canContinue=false)
- Heart deduction not yet done (heartDeducted=false)
- Heart deduction not currently running (!heartDeductionPending)

**Critical Improvements:**
- `heartDeductionPending` prevents simultaneous execution
- Deduction happens ASYNCHRONOUSLY
- No automatic navigation
- Modal triggered only via local state, not via navigation

---

## Component Prop Flow

### ResultScreen Props
```typescript
interface ResultScreenProps {
  score: number                    // Percentage score 0-100
  displayScore: number             // Rounded/formatted score
  correctCount: number             // Correct answers
  totalCount: number               // Total questions
  answers: AnswerRecord[]          // Quiz attempt record
  isBoss: boolean                  // Is this a final boss?
  onRetry: () => void              // User clicked "Làm lại"
  onContinue: () => void           // User clicked "Tiếp tục"
  canContinue: boolean             // Show "Tiếp tục" button?
}
```

**onRetry Flow:**
1. Called when user clicks "Làm lại"
2. Resets: currentIndex, answers, showResult, match state
3. Quiz restarts from question 1
4. Previously deducted heart remains gone

**onContinue Flow:**
1. Called when user clicks "Tiếp tục"
2. Only available if canContinue=true (score >= 70%)
3. Triggers completeQuiz()
4. Navigates to StudyJourney with completedNodeIndex

---

### OutOfHeartsInterceptor Props
```typescript
interface OutOfHeartsInterceptorProps {
  isVisible: boolean                          // Show modal?
  globalHearts: number                        // Current hearts
  totalXp: number                             // User's XP balance
  topUpCount: number                          // Daily refills done
  onRefill: () => Promise<void>               // User clicked "Nạp tim"
  onReturnToRoadmap: () => void               // User clicked "Quay về"
  onStayOnResult: () => void                  // User clicked "Ở lại"
}
```

**onRefill Flow:**
1. Called when user clicks "Nạp 1 tim - 200 XP"
2. Calls refillHeartsWithXp(1, 200) in AuthContext
3. Button shows "Đang nạp..." during operation
4. On completion: sets isOutOfHearts=false
5. User can now retry the quiz

**onReturnToRoadmap Flow:**
1. Called when user clicks "Quay về hành trình"
2. Sets navigationBlocked=true to bypass beforeRemove alert
3. Logs navigation event for debugging
4. Navigates to StudyJourney with materialId

**onStayOnResult Flow:**
1. Called when user clicks "Ở lại xem kết quả"
2. Closes modal: setIsOutOfHearts=false
3. Result screen remains visible
4. User can review quiz analytics

---

## Type Definitions

### Enhanced Component Types
```typescript
// State tracking for navigation safety
type NavigationStateTracker = {
  showResult: boolean
  canContinue: boolean
  navigationBlocked: boolean
  heartDeductionPending: boolean
  heartDeducted: boolean
  isOutOfHearts: boolean
}

// Quiz result data
type QuizResultData = {
  score: number
  displayScore: number
  correctCount: number
  totalCount: number
  answers: AnswerRecord[]
  isBoss: boolean
}

// Navigation callback signatures
type NavigationCallback = () => void | Promise<void>
type OnRetry = () => void
type OnContinue = () => void
type OnReturnToRoadmap = () => void
type OnStayOnResult = () => void
```

---

## Common State Transitions

### Valid Transitions
```
showResult: false → true            ✓ Normal flow
canContinue: ??? → true             ✓ High score
canContinue: ??? → false            ✓ Low score
heartDeducted: false → true         ✓ Heart deduction done
isOutOfHearts: false → true         ✓ Hearts depleted
navigationBlocked: false → true     ✓ User action triggered
```

### Invalid Transitions (Should Never Happen)
```
heartDeductionPending: true → true  ✗ Re-entry prevented by guard
showResult: true → false (without reset)  ✗ Only via handleRetry
canContinue: true → false           ✗ Immutable once set
navigationBlocked: true → false     ✗ One-way gate
```

---

## Debug Logging Points

### Location: Effect 1 (beforeRemove)
```typescript
console.warn('USER_NAV_BEFORE_REMOVE_DISPATCH', { 
  showResult, 
  canContinue, 
  navigationBlocked,
  globalHearts,
  routeParams: route.params 
});
```
**Use when:** Navigation prevented or allowed unexpectedly

### Location: Effect 4 (Heart Deduction)
```typescript
// At start:
console.warn('HEART_DEDUCTION_START', {
  showResult,
  canContinue,
  globalHearts,
  heartDeductionPending
});

// At check:
console.warn('HEART_CHECK', {
  heartsAfter: globalHearts - 1,
  isOutOfHearts: globalHearts - 1 <= 0
});
```
**Use when:** Hearts not deducting or modal not showing

### Location: OutOfHeartsInterceptor (onReturnToRoadmap)
```typescript
console.warn('OOF_ROADMAP_NAVIGATION', { 
  reason: 'user_clicked_return', 
  materialId,
  globalHearts 
});
```
**Use when:** Navigation back to roadmap failing

---

## Performance Notes

### State Updates Per Quiz Completion
- **Passing Quiz:** 3-4 updates (logging, streak, modal display)
- **Failing Quiz (< 70%):** 5-6 updates (deduction, modal, state resets)
- **Retry:** 2-3 updates (reset to question 0)

### No Memory Leaks
- All useEffect hooks have proper cleanup functions
- Timer intervals cleared when showResult changes
- Modal callbacks use explicit handlers, not closures

### Optimization Opportunities
If performance degrades:
1. Use `useCallback` for button handlers
2. Memoize derived scores (useMemo)
3. Debounce heart deduction check
