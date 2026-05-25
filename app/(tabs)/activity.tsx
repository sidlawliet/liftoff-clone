import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { workoutDb, type LeaderboardUser } from '@/lib/workoutDb'
import { ACCENT, ACCENT_DIM, ACCENT_BORDER, ACCENT_LIGHT, BG, SURFACE, SURFACE2, SURFACE3, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING, SUCCESS } from '@/lib/theme'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [rankingType, setRankingType] = useState<'volume' | 'count'>('volume')
  const [refreshing, setRefreshing] = useState(false)

  // Rival profile inspect modal
  const [selectedRival, setSelectedRival] = useState<LeaderboardUser | null>(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData()
    })
    loadData()
    return unsubscribe
  }, [navigation])

  const loadData = async () => {
    const board = await workoutDb.getLeaderboard()
    setLeaderboard(board)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Sorted list based on selected tab
  const sortedBoard = [...leaderboard].sort((a, b) => {
    if (rankingType === 'volume') {
      return b.weeklyVolume - a.weeklyVolume
    } else {
      if (b.workoutsCompleted !== a.workoutsCompleted) {
        return b.workoutsCompleted - a.workoutsCompleted
      }
      return b.weeklyVolume - a.weeklyVolume // fallback
    }
  })

  // User rank standing calculations
  const userRankData = (() => {
    const userIndex = sortedBoard.findIndex((u) => !u.isSimulated)
    if (userIndex < 0) return null
    const user = sortedBoard[userIndex]
    const nextCompetitor = userIndex > 0 ? sortedBoard[userIndex - 1] : null
    
    return {
      user,
      rank: userIndex + 1,
      nextCompetitor,
      gap: nextCompetitor 
        ? (rankingType === 'volume' 
            ? nextCompetitor.weeklyVolume - user.weeklyVolume 
            : nextCompetitor.workoutsCompleted - user.workoutsCompleted)
        : 0
    }
  })()

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24' // gold
    if (rank === 2) return '#cbd5e1' // silver
    if (rank === 3) return '#b45309' // bronze
    return TEXT_SECONDARY
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Challenger': return '#ec4899'
      case 'Gold': return '#fbbf24'
      case 'Silver': return '#38bdf8'
      case 'Bronze': return '#f59e0b'
      default: return '#94a3b8'
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={s.header}>
          <Text style={s.title}>Ranked Arena</Text>
          <Text style={s.subtitle}>Weekly strength leagues. Log sets to climb.</Text>
        </View>

        {/* Dynamic Standing Alert Banner */}
        {userRankData && (
          <Card style={[s.alertCard, userRankData.rank === 1 ? s.alertCardGold : s.alertCardNormal]}>
            <View style={s.alertInner}>
              <Ionicons
                name={userRankData.rank === 1 ? 'trophy' : 'arrow-up-circle-outline'}
                size={22}
                color={userRankData.rank === 1 ? '#fbbf24' : ACCENT}
              />
              <View style={{ flex: 1, gap: 2 }}>
                {userRankData.rank === 1 ? (
                  <Text style={s.alertTextGold}>👑 You are currently #1 in the league!</Text>
                ) : (
                  <Text style={s.alertText}>
                    You are <Text style={s.alertHighlight}>#{userRankData.rank}</Text>. Lift{' '}
                    <Text style={s.alertHighlight}>
                      {userRankData.gap.toLocaleString()} {rankingType === 'volume' ? 'kg' : 'sets'}
                    </Text>{' '}
                    more to overtake <Text style={s.alertHighlight}>{userRankData.nextCompetitor?.name}</Text>!
                  </Text>
                )}
                <Text style={s.alertSubText}>Leagues end in 3 days. Top 2 promote to Challenger tier.</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Tab Selector */}
        <View style={s.tabWrap}>
          <Pressable
            onPress={() => setRankingType('volume')}
            style={[s.tabItem, rankingType === 'volume' && s.tabItemActive]}
          >
            <Ionicons name="barbell-outline" size={16} color={rankingType === 'volume' ? '#000' : TEXT_SECONDARY} />
            <Text style={[s.tabText, rankingType === 'volume' && s.tabTextActive]}>Weekly Volume</Text>
          </Pressable>
          <Pressable
            onPress={() => setRankingType('count')}
            style={[s.tabItem, rankingType === 'count' && s.tabItemActive]}
          >
            <Ionicons name="calendar-outline" size={16} color={rankingType === 'count' ? '#000' : TEXT_SECONDARY} />
            <Text style={[s.tabText, rankingType === 'count' && s.tabTextActive]}>Workouts</Text>
          </Pressable>
        </View>

        {/* Leaderboard List */}
        <Card style={s.boardCard}>
          {sortedBoard.map((item, index) => {
            const isUser = !item.isSimulated
            const rank = index + 1
            return (
              <Pressable
                key={item.id}
                onPress={() => !isUser && setSelectedRival(item)}
                style={({ pressed }) => [
                  s.row,
                  isUser && s.userRow,
                  pressed && !isUser && { backgroundColor: SURFACE2 },
                  index < sortedBoard.length - 1 && s.rowDivider
                ]}
              >
                {/* Rank number */}
                <View style={s.rankCol}>
                  <Text style={[s.rankText, { color: getRankColor(rank) }]}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </Text>
                </View>

                {/* Avatar Icon */}
                <View style={s.avatarCol}>
                  <View style={[s.avatarBg, isUser && s.userAvatarBg]}>
                    <Text style={{ fontSize: 18 }}>{item.avatarEmoji}</Text>
                  </View>
                </View>

                {/* Profile detail */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.userName, isUser && s.userText]}>
                    {item.name} {isUser && <Text style={s.youTag}>(You)</Text>}
                  </Text>
                  <View style={s.userMetaRow}>
                    <View style={[s.tierBadge, { borderColor: `${getTierColor(item.rankTier)}33` }]}>
                      <Text style={[s.tierText, { color: getTierColor(item.rankTier) }]}>{item.rankTier}</Text>
                    </View>
                    <Text style={s.streakText}>🔥 {item.streakWeeks}w streak</Text>
                  </View>
                </View>

                {/* Score */}
                <View style={s.scoreCol}>
                  <Text style={[s.scoreValue, isUser && s.userText]}>
                    {rankingType === 'volume' 
                      ? `${item.weeklyVolume.toLocaleString()} kg` 
                      : `${item.workoutsCompleted} workouts`}
                  </Text>
                  <Text style={s.scoreLabel}>
                    {rankingType === 'volume' ? 'weekly volume' : 'completed'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </Card>
      </ScrollView>

      {/* ─── RIVAL PROFILE DETAIL PANEL (MODAL) ─── */}
      <Modal visible={!!selectedRival} animationType="fade" transparent onRequestClose={() => setSelectedRival(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setSelectedRival(null)}>
          <Pressable style={s.modalContent} pointerEvents="box-none">
            {selectedRival && (
              <Card style={s.rivalCard}>
                <View style={s.rivalHeader}>
                  <Text style={s.rivalAvatar}>{selectedRival.avatarEmoji}</Text>
                  <View>
                    <Text style={s.rivalName}>{selectedRival.name}</Text>
                    <View style={s.rivalPills}>
                      <View style={[s.tierBadge, { borderColor: `${getTierColor(selectedRival.rankTier)}33` }]}>
                        <Text style={[s.tierText, { color: getTierColor(selectedRival.rankTier) }]}>{selectedRival.rankTier}</Text>
                      </View>
                      <Text style={s.rivalStreak}>🔥 {selectedRival.streakWeeks} week streak</Text>
                    </View>
                  </View>
                </View>

                {/* Quote / Status Message */}
                <View style={s.quoteWrap}>
                  <Text style={s.quoteText}>"{selectedRival.statusMessage}"</Text>
                </View>

                {/* Rival Stats */}
                <View style={s.rivalMetrics}>
                  <View style={s.rivalMetricItem}>
                    <Text style={s.rivalMetricVal}>{selectedRival.weeklyVolume.toLocaleString()} kg</Text>
                    <Text style={s.rivalMetricLbl}>Weekly Volume</Text>
                  </View>
                  <View style={s.rivalMetricItem}>
                    <Text style={s.rivalMetricVal}>{selectedRival.workoutsCompleted}</Text>
                    <Text style={s.rivalMetricLbl}>Completed</Text>
                  </View>
                </View>

                <Button
                  variant="secondary"
                  label="Close Profile"
                  onPress={() => setSelectedRival(null)}
                  style={{ marginTop: 8 }}
                />
              </Card>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: TEXT_SECONDARY },
  alertCard: { padding: 12, borderRadius: 12 },
  alertCardNormal: { backgroundColor: SURFACE, borderLeftWidth: 3, borderLeftColor: ACCENT, borderColor: BORDER },
  alertCardGold: { backgroundColor: 'rgba(251,191,36,0.03)', borderLeftWidth: 3, borderLeftColor: '#fbbf24', borderColor: 'rgba(251,191,36,0.1)' },
  alertInner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertText: { fontSize: 13, color: '#fff', lineHeight: 18 },
  alertTextGold: { fontSize: 13, color: '#fbbf24', fontWeight: '700', lineHeight: 18 },
  alertHighlight: { color: ACCENT, fontWeight: '800' },
  alertSubText: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  tabWrap: { flexDirection: 'row', backgroundColor: SURFACE, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 9 },
  tabItemActive: { backgroundColor: ACCENT },
  tabText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  tabTextActive: { color: '#000', fontWeight: '800' },
  boardCard: { paddingHorizontal: 0, paddingVertical: 4, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  userRow: { backgroundColor: 'rgba(163,230,53,0.03)', borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 13 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  rankCol: { width: 34, alignItems: 'center' },
  rankText: { fontSize: 15, fontWeight: '800' },
  avatarCol: { width: 36, marginRight: 10 },
  avatarBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  userAvatarBg: { borderColor: ACCENT_BORDER, backgroundColor: ACCENT_DIM },
  userName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  userText: { color: ACCENT_LIGHT },
  youTag: { fontSize: 11, color: ACCENT, fontWeight: '800' },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  tierBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tierText: { fontSize: 9, fontWeight: '800' },
  streakText: { fontSize: 10, color: TEXT_TERTIARY, fontWeight: '600' },
  scoreCol: { alignItems: 'flex-end', justifyContent: 'center' },
  scoreValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
  scoreLabel: { fontSize: 9, color: TEXT_TERTIARY, textTransform: 'uppercase', letterSpacing: 0.2, marginTop: 1 },

  // Rival inspect details modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%' },
  rivalCard: { padding: 20, gap: 16, backgroundColor: SURFACE, borderColor: ACCENT_BORDER, borderWidth: 1, shadowColor: ACCENT, shadowOpacity: 0.15, shadowRadius: 20 },
  rivalHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  rivalAvatar: { fontSize: 36 },
  rivalName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  rivalPills: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  rivalStreak: { fontSize: 12, color: TEXT_SECONDARY },
  quoteWrap: { padding: 12, backgroundColor: SURFACE2, borderRadius: 10 },
  quoteText: { color: TEXT_SECONDARY, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  rivalMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 6 },
  rivalMetricItem: { alignItems: 'center', gap: 4 },
  rivalMetricVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  rivalMetricLbl: { fontSize: 11, color: TEXT_TERTIARY }
})
