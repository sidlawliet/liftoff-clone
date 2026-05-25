import AsyncStorage from '@react-native-async-storage/async-storage'
import { PRESEEDED_EXERCISES, type Exercise } from './exerciseData'
import { supabase, isSupabaseEnabled } from './supabase'

// ─── KEYS FOR STORAGE ──────────────────────────────────────────────────────────
const KEY_ROUTINES = 'liftoff_routines'
const KEY_LOGS = 'liftoff_workout_logs'
const KEY_PRS = 'liftoff_personal_records'
const KEY_CUSTOM_EXERCISES = 'liftoff_custom_exercises'
const KEY_ACTIVE_WORKOUT = 'liftoff_active_workout'
const KEY_LEADERBOARD = 'liftoff_leaderboard'

// ─── TYPE DEFINITIONS ──────────────────────────────────────────────────────────
export interface RoutineExercise {
  id: string // exercise id (preseeded or custom)
  name: string
  muscleGroup: string
  sets: Array<{ reps: number; weight: number }>
}

export interface Routine {
  id: string
  name: string
  description: string
  exercises: RoutineExercise[]
  createdAt: string
}

export interface LoggedSet {
  reps: number
  weight: number
  isCompleted: boolean
  isPR: boolean
  isWarmup?: boolean
}

export interface LoggedExercise {
  id: string
  name: string
  muscleGroup: string
  sets: LoggedSet[]
}

export interface WorkoutLog {
  id: string
  name: string
  startedAt: string
  completedAt: string
  durationSeconds: number
  totalVolume: number
  prsBroken: number
  exercises: LoggedExercise[]
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  weight: number
  reps: number
  estimatedOneRepMax: number
  achievedAt: string
  workoutLogId: string
}

export interface ActiveWorkoutState {
  name: string
  startedAt: string
  routineId?: string
  exercises: Array<{
    id: string
    name: string
    muscleGroup: string
    sets: Array<{
      reps: string
      weight: string
      isCompleted: boolean
      isPR?: boolean
    }>
  }>
  elapsedSeconds: number
  restTimerSeconds: number
  restTimerDuration: number
  restTimerActive: boolean
}

export interface LeaderboardUser {
  id: string
  name: string
  weeklyVolume: number
  workoutsCompleted: number
  streakWeeks: number
  rankTier: 'Gold' | 'Silver' | 'Bronze' | 'Iron' | 'Challenger'
  statusMessage: string
  avatarEmoji: string
  isSimulated: boolean
}

// Epley Formula for 1RM
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps === 0) return 0
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

// ─── INITIAL DEMO DATA SEEDING ────────────────────────────────────────────────
const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'push-day',
    name: '🔥 Push Day Power',
    description: 'Focus on chest, shoulders, and triceps strength.',
    exercises: [
      { id: 'bench-press', name: 'Barbell Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 6, weight: 70 }] },
      { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', sets: [{ reps: 10, weight: 16 }, { reps: 10, weight: 16 }] },
      { id: 'tricep-pushdown', name: 'Cable Tricep Pushdown', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }] }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'pull-day',
    name: '⚡ Pull Day Pump',
    description: 'Upper back thickness and bicep volume.',
    exercises: [
      { id: 'deadlift', name: 'Barbell Deadlift', muscleGroup: 'Back', sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }, { reps: 5, weight: 120 }] },
      { id: 'pullups', name: 'Pull-ups', muscleGroup: 'Back', sets: [{ reps: 8, weight: 0 }, { reps: 8, weight: 0 }, { reps: 6, weight: 0 }] },
      { id: 'bicep-curl', name: 'Dumbbell Bicep Curl', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 12 }, { reps: 12, weight: 12 }] }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'leg-day',
    name: '🍗 Heavy Squat Legs',
    description: 'Quads and hamstrings heavy session.',
    exercises: [
      { id: 'back-squat', name: 'Barbell Back Squat', muscleGroup: 'Legs', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 90 }] },
      { id: 'romanian-deadlift', name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Legs', sets: [{ reps: 10, weight: 24 }, { reps: 10, weight: 24 }] },
      { id: 'leg-extension', name: 'Leg Extensions', muscleGroup: 'Legs', sets: [{ reps: 12, weight: 40 }, { reps: 12, weight: 40 }] }
    ],
    createdAt: new Date().toISOString()
  }
]

