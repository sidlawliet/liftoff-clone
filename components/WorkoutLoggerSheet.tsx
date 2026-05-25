import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, TextInput, Pressable, Dimensions, Animated as RNAnimated, DeviceEventEmitter, Platform, Keyboard, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated'
import { useWorkout } from '@/contexts/WorkoutContext'
import { BG, SURFACE, SURFACE2, SURFACE3, BORDER, ACCENT, ACCENT_DIM, ACCENT_BORDER, ACCENT_LIGHT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, SUCCESS, ERROR } from '@/lib/theme'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import ExerciseLibraryModal from './ExerciseLibraryModal'

const { width: globalSW, height: globalSH } = Dimensions.get('window')
const TAB_BAR_HEIGHT = 68

// Helper to format duration in seconds to MM:SS
function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ─── PURE JS / REANIMATED CONFETTI SHOWER ─────────────────────────────────────
interface ConfettiParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const CONFETTI_COLORS = ['#a3e635', '#bef264', '#f59e0b', '#fbbf24', '#38bdf8', '#0ea5e9', '#ec4899', '#f43f5e']

function ConfettiShower() {
  const { height: SH, width: SW } = useWindowDimensions()
  const [particles, setParticles] = useState<ConfettiParticle[]>([])
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('trigger-confetti', () => {
      // Spawn 50 particles
      const newParticles: ConfettiParticle[] = Array.from({ length: 45 }).map((_, i) => ({
        id: Math.random() + i,
        x: SW / 2 + (Math.random() - 0.5) * 60,
        y: SH * 0.8,
        vx: (Math.random() - 0.5) * 16,
        vy: -15 - Math.random() * 12,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 10,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      }))
      setParticles((prev) => [...prev, ...newParticles].slice(0, 100))
    })

    return () => {
      sub.remove()
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }, [])

  useEffect(() => {
    if (particles.length === 0) return

    const updatePhysics = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.45, // gravity
            rotation: p.rotation + p.rotationSpeed
          }))
          .filter((p) => p.y < SH + 50 && p.x > -50 && p.x < SW + 50)
        
        if (next.length > 0) {
          animationFrameId.current = requestAnimationFrame(updatePhysics)
        }
        return next
      })
    }

    animationFrameId.current = requestAnimationFrame(updatePhysics)
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }, [particles.length > 0])

  if (particles.length === 0) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <View
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 2 === 0 ? 0 : p.size / 2,
            transform: [{ rotate: `${p.rotation}deg` }]
          }}
        />
      ))}
    </View>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WorkoutLoggerSheet() {
  const { height: SH, width: SW } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const {
    activeWorkout,
    cancelActiveWorkout,
    finishActiveWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleSetComplete,
    startRestTimer,
    skipRestTimer
  } = useWorkout()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [lastActiveId, setLastActiveId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (activeWorkout) {
      const currentId = activeWorkout.startedAt
      if (lastActiveId !== currentId) {
        setIsExpanded(true)
        setLastActiveId(currentId)
      }
    } else {
      setLastActiveId(undefined)
    }
  }, [activeWorkout, lastActiveId])

  // Animated height value
  const translateY = useSharedValue(SH)

  // Sync translateY when SH changes and activeWorkout is null
  useEffect(() => {
    if (!activeWorkout) {
      translateY.value = SH
    }
  }, [SH, !!activeWorkout])

  // Listen to keyboard to adjust bottom offset
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    if (activeWorkout) {
      if (isExpanded) {
        translateY.value = withSpring(0, { damping: 20, stiffness: 120 })
      } else {
        // Collapsed bar height floats above tab bar
        const collapsedBottom = insets.bottom + TAB_BAR_HEIGHT + 14
        translateY.value = withSpring(SH - collapsedBottom - 60, { damping: 22, stiffness: 130 })
      }
    } else {
      translateY.value = withTiming(SH, { duration: 250, easing: Easing.inOut(Easing.ease) })
      setIsExpanded(false)
    }
  }, [!!activeWorkout, isExpanded, insets.bottom, SH])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    }
  })

  if (!activeWorkout) return null

  const handleSelectExercise = (exercise: any) => {
    addExercise({ id: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup })
    setIsLibraryOpen(false)
  }

  return (
    <>
      <Animated.View
        style={[
          s.sheet,
          isExpanded ? s.sheetExpanded : s.sheetCollapsed,
          isExpanded && { paddingTop: insets.top },
          { height: isExpanded ? SH : 60 },
          animatedStyle
        ]}
      >
        {/* ─── COLLAPSED BAR ─── */}
        {!isExpanded ? (
          <Pressable onPress={() => setIsExpanded(true)} style={s.collapsedBarInner}>
            <View style={s.collapsedLeft}>
              <View style={s.pulseCircle} />
              <View>
                <Text style={s.collapsedTitle} numberOfLines={1}>{activeWorkout.name}</Text>
                <Text style={s.collapsedTimer}>{formatTime(activeWorkout.elapsedSeconds)}</Text>
              </View>
            </View>
            <View style={s.collapsedRight}>
              {activeWorkout.restTimerActive && (
                <View style={s.miniRestBadge}>
                  <Ionicons name="time" size={14} color={ACCENT} />
                  <Text style={s.miniRestText}>{activeWorkout.restTimerSeconds}s</Text>
                </View>
              )}
              <Pressable
                onPress={async (e) => {
                  e.stopPropagation()
                  const logged = await finishActiveWorkout()
                  if (logged) setIsExpanded(false)
                }}
                style={({ pressed }) => [s.miniFinishBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={s.miniFinishText}>Finish</Text>
              </Pressable>
              <Ionicons name="chevron-up" size={20} color={TEXT_SECONDARY} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ) : (
          /* ─── EXPANDED CONTROLS ─── */
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.expandedHeader}>
              <Pressable onPress={() => setIsExpanded(false)} hitSlop={12} style={s.headerIconButton}>
                <Ionicons name="chevron-down" size={24} color={TEXT_SECONDARY} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={s.expandedHeaderTitle}>{activeWorkout.name}</Text>
                <Text style={s.expandedHeaderTimer}>
                  ⏱️ {formatTime(activeWorkout.elapsedSeconds)}
                </Text>
              </View>
              <Pressable onPress={cancelActiveWorkout} style={s.headerCancelButton}>
                <Text style={s.cancelText}>Discard</Text>
              </Pressable>
            </View>

            {/* Rest Timer Panel */}
            {activeWorkout.restTimerActive && (
              <View style={s.restTimerContainer}>
                <View style={s.restLeft}>
                  <Ionicons name="alarm-outline" size={20} color={ACCENT} />
                  <Text style={s.restTimerLabel}>
                    Resting: <Text style={s.restTimerValue}>{activeWorkout.restTimerSeconds}s</Text>
                  </Text>
                </View>
                <View style={s.restButtons}>
                  <Pressable onPress={() => startRestTimer(activeWorkout.restTimerSeconds + 30)} style={s.restAddBtn}>
                    <Text style={s.restAddText}>+30s</Text>
                  </Pressable>
                  <Pressable onPress={skipRestTimer} style={s.restSkipBtn}>
                    <Text style={s.restSkipText}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Scrollable Workout Logs */}
            <ScrollView
              contentContainerStyle={[s.scrollContent, { paddingBottom: 100 + keyboardHeight }]}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {activeWorkout.exercises.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="fitness-outline" size={48} color={TEXT_TERTIARY} />
                  <Text style={s.emptyText}>Add some exercises to get started!</Text>
                </View>
              ) : (
                activeWorkout.exercises.map((ex, exIdx) => (
                  <View key={ex.id} style={s.exerciseBlock}>
                    <View style={s.exerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.exName}>{ex.name}</Text>
                        <Text style={s.exMeta}>{ex.muscleGroup}</Text>
                      </View>
                      <Pressable onPress={() => removeExercise(ex.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={ERROR} />
                      </Pressable>
                    </View>

                    {/* Column Headers */}
                    <View style={s.setRowHeader}>
                      <Text style={[s.setCell, { flex: 0.8, textAlign: 'center' }]}>SET</Text>
                      <Text style={[s.setCell, { flex: 1.5, textAlign: 'center' }]}>KG</Text>
                      <Text style={[s.setCell, { flex: 1.5, textAlign: 'center' }]}>REPS</Text>
                      <Text style={[s.setCell, { flex: 1.2, textAlign: 'center' }]}>DONE</Text>
                    </View>

                    {/* Set Rows */}
                    {ex.sets.map((set, setIdx) => (
                      <View key={setIdx} style={[s.setRow, set.isCompleted && s.setRowCompleted]}>
                        {/* Set index */}
                        <View style={{ flex: 0.8, alignItems: 'center' }}>
                          <Text style={[s.setLabel, set.isCompleted && { color: ACCENT }]}>
                            {setIdx + 1}
                          </Text>
                        </View>

                        {/* Weight Input */}
                        <View style={{ flex: 1.5, paddingHorizontal: 4 }}>
                          <TextInput
                            keyboardType="numeric"
                            value={set.weight}
                            onChangeText={(val) => updateSet(ex.id, setIdx, { weight: val })}
                            placeholder="0"
                            placeholderTextColor={TEXT_TERTIARY}
                            style={[s.setInput, set.isCompleted && s.setInputCompleted]}
                            editable={!set.isCompleted}
                            selectTextOnFocus
                          />
                        </View>

                        {/* Reps Input */}
                        <View style={{ flex: 1.5, paddingHorizontal: 4 }}>
                          <TextInput
                            keyboardType="number-pad"
                            value={set.reps}
                            onChangeText={(val) => updateSet(ex.id, setIdx, { reps: val })}
                            placeholder="0"
                            placeholderTextColor={TEXT_TERTIARY}
                            style={[s.setInput, set.isCompleted && s.setInputCompleted]}
                            editable={!set.isCompleted}
                            selectTextOnFocus
                          />
                        </View>

                        {/* Completion Checkbox */}
                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                          <Pressable
                            onPress={() => toggleSetComplete(ex.id, setIdx)}
                            style={[
                              s.checkbox,
                              set.isCompleted && s.checkboxChecked
                            ]}
                          >
                            {set.isCompleted ? (
                              <Ionicons name="checkmark-sharp" size={15} color="#000" />
                            ) : null}
                          </Pressable>
                        </View>
                        
                        {/* Option to delete set */}
                        <Pressable onPress={() => removeSet(ex.id, setIdx)} style={s.setRemoveBtn} hitSlop={4}>
                          <Ionicons name="close" size={14} color={TEXT_TERTIARY} />
                        </Pressable>
                      </View>
                    ))}

                    <Pressable onPress={() => addSet(ex.id)} style={s.addSetRow}>
                      <Ionicons name="add" size={16} color={ACCENT} />
                      <Text style={s.addSetText}>Add Set</Text>
                    </Pressable>
                  </View>
                ))
              )}

              {/* Action Buttons */}
              <View style={s.actionButtons}>
                <Button
                  variant="secondary"
                  label="Add Exercise"
                  onPress={() => setIsLibraryOpen(true)}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="primary"
                  label="Finish Workout"
                  onPress={finishActiveWorkout}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      <ExerciseLibraryModal
        visible={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleSelectExercise}
      />

      {/* Confetti Overlay component */}
      <ConfettiShower />
    </>
  )
}

const s = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 24,
    overflow: 'hidden',
    zIndex: 9999
  },
  sheetCollapsed: {
    borderRadius: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
    backgroundColor: SURFACE2
  },
  sheetExpanded: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: BG
  },
  collapsedBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: '100%'
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4
  },
  collapsedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    maxWidth: globalSW * 0.4
  },
  collapsedTimer: {
    fontSize: 11,
    color: TEXT_SECONDARY
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  miniRestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(163,230,53,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  miniRestText: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '700'
  },
  miniFinishBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  miniFinishText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800'
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER
  },
  headerIconButton: { padding: 4 },
  expandedHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  expandedHeaderTimer: { fontSize: 13, color: ACCENT, marginTop: 2, fontWeight: '700' },
  headerCancelButton: { paddingHorizontal: 10, paddingVertical: 6 },
  cancelText: { color: ERROR, fontSize: 13, fontWeight: '700' },
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE2,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  restLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restTimerLabel: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  restTimerValue: { color: ACCENT, fontWeight: '800', fontSize: 15 },
  restButtons: { flexDirection: 'row', gap: 10 },
  restAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: SURFACE3,
    borderWidth: 1,
    borderColor: BORDER
  },
  restAddText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  restSkipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  restSkipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', height: globalSH * 0.4, gap: 10 },
  emptyText: { color: TEXT_TERTIARY, fontSize: 14, textAlign: 'center' },
  exerciseBlock: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 12
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  exMeta: { fontSize: 12, color: TEXT_TERTIARY },
  setRowHeader: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  setCell: { fontSize: 10, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.04)', position: 'relative' },
  setRowCompleted: { backgroundColor: 'rgba(163,230,53,0.02)' },
  setLabel: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: '600' },
  setInput: {
    height: 38,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 0
  },
  setInputCompleted: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: ACCENT
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE2
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT
  },
  setRemoveBtn: { position: 'absolute', right: -10, padding: 6 },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed'
  },
  addSetText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 12 }
})
