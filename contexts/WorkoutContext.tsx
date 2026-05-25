import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Alert, DeviceEventEmitter } from 'react-native'
import * as ExpoHaptics from 'expo-haptics'
import { Platform } from 'react-native'

const Haptics = {
  impactAsync: (style: any) => {
    if (Platform.OS === 'web') return Promise.resolve()
    try {
      return ExpoHaptics.impactAsync(style)
    } catch (e) {
      return Promise.resolve()
    }
  },
  notificationAsync: (type: any) => {
    if (Platform.OS === 'web') return Promise.resolve()
    try {
      return ExpoHaptics.notificationAsync(type)
    } catch (e) {
      return Promise.resolve()
    }
  },
  get ImpactFeedbackStyle() { return ExpoHaptics.ImpactFeedbackStyle },
  get NotificationFeedbackType() { return ExpoHaptics.NotificationFeedbackType }
}
import { workoutDb, type ActiveWorkoutState, type WorkoutLog, type LoggedSet, type Routine } from '@/lib/workoutDb'
import { useToast } from '@/contexts/ToastContext'

interface WorkoutContextType {
  activeWorkout: ActiveWorkoutState | null
  startWorkout: (routine?: Routine, initialExercises?: Array<{ id: string; name: string; muscleGroup: string }>) => void
  cancelActiveWorkout: () => void
  finishActiveWorkout: () => Promise<WorkoutLog | null>
  addExercise: (exercise: { id: string; name: string; muscleGroup: string }) => void
  removeExercise: (exerciseId: string) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, fields: Partial<{ weight: string; reps: string }>) => void
  toggleSetComplete: (exerciseId: string, setIndex: number) => void
  startRestTimer: (seconds: number) => void
  skipRestTimer: () => void
  completedWorkout: WorkoutLog | null
  clearCompletedWorkout: () => void
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null)
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutLog | null>(null)
  const { showToast } = useToast()

  const workoutTimerRef = useRef<any>(null)
  const restTimerRef = useRef<any>(null)

  // 1. Hydrate active workout on launch
  useEffect(() => {
    workoutDb.getActiveWorkout().then((saved) => {
      if (saved) {
        // Resume elapsed time timer
        setActiveWorkout(saved)
      }
    })
    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current)
      if (restTimerRef.current) clearInterval(restTimerRef.current)
    }
  }, [])

  // 2. Active Workout timer tick (every second)
  useEffect(() => {
    if (activeWorkout) {
      workoutTimerRef.current = setInterval(() => {
        setActiveWorkout((curr) => {
          if (!curr) return null
          const nextState = {
            ...curr,
            elapsedSeconds: curr.elapsedSeconds + 1,
            restTimerSeconds: curr.restTimerActive && curr.restTimerSeconds > 0 
              ? curr.restTimerSeconds - 1 
              : curr.restTimerSeconds
          }

          // Handle rest timer end
          if (curr.restTimerActive && curr.restTimerSeconds === 1) {
            nextState.restTimerActive = false
            nextState.restTimerSeconds = 0
            triggerRestTimerEndNotification()
          }

          // Persist state periodically
          workoutDb.saveActiveWorkout(nextState)
          return nextState
        })
      }, 1000)
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current)
    }

    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current)
    }
  }, [!!activeWorkout])

  const triggerRestTimerEndNotification = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast('⏱️ Rest Over! Time to smash the next set!', 'info')
  }

  // 3. Methods
  const startWorkout = (
    routine?: Routine,
    initialExercises?: Array<{ id: string; name: string; muscleGroup: string }>
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const state: ActiveWorkoutState = {
      name: routine ? routine.name : '🏋️‍♂️ Custom Session',
      startedAt: new Date().toISOString(),
      routineId: routine?.id,
      exercises: routine 
        ? routine.exercises.map((re) => ({
            id: re.id,
            name: re.name,
            muscleGroup: re.muscleGroup,
            sets: re.sets.map((s) => ({
              weight: s.weight.toString(),
              reps: s.reps.toString(),
              isCompleted: false
            }))
          }))
        : (initialExercises 
            ? initialExercises.map((e) => ({
                id: e.id,
                name: e.name,
                muscleGroup: e.muscleGroup,
                sets: [{ weight: '0', reps: '0', isCompleted: false }]
              }))
            : []),
      elapsedSeconds: 0,
      restTimerSeconds: 0,
      restTimerDuration: 90, // default 90s rest
      restTimerActive: false
    }

    setActiveWorkout(state)
    workoutDb.saveActiveWorkout(state)
  }

  const cancelActiveWorkout = () => {
    Alert.alert(
      'Discard Workout?',
      'Are you sure you want to discard this workout? All progress will be lost.',
      [
        { text: 'Keep Lifting', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            setActiveWorkout(null)
            workoutDb.clearActiveWorkout()
            showToast('Workout Discarded. Session cleared.', 'info')
          }
        }
      ]
    )
  }

  const finishActiveWorkout = async (): Promise<WorkoutLog | null> => {
    if (!activeWorkout) return null

    // Ensure they have logged at least one completed set
    const hasCompletedSets = activeWorkout.exercises.some((e) =>
      e.sets.some((s) => s.isCompleted)
    )

    if (!hasCompletedSets) {
      Alert.alert('Empty Workout', 'Log at least one completed set to save your workout.')
      return null
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Construct final logged format
    let totalVolume = 0
    const exercisesLogged = activeWorkout.exercises
      .map((ex) => {
        const completedSets: LoggedSet[] = ex.sets
          .filter((s) => s.isCompleted)
          .map((s) => {
            const reps = parseInt(s.reps) || 0
            const weight = parseFloat(s.weight) || 0
            totalVolume += reps * weight
            return {
              reps,
              weight,
              isCompleted: true,
              isPR: false // Will be determined by processPRs
            }
          })

        return {
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: completedSets
        }
      })
      .filter((ex) => ex.sets.length > 0)

    const finalLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      name: activeWorkout.name,
      startedAt: activeWorkout.startedAt,
      completedAt: new Date().toISOString(),
      durationSeconds: activeWorkout.elapsedSeconds,
      totalVolume,
      prsBroken: 0, // calculated by saveWorkoutLog
      exercises: exercisesLogged
    }

    // Save to local storage (which also does PR checking and leaderboard updates)
    await workoutDb.saveWorkoutLog(finalLog)

    // Trigger global celebration confetti
    DeviceEventEmitter.emit('trigger-confetti')

    setCompletedWorkout(finalLog)
    setActiveWorkout(null)
    await workoutDb.clearActiveWorkout()

    showToast(`🏆 Workout Saved! Lifted ${totalVolume}kg.`, 'success')

    return finalLog
  }

  const addExercise = (exercise: { id: string; name: string; muscleGroup: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveWorkout((curr) => {
      if (!curr) return null
      
      // Prevent duplicate exercise in same active workout session
      const exists = curr.exercises.find((e) => e.id === exercise.id)
      if (exists) {
        showToast(`Already added: ${exercise.name} is already in your session.`, 'info')
        return curr
      }

      const next = {
        ...curr,
        exercises: [
          ...curr.exercises,
          {
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: [{ weight: '0', reps: '0', isCompleted: false }]
          }
        ]
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const removeExercise = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        exercises: curr.exercises.filter((e) => e.id !== exerciseId)
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const addSet = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        exercises: curr.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const lastSet = ex.sets[ex.sets.length - 1]
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                weight: lastSet ? lastSet.weight : '0',
                reps: lastSet ? lastSet.reps : '0',
                isCompleted: false
              }
            ]
          }
        })
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const removeSet = (exerciseId: string, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        exercises: curr.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          return {
            ...ex,
            sets: ex.sets.filter((_, idx) => idx !== setIndex)
          }
        })
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    fields: Partial<{ weight: string; reps: string }>
  ) => {
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        exercises: curr.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          return {
            ...ex,
            sets: ex.sets.map((set, idx) => {
              if (idx !== setIndex) return set
              return { ...set, ...fields }
            })
          }
        })
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setActiveWorkout((curr) => {
      if (!curr) return null
      
      let startTimer = false
      const next = {
        ...curr,
        exercises: curr.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          return {
            ...ex,
            sets: ex.sets.map((set, idx) => {
              if (idx !== setIndex) return set
              const isComp = !set.isCompleted
              if (isComp) startTimer = true
              return { ...set, isCompleted: isComp }
            })
          }
        })
      }

      // Rest timer trigger
      if (startTimer) {
        next.restTimerActive = true
        next.restTimerSeconds = curr.restTimerDuration
      }

      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const startRestTimer = (seconds: number) => {
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        restTimerDuration: seconds,
        restTimerSeconds: seconds,
        restTimerActive: true
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const skipRestTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setActiveWorkout((curr) => {
      if (!curr) return null
      const next = {
        ...curr,
        restTimerActive: false,
        restTimerSeconds: 0
      }
      workoutDb.saveActiveWorkout(next)
      return next
    })
  }

  const clearCompletedWorkout = () => {
    setCompletedWorkout(null)
  }

  return (
    <WorkoutContext.Provider
      value={{
        activeWorkout,
        startWorkout,
        cancelActiveWorkout,
        finishActiveWorkout,
        addExercise,
        removeExercise,
        addSet,
        removeSet,
        updateSet,
        toggleSetComplete,
        startRestTimer,
        skipRestTimer,
        completedWorkout,
        clearCompletedWorkout
      }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  const context = useContext(WorkoutContext)
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}