const MOCK_RIVALS: LeaderboardUser[] = [
  { id: 'rival-1', name: 'Viktor', weeklyVolume: 28400, workoutsCompleted: 4, streakWeeks: 12, rankTier: 'Challenger', statusMessage: 'Squats are life. Let\'s get it.', avatarEmoji: '🏋️‍♂️', isSimulated: true },
  { id: 'rival-2', name: 'Elena', weeklyVolume: 24200, workoutsCompleted: 3, streakWeeks: 9, rankTier: 'Challenger', statusMessage: 'Consistency beats talent.', avatarEmoji: '🏃‍♀️', isSimulated: true },
  { id: 'rival-3', name: 'Marcus', weeklyVolume: 19800, workoutsCompleted: 3, streakWeeks: 6, rankTier: 'Gold', statusMessage: 'PR or bust today.', avatarEmoji: '🔥', isSimulated: true },
  { id: 'rival-4', name: 'Sienna', weeklyVolume: 18500, workoutsCompleted: 4, streakWeeks: 14, rankTier: 'Gold', statusMessage: 'Early morning crew!', avatarEmoji: '🌅', isSimulated: true },
  { id: 'rival-5', name: 'Jaxson', weeklyVolume: 16400, workoutsCompleted: 2, streakWeeks: 5, rankTier: 'Gold', statusMessage: 'Recovering from leg day.', avatarEmoji: '🥴', isSimulated: true },
  { id: 'rival-6', name: 'Dax', weeklyVolume: 14500, workoutsCompleted: 3, streakWeeks: 8, rankTier: 'Silver', statusMessage: 'Aiming for Gold this week.', avatarEmoji: '👊', isSimulated: true },
  { id: 'rival-7', name: 'Clara', weeklyVolume: 13900, workoutsCompleted: 2, streakWeeks: 4, rankTier: 'Silver', statusMessage: 'Flex Friday!', avatarEmoji: '💪', isSimulated: true },
  { id: 'rival-8', name: 'Darnell', weeklyVolume: 12400, workoutsCompleted: 3, streakWeeks: 3, rankTier: 'Silver', statusMessage: 'Biceps looking swole.', avatarEmoji: '😎', isSimulated: true },
  { id: 'rival-9', name: 'Lila', weeklyVolume: 11100, workoutsCompleted: 2, streakWeeks: 7, rankTier: 'Silver', statusMessage: 'Mind over matter.', avatarEmoji: '🧘‍♀️', isSimulated: true },
  { id: 'rival-10', name: 'Roman', weeklyVolume: 9800, workoutsCompleted: 2, streakWeeks: 2, rankTier: 'Bronze', statusMessage: 'Deadlifts call my name.', avatarEmoji: '💀', isSimulated: true },
  { id: 'rival-11', name: 'Chloe', weeklyVolume: 8400, workoutsCompleted: 3, streakWeeks: 5, rankTier: 'Bronze', statusMessage: 'Active recovery day.', avatarEmoji: '🥑', isSimulated: true },
  { id: 'rival-12', name: 'Devon', weeklyVolume: 7900, workoutsCompleted: 1, streakWeeks: 1, rankTier: 'Bronze', statusMessage: 'Late night sessions hits diff.', avatarEmoji: '🌙', isSimulated: true },
  { id: 'rival-13', name: 'Ivy', weeklyVolume: 6500, workoutsCompleted: 2, streakWeeks: 4, rankTier: 'Iron', statusMessage: 'Step by step.', avatarEmoji: '🌱', isSimulated: true },
  { id: 'rival-14', name: 'Nate', weeklyVolume: 5100, workoutsCompleted: 1, streakWeeks: 1, rankTier: 'Iron', statusMessage: 'Just started logging!', avatarEmoji: '🆕', isSimulated: true }
]

