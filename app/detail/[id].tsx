import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { workoutDb, type WorkoutLog, type LoggedSet } from '@/lib/workoutDb'
import { BG, SURFACE, SURFACE2, BORDER, ACCENT, ACCENT_DIM, ACCENT_LIGHT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING, SUCCESS } from '@/lib/theme'

// Format seconds into H:MM:SS or MM:SS
function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  return `${mins}m ${secs}s`
}

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [log, setLog] = useState<WorkoutLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkout()
  }, [id])

  const loadWorkout = async () => {
    setLoading(true)
    const logs = await workoutDb.getWorkoutLogs()
    const found = logs.find((l) => l.id === id)
    setLog(found || null)
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: BG }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }

  if (!log) {
    return (
      <View style={[s.centered, { backgroundColor: BG }]}>
        <Ionicons name="alert-circle-outline" size={48} color={TEXT_TERTIARY} />
        <Text style={s.notFoundTitle}>Workout Log Not Found</Text>
        <Button label="Go back" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </View>
    )
  }

  // Find all sets in this workout that were PRs
  const prSets = log.exercises.flatMap((ex) =>
    ex.sets
      .filter((set) => set.isPR)
      .map((set) => ({
        exerciseName: ex.name,
        weight: set.weight,
        reps: set.reps
      }))
  )

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header bar */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_SECONDARY} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>Workout Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Title Log Details */}
        <View style={s.metaBlock}>
          <Text style={s.logName}>{log.name}</Text>
          <Text style={s.logDate}>
            {new Date(log.startedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Stats metrics row */}
        <View style={s.metricsRow}>
          <Card style={s.metricCard}>
            <Ionicons name="barbell-outline" size={16} color={ACCENT} />
            <Text style={s.metricValue}>{log.totalVolume.toLocaleString()} kg</Text>
            <Text style={s.metricLabel}>Total Volume</Text>
          </Card>
          <Card style={s.metricCard}>
            <Ionicons name="time-outline" size={16} color={ACCENT} />
            <Text style={s.metricValue}>{formatDuration(log.durationSeconds)}</Text>
            <Text style={s.metricLabel}>Duration</Text>
          </Card>
          <Card style={s.metricCard}>
            <Ionicons name="trophy-outline" size={16} color={WARNING} />
            <Text style={s.metricValue}>{log.prsBroken}</Text>
            <Text style={s.metricLabel}>PRs Smashed</Text>
          </Card>
        </View>

        {/* Trophy Room Celebration Panel */}
        {prSets.length > 0 && (
          <Card style={s.trophyRoomCard}>
            <View style={s.trophyHeader}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={s.trophyTitle}>TROPHY ROOM CELEBRATION</Text>
            </View>
            <Text style={s.trophyDetail}>
              Outstanding! You broke {prSets.length} personal record{prSets.length > 1 ? 's' : ''} in this workout:
            </Text>
            <View style={s.trophyList}>
              {prSets.map((pr, idx) => (
                <View key={idx} style={s.trophyRow}>
                  <Ionicons name="ribbon-sharp" size={14} color="#fbbf24" />
                  <Text style={s.trophyRowText}>
                    {pr.exerciseName}: <Text style={{ color: '#fff', fontWeight: '800' }}>{pr.weight}kg x {pr.reps}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Exercises Performed List */}
        <Text style={s.sectionTitle}>Exercises Performed</Text>
        {log.exercises.map((ex) => (
          <Card key={ex.id} style={s.exerciseCard}>
            <View style={s.exHeader}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.exMuscle}>{ex.muscleGroup}</Text>
            </View>

            <View style={s.setsList}>
              {ex.sets.map((set, setIdx) => (
                <View key={setIdx} style={s.setRow}>
                  <Text style={s.setIndex}>Set {setIdx + 1}</Text>
                  <Text style={s.setVolume}>{set.weight} kg x {set.reps}</Text>
                  
                  {set.isPR ? (
                    <View style={s.prBadge}>
                      <Ionicons name="ribbon" size={10} color="#000" style={{ marginRight: 2 }} />
                      <Text style={s.prBadgeText}>PR</Text>
                    </View>
                  ) : (
                    <View style={{ width: 40 }} />
                  )}
                </View>
              ))}
            </View>
          </Card>
        ))}

        <Button
          variant="secondary"
          label="Back to Dashboard"
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  notFoundTitle: { color: TEXT_SECONDARY, fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  body: { padding: 20, gap: 16 },
  metaBlock: { gap: 4 },
  logName: { fontSize: 24, fontWeight: '900', color: '#fff' },
  logDate: { fontSize: 13, color: TEXT_SECONDARY },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 4, backgroundColor: SURFACE },
  metricValue: { fontSize: 15, fontWeight: '800', color: '#fff' },
  metricLabel: { fontSize: 10, color: TEXT_TERTIARY },
  trophyRoomCard: {
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.03)',
    borderColor: 'rgba(251,191,36,0.18)',
    borderWidth: 1
  },
  trophyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trophyTitle: { fontSize: 11, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.8 },
  trophyDetail: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  trophyList: { gap: 6, marginTop: 4 },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trophyRowText: { fontSize: 12, color: TEXT_SECONDARY },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10 },
  exerciseCard: { padding: 16, gap: 12, backgroundColor: SURFACE },
  exHeader: { gap: 2 },
  exName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  exMuscle: { fontSize: 11, color: TEXT_TERTIARY },
  setsList: { gap: 6 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.04)' },
  setIndex: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  setVolume: { fontSize: 13, color: '#fff', fontWeight: '700' },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  prBadgeText: { fontSize: 10, color: '#000', fontWeight: '800' }
})
