import React, { useState, useEffect, useMemo, useRef } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Dimensions, PanResponder, GestureResponderEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Line } from 'react-native-svg'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { workoutDb, type WorkoutLog, type PersonalRecord, calculateOneRepMax } from '@/lib/workoutDb'
import { PRESEEDED_EXERCISES, type Exercise } from '@/lib/exerciseData'
import { BG, SURFACE, SURFACE2, SURFACE3, BORDER, ACCENT, ACCENT_DIM, ACCENT_BORDER, ACCENT_LIGHT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING, SUCCESS } from '@/lib/theme'

const { width: SW } = Dimensions.get('window')
const CHART_W = SW - 56
const CHART_H = 150
const CHART_PAD = 15

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExId, setSelectedExId] = useState<string>('bench-press')
  
  // Interactive chart scrubbing state
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData()
    })
    loadData()
    return unsubscribe
  }, [navigation])

  const loadData = async () => {
    const [l, p, ex] = await Promise.all([
      workoutDb.getWorkoutLogs(),
      workoutDb.getPRs(),
      workoutDb.getExercises()
    ])
    setLogs(l)
    setPrs(p)
    setExercises(ex)
  }

  // Filter exercises that have history logs so the chart is interesting
  const loggedExercises = useMemo(() => {
    return exercises.filter((ex) =>
      logs.some((log) => log.exercises.some((e) => e.id === ex.id))
    )
  }, [exercises, logs])

  // Get data points for selected exercise: chronological list of 1RM
  const chartData = useMemo(() => {
    const points: Array<{ date: string; oneRepMax: number; weight: number; reps: number }> = []

    // Traverse logs in chronological order (reverse of getWorkoutLogs)
    const chronoLogs = [...logs].reverse()

    chronoLogs.forEach((log) => {
      const ex = log.exercises.find((e) => e.id === selectedExId)
      if (ex) {
        // Find best set in this log
        let max1RM = 0
        let bestWeight = 0
        let bestReps = 0

        ex.sets.forEach((set) => {
          if (set.isCompleted && set.weight > 0 && set.reps > 0) {
            const oneRM = calculateOneRepMax(set.weight, set.reps)
            if (oneRM > max1RM) {
              max1RM = oneRM
              bestWeight = set.weight
              bestReps = set.reps
            }
          }
        })

        if (max1RM > 0) {
          points.push({
            date: new Date(log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            oneRepMax: Math.round(max1RM),
            weight: bestWeight,
            reps: bestReps
          })
        }
      }
    })

    return points
  }, [logs, selectedExId])

  // Map chart coordinates
  const chartCoords = useMemo(() => {
    if (chartData.length < 2) return []

    const minVal = Math.min(...chartData.map((d) => d.oneRepMax)) * 0.95
    const maxVal = Math.max(...chartData.map((d) => d.oneRepMax)) * 1.05
    const valRange = maxVal - minVal || 1

    return chartData.map((d, index) => {
      const x = CHART_PAD + (index / (chartData.length - 1)) * (CHART_W - 2 * CHART_PAD)
      const y = CHART_H - CHART_PAD - ((d.oneRepMax - minVal) / valRange) * (CHART_H - 2 * CHART_PAD)
      return { x, y }
    })
  }, [chartData])

  // SVG Path generation
  const pathD = useMemo(() => {
    if (chartCoords.length < 2) return ''
    
    // Draw smooth line
    return chartCoords.reduce((path, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      // simple curve or line
      const prev = chartCoords[i - 1]
      const cpX1 = prev.x + (p.x - prev.x) / 2
      const cpY1 = prev.y
      const cpX2 = prev.x + (p.x - prev.x) / 2
      const cpY2 = p.y
      return `${path} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`
    }, '')
  }, [chartCoords])

  const fillD = useMemo(() => {
    if (chartCoords.length < 2) return ''
    const first = chartCoords[0]
    const last = chartCoords[chartCoords.length - 1]
    return `${pathD} L ${last.x} ${CHART_H - CHART_PAD} L ${first.x} ${CHART_H - CHART_PAD} Z`
  }, [chartCoords, pathD])

  // Handle graph touch scrubbing
  const handleTouch = (event: GestureResponderEvent) => {
    if (chartCoords.length < 2) return
    const touchX = event.nativeEvent.locationX

    // Find closest index
    let closestIdx = 0
    let minDiff = Infinity
    chartCoords.forEach((coord, index) => {
      const diff = Math.abs(coord.x - touchX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = index
      }
    })

    setScrubIndex(closestIdx)
  }

  // Consistent training heat grid (simulates 4 weeks training contribution)
  const trainingGrid = useMemo(() => {
    // Return array of 28 elements representing days
    // Fill active based on completed logs
    const grid = Array.from({ length: 28 }).map((_, i) => ({
      day: i,
      active: false
    }))

    logs.forEach((log) => {
      const ageDays = Math.floor((Date.now() - new Date(log.completedAt).getTime()) / (24 * 60 * 60 * 1000))
      if (ageDays >= 0 && ageDays < 28) {
        grid[27 - ageDays].active = true
      }
    })

    return grid
  }, [logs])

  // Active training statistics
  const totalLiftingVolume = useMemo(() => {
    return logs.reduce((sum, curr) => sum + curr.totalVolume, 0)
  }, [logs])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={s.profileHeader}>
        <View style={s.avatarBig}>
          <Text style={s.avatarText}>AQ</Text>
          <View style={s.crownIcon}><Ionicons name="ribbon" size={16} color="#fbbf24" /></View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.profileName}>Avery Quinn</Text>
          <Text style={s.profileEmail}>avery.quinn@example.com</Text>
          <View style={s.tierBadge}>
            <Text style={s.tierBadgeText}>Gold League</Text>
          </View>
        </View>
      </View>

      {/* Overview Analytics Row */}
      <View style={s.metricsRow}>
        <Card style={s.metricCard}>
          <Text style={s.metricTitle}>WORKOUTS</Text>
          <Text style={s.metricVal}>{logs.length}</Text>
          <Text style={s.metricSub}>completed logs</Text>
        </Card>
        <Card style={s.metricCard}>
          <Text style={s.metricTitle}>TOTAL VOLUME</Text>
          <Text style={s.metricVal}>{(totalLiftingVolume / 1000).toFixed(1)}k</Text>
          <Text style={s.metricSub}>tons lifted</Text>
        </Card>
        <Card style={s.metricCard}>
          <Text style={s.metricTitle}>PR RECORD</Text>
          <Text style={s.metricVal}>{prs.length}</Text>
          <Text style={s.metricSub}>milestones smashed</Text>
        </Card>
      </View>

      {/* GitHub style training Grid */}
      <Text style={s.sectionTitle}>TRAINING CONSISTENCY</Text>
      <Card style={s.gridCard}>
        <View style={s.gridHeader}>
          <Text style={s.gridHeaderText}>Consistency Grid (Past 4 Weeks)</Text>
          <Text style={s.gridHeaderSub}>🔥 {logs.length > 0 ? 'Active Streak' : 'No Streak'}</Text>
        </View>
        <View style={s.gridBlocks}>
          {trainingGrid.map((day, idx) => (
            <View
              key={idx}
              style={[
                s.gridBlock,
                day.active && s.gridBlockActive,
                idx === 27 && { borderColor: ACCENT, borderWidth: 1 }
              ]}
            />
          ))}
        </View>
        <View style={s.gridFooter}>
          <Text style={s.gridFooterText}>28 days ago</Text>
          <Text style={s.gridFooterText}>Today</Text>
        </View>
      </Card>

      {/* Strength Analytics & SVG curve charts */}
      <Text style={s.sectionTitle}>STRENGTH ANALYSIS</Text>
      
      {/* Exercise selector scroll row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.exSelectRow}>
        {loggedExercises.length === 0 ? (
          <Text style={{ color: TEXT_TERTIARY, fontSize: 13 }}>Complete workouts to unlock exercise progress charts.</Text>
        ) : (
          loggedExercises.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => {
                setSelectedExId(ex.id)
                setScrubIndex(null)
              }}
              style={[s.exPill, selectedExId === ex.id && s.exPillActive]}
            >
              <Text style={[s.exPillText, selectedExId === ex.id && s.exPillTextActive]}>{ex.name}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {loggedExercises.length > 0 && (
        <Card style={s.chartCard}>
          <View style={s.chartHeader}>
            <View>
              <Text style={s.chartExName}>
                {exercises.find((e) => e.id === selectedExId)?.name || 'Exercise'}
              </Text>
              <Text style={s.chartMetricType}>Estimated 1-Rep Max (1RM) Trend</Text>
            </View>
            {/* Interactive tooltip */}
            <View style={{ alignItems: 'flex-end' }}>
              {chartData.length > 0 && (
                <>
                  <Text style={s.chartHoverVal}>
                    {scrubIndex !== null ? chartData[scrubIndex].oneRepMax : chartData[chartData.length - 1].oneRepMax} kg
                  </Text>
                  <Text style={s.chartHoverDate}>
                    {scrubIndex !== null ? chartData[scrubIndex].date : 'Latest Lift'}
                  </Text>
                </>
              )}
            </View>
          </View>

          {chartData.length < 2 ? (
            <View style={s.chartPlaceholder}>
              <Ionicons name="analytics" size={32} color={TEXT_TERTIARY} />
              <Text style={s.chartPlaceholderText}>Log at least 2 sessions to trace trendline</Text>
            </View>
          ) : (
            <View
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
              onTouchEnd={() => setScrubIndex(null)}
              style={s.svgContainer}
            >
              <Svg width={CHART_W} height={CHART_H}>
                <Defs>
                  <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={ACCENT} stopOpacity="0.22" />
                    <Stop offset="1" stopColor={ACCENT} stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>

                {/* Gridlines */}
                <Line x1="0" y1={CHART_H - CHART_PAD} x2={CHART_W} y2={CHART_H - CHART_PAD} stroke={BORDER} strokeWidth={1} />
                <Line x1="0" y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2} stroke={BORDER} strokeWidth={1} strokeDasharray="4 4" />

                {/* Area under curve */}
                <Path d={fillD} fill="url(#chartGrad)" />

                {/* Curved line */}
                <Path d={pathD} fill="none" stroke={ACCENT} strokeWidth={2.5} />

                {/* Dots on points */}
                {chartCoords.map((coord, idx) => (
                  <Circle
                    key={idx}
                    cx={coord.x}
                    cy={coord.y}
                    r={idx === scrubIndex ? 6 : 3.5}
                    fill={idx === scrubIndex ? '#fff' : ACCENT}
                    stroke={idx === scrubIndex ? ACCENT : undefined}
                    strokeWidth={idx === scrubIndex ? 2 : undefined}
                  />
                ))}

                {/* Scrubbing marker line */}
                {scrubIndex !== null && chartCoords[scrubIndex] && (
                  <Line
                    x1={chartCoords[scrubIndex].x}
                    y1={CHART_PAD}
                    x2={chartCoords[scrubIndex].x}
                    y2={CHART_H - CHART_PAD}
                    stroke={ACCENT_LIGHT}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}
              </Svg>
            </View>
          )}

          {chartData.length >= 2 && (
            <Text style={s.scrubHelp}>Touch and drag along the chart to scrub history</Text>
          )}
        </Card>
      )}

      {/* PR Trophy Shelf */}
      <Text style={s.sectionTitle}>🏆 TROPHY SHELF (PRs)</Text>
      {prs.length === 0 ? (
        <Card style={s.emptyPrCard}>
          <Ionicons name="trophy-outline" size={24} color={TEXT_TERTIARY} />
          <Text style={s.emptyPrText}>Trophy shelf is empty. Log completed sets to crush PRs!</Text>
        </Card>
      ) : (
        <View style={s.prsGrid}>
          {prs.map((pr) => (
            <Card key={pr.exerciseId} style={s.prShelfCard}>
              <View style={s.prShelfIcon}>
                <Text style={{ fontSize: 18 }}>🏆</Text>
              </View>
              <Text style={s.prShelfName} numberOfLines={1}>{pr.exerciseName}</Text>
              <Text style={s.prShelfWeight}>{pr.weight}kg x {pr.reps}</Text>
              <Text style={s.prShelfDate}>1RM: {pr.estimatedOneRepMax}kg</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Sign Out option */}
      <Button
        variant="secondary"
        label="Workout Settings"
        onPress={() => router.push('/settings')}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  avatarBig: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: ACCENT_LIGHT },
  crownIcon: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  profileName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 13, color: TEXT_SECONDARY },
  tierBadge: { borderWidth: 1, borderColor: `${WARNING}33`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4, backgroundColor: `${WARNING}08` },
  tierBadgeText: { fontSize: 10, color: WARNING, fontWeight: '800', textTransform: 'uppercase' },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, padding: 12, gap: 2, alignItems: 'center', backgroundColor: SURFACE },
  metricTitle: { fontSize: 9, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.6 },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  metricSub: { fontSize: 9, color: TEXT_TERTIARY },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },
  gridCard: { padding: 16, backgroundColor: SURFACE },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  gridHeaderText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  gridHeaderSub: { fontSize: 12, color: ACCENT, fontWeight: '700' },
  gridBlocks: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  gridBlock: { width: 18, height: 18, borderRadius: 4, backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  gridBlockActive: { backgroundColor: ACCENT },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  gridFooterText: { fontSize: 10, color: TEXT_TERTIARY },
  exSelectRow: { gap: 8, height: 38 },
  exPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center' },
  exPillActive: { backgroundColor: ACCENT_DIM, borderColor: ACCENT_BORDER },
  exPillText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  exPillTextActive: { color: ACCENT },
  chartCard: { padding: 16, backgroundColor: SURFACE2, borderColor: BORDER, borderWidth: 1 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartExName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  chartMetricType: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  chartHoverVal: { fontSize: 16, fontWeight: '800', color: ACCENT },
  chartHoverDate: { fontSize: 10, color: TEXT_TERTIARY, marginTop: 2 },
  chartPlaceholder: { height: CHART_H, alignItems: 'center', justifyContent: 'center', gap: 8 },
  chartPlaceholderText: { color: TEXT_TERTIARY, fontSize: 12 },
  svgContainer: { height: CHART_H, justifyContent: 'center', alignItems: 'center' },
  scrubHelp: { textAlign: 'center', fontSize: 10, color: TEXT_TERTIARY, marginTop: 8 },
  emptyPrCard: { padding: 24, alignItems: 'center', gap: 8, borderStyle: 'dashed' },
  emptyPrText: { color: TEXT_TERTIARY, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  prsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prShelfCard: { width: (SW - 50) / 2, padding: 12, gap: 4, backgroundColor: SURFACE, alignItems: 'center' },
  prShelfIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  prShelfName: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 2 },
  prShelfWeight: { fontSize: 14, fontWeight: '800', color: ACCENT_LIGHT },
  prShelfDate: { fontSize: 10, color: TEXT_TERTIARY }
})