const DEMO_LOGS: WorkoutLog[] = [
  {
    id: 'demo-log-1',
    name: 'Evening Chest & Arms',
    startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    durationSeconds: 3600,
    totalVolume: 4200,
    prsBroken: 2,
    exercises: [
      {
        id: 'bench-press',
        name: 'Barbell Bench Press',
        muscleGroup: 'Chest',
        sets: [
          { reps: 8, weight: 60, isCompleted: true, isPR: false },
          { reps: 8, weight: 65, isCompleted: true, isPR: true },
          { reps: 6, weight: 70, isCompleted: true, isPR: true }
        ]
      },
      {
        id: 'bicep-curl',
        name: 'Dumbbell Bicep Curl',
        muscleGroup: 'Arms',
        sets: [
          { reps: 12, weight: 12, isCompleted: true, isPR: false },
          { reps: 10, weight: 14, isCompleted: true, isPR: false }
        ]
      }
    ]
  },
  {
    id: 'demo-log-2',
    name: 'Leg Day Blast',
    startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 45 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    durationSeconds: 2700,
    totalVolume: 5800,
    prsBroken: 1,
    exercises: [
      {
        id: 'back-squat',
        name: 'Barbell Back Squat',
        muscleGroup: 'Legs',
        sets: [
          { reps: 8, weight: 80, isCompleted: true, isPR: false },
          { reps: 8, weight: 85, isCompleted: true, isPR: true }
        ]
      }
    ]
  }
]

const DEMO_PRS: PersonalRecord[] = [
  { exerciseId: 'bench-press', exerciseName: 'Barbell Bench Press', weight: 70, reps: 6, estimatedOneRepMax: 84, achievedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), workoutLogId: 'demo-log-1' },
  { exerciseId: 'back-squat', exerciseName: 'Barbell Back Squat', weight: 85, reps: 8, estimatedOneRepMax: 107.7, achievedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), workoutLogId: 'demo-log-2' }
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await AsyncStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

async function saveJson<T>(key: string, val: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.error(`AsyncStorage write failed for key ${key}:`, e)
  }
}

