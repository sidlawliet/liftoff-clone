import React, { useMemo, useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { router, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWorkout } from '@/contexts/WorkoutContext'
import { workoutDb, type WorkoutLog, type Routine, type LeaderboardUser } from '@/lib/workoutDb'
import { ACCENT, ACCENT_DIM, ACCENT_BORDER, BG, SURFACE, SURFACE2, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/lib/theme'
import { getInitials } from '@/lib/utils'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { startWorkout } = useWorkout()

  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [routines, setRoutines] = useState<Routine[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])

  useEffect(() => {
    // Refresh on screen focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadData()
    })
    loadData()
    return unsubscribe
  }, [navigation])

  const loadData = async () => {
    const [l, r, b] = await Promise.all([
      workoutDb.getWorkoutLogs(),
      workoutDb.getRoutines(),
      workoutDb.getLeaderboard()
    ])
    setLogs(l)
    setRoutines(r)
    setLeaderboard(b)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Calculate user stats
  const stats = useMemo(() => {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    const recentLogs = logs.filter(
      (log) => new Date(log.completedAt).getTime() > oneWeekAgo
    )

    const volume = recentLogs.reduce((sum, curr) => sum + curr.totalVolume, 0)
    const workouts = recentLogs.length

    // Find user record in leaderboard
    const userRecord = leaderboard.find((u) => !u.isSimulated)
    const rank = leaderboard.findIndex((u) => !u.isSimulated) + 1
    const tier = userRecord ? userRecord.rankTier : 'Silver'
    const streak = userRecord ? userRecord.streakWeeks : 4

    return {
      volume,
      workouts,
      rank,
      tier,
      streak,
      totalUsers: leaderboard.length
    }
  }, [logs, leaderboard])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  // Generate a dynamic dashboard activity feed based on recent competitor workouts
  const activityFeed = useMemo(() => {
    const feed: any[] = []
    
    // User logs
    logs.slice(0, 2).forEach((log) => {
      feed.push({
        id: log.id,
        user: 'Avery Quinn (You)',
        title: `Completed ${log.name}`,
        detail: `Lifted ${log.totalVolume}kg total volume across ${log.exercises.length} exercises.`,
        time: new Date(log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: 'checkmark-circle-outline' as const,
        color: ACCENT
      })
    })

    // Competitor mock updates based on their scores
    const topRivals = leaderboard.filter((r) => r.isSimulated).slice(0, 3)
    topRivals.forEach((rival, i) => {
      const achievements = [
        `smashed a new PR in Barbell Deadlift!`,
        `completed a heavy volume push session.`,
        `raised their weekly standing to #${leaderboard.indexOf(rival) + 1}!`
      ]
      
      feed.push({
        id: `rival-act-${rival.id}-${i}`,
        user: `${rival.avatarEmoji} ${rival.name}`,
        title: achievements[i % achievements.length],
        detail: `Weekly volume: ${rival.weeklyVolume}kg | ${rival.workoutsCompleted} workouts.`,
        time: `${i + 1}d ago`,
        icon: i % 2 === 0 ? ('trophy-outline' as const) : ('flash-outline' as const),
        color: '#fbbf24'
      })
    })

    // Sort feed (mock time sorting)
    return feed.slice(0, 4)
  }, [logs, leaderboard])

  const handleStartEmpty = () => {
    startWorkout()
  }

  const getRankBadgeColor = (tier: string) => {
    switch (tier) {
      case 'Challenger': return '#ec4899' // Pink neon
      case 'Gold': return '#fbbf24' // Gold
      case 'Silver': return '#38bdf8' // Cyan
      case 'Bronze': return '#f59e0b' // Bronze
      default: return '#94a3b8' // Slate
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header greeting */}
      <View style={s.header}>
        <Text style={s.greeting}>{greeting}, Avery</Text>
        <Text style={s.subGreeting}>Time to stack some iron today.</Text>
      </View>

      {/* Main Stats Card */}
      <Card style={s.statsCard}>
        <View style={s.statsHeader}>
          <Text style={s.statsTitle}>WEEKLY LEADERBOARD STANDING</Text>
          <View style={[s.rankBadge, { backgroundColor: `${getRankBadgeColor(stats.tier)}12`, borderColor: `${getRankBadgeColor(stats.tier)}30` }]}>
            <Text style={[s.rankBadgeText, { color: getRankBadgeColor(stats.tier) }]}>{stats.tier}</Text>
          </View>
        </View>

        <View style={s.standingRow}>
          <Text style={s.rankNumber}>#{stats.rank}</Text>
          <Text style={s.rankTotal}>out of {stats.totalUsers} lifters</Text>
        </View>

        <View style={s.divider} />

        <View style={s.metricGrid}>
          <View style={s.metricItem}>
            <Text style={s.metricVal}>{stats.volume.toLocaleString()} kg</Text>
            <Text style={s.metricLbl}>Weekly Volume</Text>
          </View>
          <View style={s.metricItem}>
            <Text style={s.metricVal}>{stats.workouts}</Text>
            <Text style={s.metricLbl}>Workouts</Text>
          </View>
          <View style={s.metricItem}>
            <Text style={s.metricVal}>🔥 {stats.streak}</Text>
            <Text style={s.metricLbl}>Week Streak</Text>
          </View>
        </View>
      </Card>

      {/* Logger Quick Launch Buttons */}
      <View style={s.quickActions}>
        <Pressable
          onPress={handleStartEmpty}
          style={({ pressed }) => [s.actionBtn, s.actionBtnPrimary, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
        >
          <Ionicons name="play" size={18} color="#000" />
          <Text style={s.actionBtnTextPrimary}>Start Empty Workout</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/explore')}
          style={({ pressed }) => [s.actionBtn, s.actionBtnSecondary, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="fitness" size={18} color={ACCENT} />
          <Text style={s.actionBtnTextSecondary}>Build Routines</Text>
        </Pressable>
      </View>

      {/* Routines Grid */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Select Routine Template</Text>
        <Pressable onPress={() => router.push('/(tabs)/explore')}>
          <Text style={s.sectionLink}>View All</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.routinesScroll}>
        {routines.map((routine) => (
          <Pressable
            key={routine.id}
            onPress={() => startWorkout(routine)}
            style={({ pressed }) => [s.routineCard, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <View style={{ gap: 6 }}>
              <Text style={s.routineName} numberOfLines={1}>{routine.name}</Text>
              <Text style={s.routineDesc} numberOfLines={2}>{routine.description}</Text>
            </View>
            <View style={s.routineFooter}>
              <Text style={s.exercisesCount}>{routine.exercises.length} exercises</Text>
              <View style={s.startIcon}>
                <Ionicons name="play" size={12} color="#000" />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Activity Feed */}
      <Text style={s.sectionTitle}>Rival Activity Feed</Text>
      <Card style={s.feedCard}>
        {activityFeed.length === 0 ? (
          <Text style={s.emptyFeedText}>No recent activity. Get lifting!</Text>
        ) : (
          activityFeed.map((act, index) => (
            <View key={act.id} style={[s.feedRow, index < activityFeed.length - 1 && s.feedDivider]}>
              <View style={[s.feedIconWrap, { backgroundColor: `${act.color}12` }]}>
                <Ionicons name={act.icon} size={15} color={act.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.feedMetaRow}>
                  <Text style={s.feedUser}>{act.user}</Text>
                  <Text style={s.feedTime}>{act.time}</Text>
                </View>
                <Text style={s.feedTitle}>{act.title}</Text>
                <Text style={s.feedDetail}>{act.detail}</Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 18 },
  header: { gap: 4, marginBottom: 4 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  subGreeting: { fontSize: 14, color: TEXT_SECONDARY },
  statsCard: { padding: 18, gap: 14, backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsTitle: { fontSize: 11, color: TEXT_TERTIARY, fontWeight: '700', letterSpacing: 0.8 },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  rankBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  standingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  rankNumber: { fontSize: 32, fontWeight: '900', color: '#fff' },
  rankTotal: { fontSize: 14, color: TEXT_SECONDARY },
  divider: { height: 1, backgroundColor: BORDER },
  metricGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { gap: 4 },
  metricVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  metricLbl: { fontSize: 11, color: TEXT_TERTIARY },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12
  },
  actionBtnPrimary: {
    backgroundColor: ACCENT
  },
  actionBtnSecondary: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER
  },
  actionBtnTextPrimary: { color: '#000', fontSize: 14, fontWeight: '800' },
  actionBtnTextSecondary: { color: ACCENT, fontSize: 14, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },
  sectionLink: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  routinesScroll: { gap: 12, paddingRight: 20 },
  routineCard: {
    width: 170,
    height: 120,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between'
  },
  routineName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  routineDesc: { fontSize: 11, color: TEXT_SECONDARY, lineHeight: 15 },
  routineFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exercisesCount: { fontSize: 11, color: TEXT_TERTIARY, fontWeight: '600' },
  startIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2
  },
  feedCard: { paddingHorizontal: 0, paddingVertical: 4, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  emptyFeedText: { color: TEXT_TERTIARY, textAlign: 'center', paddingVertical: 20 },
  feedRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  feedDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  feedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedUser: { fontSize: 12, fontWeight: '700', color: '#fff' },
  feedTime: { fontSize: 10, color: TEXT_TERTIARY },
  feedTitle: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 1 },
  feedDetail: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 15 }
})