// ─── EXPORTED API ─────────────────────────────────────────────────────────────
export const workoutDb = {
  // ── Exercises ──
  async getExercises(): Promise<Exercise[]> {
    const custom = await getJson<Exercise[]>(KEY_CUSTOM_EXERCISES, [])
    return [...PRESEEDED_EXERCISES, ...custom]
  },

  async addCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>): Promise<Exercise> {
    const custom = await getJson<Exercise[]>(KEY_CUSTOM_EXERCISES, [])
    const newEx: Exercise = {
      ...exercise,
      id: `custom-${Date.now()}`,
      isCustom: true
    }
    custom.push(newEx)
    await saveJson(KEY_CUSTOM_EXERCISES, custom)

    // Supabase Sync
    if (isSupabaseEnabled) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('custom_exercises').insert({
            user_id: user.id,
            name: newEx.name,
            muscle_group: newEx.muscleGroup,
            equipment: newEx.equipment,
            instructions: newEx.instructions
          })
        }
      } catch (e) {
        console.warn('[Sync] Custom exercise sync failed:', e)
      }
    }

    return newEx
  },

  // ── Routines ──
  async getRoutines(): Promise<Routine[]> {
    return getJson<Routine[]>(KEY_ROUTINES, DEFAULT_ROUTINES)
  },

  async saveRoutine(routine: Routine): Promise<void> {
    const routines = await this.getRoutines()
    const idx = routines.findIndex(r => r.id === routine.id)
    if (idx >= 0) {
      routines[idx] = routine
    } else {
      routines.push(routine)
    }
    await saveJson(KEY_ROUTINES, routines)

    // Supabase Sync
    if (isSupabaseEnabled) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error } = await supabase.from('routines').upsert({
            id: routine.id,
            user_id: user.id,
            name: routine.name,
            description: routine.description,
            exercises: routine.exercises
          })
          if (error) throw error
        }
      } catch (e) {
        console.warn('[Sync] Routine sync failed:', e)
      }
    }
  },

  async deleteRoutine(id: string): Promise<void> {
    const routines = await this.getRoutines()
    const filtered = routines.filter(r => r.id !== id)
    await saveJson(KEY_ROUTINES, filtered)

    // Supabase Sync
    if (isSupabaseEnabled) {
      try {
        await supabase.from('routines').delete().eq('id', id)
      } catch (e) {
        console.warn('[Sync] Routine delete failed:', e)
      }
    }
  },

  // ── Workout Logs ──
  async getWorkoutLogs(): Promise<WorkoutLog[]> {
    return getJson<WorkoutLog[]>(KEY_LOGS, DEMO_LOGS)
  },

  async saveWorkoutLog(log: WorkoutLog): Promise<void> {
    const logs = await this.getWorkoutLogs()
    logs.unshift(log) // latest first
    await saveJson(KEY_LOGS, logs)

    // Check and save PRs
    await this.processPRs(log)

    // Update Leaderboard user score
    await this.addVolumeToLeaderboard(log.totalVolume)

    // Supabase Sync
    if (isSupabaseEnabled) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error: logErr } = await supabase.from('workout_logs').insert({
            id: log.id,
            user_id: user.id,
            name: log.name,
            started_at: log.startedAt,
            completed_at: log.completedAt,
            duration_seconds: log.durationSeconds,
            total_volume: log.totalVolume,
            prs_broken: log.prsBroken
          })
          if (logErr) throw logErr

          // Insert sets
          const setsToInsert = log.exercises.flatMap((ex) =>
            ex.sets.map((set, setIdx) => ({
              workout_log_id: log.id,
              exercise_id: ex.id,
              set_number: setIdx + 1,
              reps: set.reps,
              weight: set.weight,
              is_completed: set.isCompleted,
              is_pr: set.isPR
            }))
          )

          if (setsToInsert.length > 0) {
            await supabase.from('workout_sets').insert(setsToInsert)
          }
        }
      } catch (e) {
        console.warn('[Sync] Workout log sync failed:', e)
      }
    }
  },

  // ── Personal Records ──
  async getPRs(): Promise<PersonalRecord[]> {
    return getJson<PersonalRecord[]>(KEY_PRS, DEMO_PRS)
  },

  async processPRs(log: WorkoutLog): Promise<number> {
    const prs = await this.getPRs()
    let prsBroken = 0

    // Evaluate each completed set
    for (const ex of log.exercises) {
      const bestCompletedSet = ex.sets
        .filter(s => s.isCompleted && s.weight > 0 && s.reps > 0)
        .reduce<LoggedSet | null>((best, curr) => {
          if (!best) return curr
          const best1RM = calculateOneRepMax(best.weight, best.reps)
          const curr1RM = calculateOneRepMax(curr.weight, curr.reps)
          return curr1RM > best1RM ? curr : best
        }, null)

      if (bestCompletedSet) {
        const est1RM = calculateOneRepMax(bestCompletedSet.weight, bestCompletedSet.reps)
        
        // Find existing record
        const oldPrIdx = prs.findIndex(p => p.exerciseId === ex.id)
        if (oldPrIdx >= 0) {
          const oldPr = prs[oldPrIdx]
          if (est1RM > oldPr.estimatedOneRepMax) {
            bestCompletedSet.isPR = true
            prs[oldPrIdx] = {
              exerciseId: ex.id,
              exerciseName: ex.name,
              weight: bestCompletedSet.weight,
              reps: bestCompletedSet.reps,
              estimatedOneRepMax: est1RM,
              achievedAt: log.completedAt,
              workoutLogId: log.id
            }
            prsBroken++
          }
        } else {
          // New PR!
          bestCompletedSet.isPR = true
          prs.push({
            exerciseId: ex.id,
            exerciseName: ex.name,
            weight: bestCompletedSet.weight,
            reps: bestCompletedSet.reps,
            estimatedOneRepMax: est1RM,
            achievedAt: log.completedAt,
            workoutLogId: log.id
          })
          prsBroken++
        }
      }
    }

    if (prsBroken > 0) {
      await saveJson(KEY_PRS, prs)
      log.prsBroken = prsBroken
    }

    return prsBroken
  },

  // ── Active Workout ──
  async getActiveWorkout(): Promise<ActiveWorkoutState | null> {
    return getJson<ActiveWorkoutState | null>(KEY_ACTIVE_WORKOUT, null)
  },

  async saveActiveWorkout(state: ActiveWorkoutState): Promise<void> {
    await saveJson(KEY_ACTIVE_WORKOUT, state)
  },

  async clearActiveWorkout(): Promise<void> {
    await AsyncStorage.removeItem(KEY_ACTIVE_WORKOUT)
  },

  // ── Leaderboard & Rival Simulation ──
  async getLeaderboard(): Promise<LeaderboardUser[]> {
    const list = await getJson<LeaderboardUser[]>(KEY_LEADERBOARD, [])
    if (list.length === 0) {
      // Seed default leaderboard
      const initial: LeaderboardUser[] = [
        { id: 'user-id', name: 'Avery Quinn (You)', weeklyVolume: 10000, workoutsCompleted: 2, streakWeeks: 4, rankTier: 'Silver', statusMessage: 'Chasing the top spot!', avatarEmoji: '🦸‍♂️', isSimulated: false } as LeaderboardUser,
        ...MOCK_RIVALS
      ].sort((a, b) => b.weeklyVolume - a.weeklyVolume)
      await saveJson(KEY_LEADERBOARD, initial)
      return initial
    }
    return list
  },

  async addVolumeToLeaderboard(volume: number): Promise<void> {
    const board = await this.getLeaderboard()
    
    // 1. Update user volume
    const uIdx = board.findIndex(u => !u.isSimulated)
    if (uIdx >= 0) {
      board[uIdx].weeklyVolume += volume
      board[uIdx].workoutsCompleted += 1
    }

    // 2. Simulate rival workout progress
    // Give each simulated rival a random chance to complete a workout and gain volume
    for (const rival of board) {
      if (rival.isSimulated) {
        // 65% chance they also did a workout
        if (Math.random() < 0.65) {
          // Volume depends on their current tier
          let added = 2000 + Math.floor(Math.random() * 4000)
          if (rival.rankTier === 'Challenger') added += 3000
          if (rival.rankTier === 'Gold') added += 1500

          rival.weeklyVolume += added
          rival.workoutsCompleted += 1
        }
      }
    }

    // 3. Re-evaluate rank tiers based on volume thresholds
    board.sort((a, b) => b.weeklyVolume - a.weeklyVolume)
    
    board.forEach((user, index) => {
      // Re-assign ranks dynamically based on standing
      if (index < 2) user.rankTier = 'Challenger'
      else if (index < 5) user.rankTier = 'Gold'
      else if (index < 10) user.rankTier = 'Silver'
      else if (index < 13) user.rankTier = 'Bronze'
      else user.rankTier = 'Iron'
    })

    await saveJson(KEY_LEADERBOARD, board)
  },

  async resetWeeklyLeaderboard(): Promise<void> {
    // End of week simulation reset
    const board = await this.getLeaderboard()
    for (const user of board) {
      user.weeklyVolume = user.isSimulated ? (5000 + Math.floor(Math.random() * 20000)) : 0
      user.workoutsCompleted = user.isSimulated ? (1 + Math.floor(Math.random() * 3)) : 0
      if (!user.isSimulated && user.workoutsCompleted > 0) {
        user.streakWeeks += 1
      }
    }
    board.sort((a, b) => b.weeklyVolume - a.weeklyVolume)
    await saveJson(KEY_LEADERBOARD, board)
  }
}
