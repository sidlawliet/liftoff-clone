import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TextInput, Pressable, Modal, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWorkout } from '@/contexts/WorkoutContext'
import { workoutDb, type Routine, type RoutineExercise, type WorkoutLog, type PersonalRecord } from '@/lib/workoutDb'
import { type Exercise, PRESEEDED_EXERCISES, MuscleGroup, EquipmentType } from '@/lib/exerciseData'
import { BG, SURFACE, SURFACE2, SURFACE3, BORDER, ACCENT, ACCENT_DIM, ACCENT_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ERROR, SUCCESS } from '@/lib/theme'
import ExerciseLibraryModal from '@/components/ExerciseLibraryModal'

const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { startWorkout, activeWorkout, addExercise } = useWorkout()

  const [routines, setRoutines] = useState<Routine[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)

  // Modals state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [exerciseHistory, setExerciseHistory] = useState<WorkoutLog[]>([])
  const [exercisePr, setExercisePr] = useState<PersonalRecord | null>(null)

  // Routine Builder state
  const [isBuildingRoutine, setIsBuildingRoutine] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [newRoutineDesc, setNewRoutineDesc] = useState('')
  const [newRoutineExercises, setNewRoutineExercises] = useState<RoutineExercise[]>([])
  const [isBuilderLibraryOpen, setIsBuilderLibraryOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData()
    })
    loadData()
    return unsubscribe
  }, [navigation])

  const loadData = async () => {
    const [r, ex] = await Promise.all([
      workoutDb.getRoutines(),
      workoutDb.getExercises()
    ])
    setRoutines(r)
    setExercises(ex)
  }

  // Handle exercise selection for Exercise Details
  const handleOpenExerciseDetails = async (exercise: Exercise) => {
    setSelectedExercise(exercise)
    
    // Fetch user history for this exercise
    const logs = await workoutDb.getWorkoutLogs()
    const prs = await workoutDb.getPRs()
    
    const exLogs = logs.filter((log) =>
      log.exercises.some((e) => e.id === exercise.id)
    )
    const exPr = prs.find((p) => p.exerciseId === exercise.id) || null

    setExerciseHistory(exLogs)
    setExercisePr(exPr)
  }

  // Routine Builder Helpers
  const handleAddExerciseToBuilder = (ex: Exercise) => {
    setNewRoutineExercises((prev) => [
      ...prev,
      {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: [{ reps: 10, weight: 20 }]
      }
    ])
    setIsBuilderLibraryOpen(false)
  }

  const handleRemoveExerciseFromBuilder = (idx: number) => {
    setNewRoutineExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateBuilderSet = (exIdx: number, setIdx: number, fields: Partial<{ reps: number; weight: number }>) => {
    setNewRoutineExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex
        return {
          ...ex,
          sets: ex.sets.map((set, j) => (j === setIdx ? { ...set, ...fields } : set))
        }
      })
    )
  }

  const handleAddSetToBuilderExercise = (exIdx: number) => {
    setNewRoutineExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex
        const lastSet = ex.sets[ex.sets.length - 1]
        return {
          ...ex,
          sets: [...ex.sets, { reps: lastSet ? lastSet.reps : 10, weight: lastSet ? lastSet.weight : 20 }]
        }
      })
    )
  }

  const handleRemoveSetFromBuilderExercise = (exIdx: number, setIdx: number) => {
    setNewRoutineExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex
        return {
          ...ex,
          sets: ex.sets.filter((_, j) => j !== setIdx)
        }
      })
    )
  }

  const handleSaveRoutine = async () => {
    if (!newRoutineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name.')
      return
    }
    if (newRoutineExercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise.')
      return
    }

    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      name: newRoutineName.trim(),
      description: newRoutineDesc.trim(),
      exercises: newRoutineExercises,
      createdAt: new Date().toISOString()
    }

    await workoutDb.saveRoutine(newRoutine)
    setIsBuildingRoutine(false)
    setNewRoutineName('')
    setNewRoutineDesc('')
    setNewRoutineExercises([])
    loadData()
  }

  const handleDeleteRoutine = (id: string, name: string) => {
    Alert.alert('Delete Routine', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await workoutDb.deleteRoutine(id)
          loadData()
        }
      }
    ])
  }

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = selectedMuscle ? ex.muscleGroup === selectedMuscle : true
    return matchesSearch && matchesMuscle
  })

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Title */}
      <View style={s.header}>
        <Text style={s.title}>Routines & Library</Text>
        <Text style={s.subtitle}>Build custom workouts and search exercises.</Text>
      </View>

      {/* Routine list section */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>MY ROUTINES</Text>
        <Pressable onPress={() => setIsBuildingRoutine(true)} style={s.createBtn}>
          <Ionicons name="add" size={16} color={ACCENT} />
          <Text style={s.createBtnText}>Create Routine</Text>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <Card style={s.emptyCard}>
          <Text style={s.emptyCardText}>No routines created yet.</Text>
        </Card>
      ) : (
        routines.map((routine) => (
          <Card key={routine.id} style={s.routineCard}>
            <View style={s.routineCardHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.routineCardName}>{routine.name}</Text>
                {routine.description ? <Text style={s.routineCardDesc}>{routine.description}</Text> : null}
              </View>
              {/* Delete button only for user created custom routines */}
              {routine.id !== 'push-day' && routine.id !== 'pull-day' && routine.id !== 'leg-day' && (
                <Pressable onPress={() => handleDeleteRoutine(routine.id, routine.name)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={ERROR} />
                </Pressable>
              )}
            </View>

            <View style={s.routineCardSummary}>
              <Text style={s.routineExercisesText} numberOfLines={1}>
                {routine.exercises.map((e) => e.name).join(', ')}
              </Text>
            </View>

            <View style={s.routineCardFooter}>
              <Text style={s.routineCardSetCount}>{routine.exercises.length} Exercises</Text>
              <Button
                variant="primary"
                label="Start Workout"
                onPress={() => startWorkout(routine)}
                style={s.startBtn}
              />
            </View>
          </Card>
        ))
      )}

      {/* Exercise Library section */}
      <Text style={s.sectionTitle}>EXERCISE LIBRARY</Text>

      {/* Search Bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={TEXT_TERTIARY} style={s.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search 100+ exercises..."
          placeholderTextColor={TEXT_TERTIARY}
          style={s.searchInput}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} style={s.clearBtn}>
            <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
          </Pressable>
        ) : null}
      </View>

      {/* Muscle Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        <Pressable
          onPress={() => setSelectedMuscle(null)}
          style={[s.pill, !selectedMuscle && s.pillActive]}
        >
          <Text style={[s.pillText, !selectedMuscle && s.pillTextActive]}>All Muscles</Text>
        </Pressable>
        {MUSCLE_GROUPS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setSelectedMuscle(m)}
            style={[s.pill, selectedMuscle === m && s.pillActive]}
          >
            <Text style={[s.pillText, selectedMuscle === m && s.pillTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Exercise list */}
      <Card style={s.libraryCard}>
        {filteredExercises.slice(0, 15).map((ex, index) => (
          <Pressable
            key={ex.id}
            onPress={() => handleOpenExerciseDetails(ex)}
            style={({ pressed }) => [
              s.exerciseRow,
              pressed && { backgroundColor: SURFACE2 },
              index < filteredExercises.length - 1 && s.rowDivider
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.exMeta}>{ex.muscleGroup} · {ex.equipment}</Text>
            </View>
            <Ionicons name="information-circle-outline" size={18} color={ACCENT} />
          </Pressable>
        ))}
        {filteredExercises.length > 15 && (
          <Text style={s.moreText}>And {filteredExercises.length - 15} more. Search to filter.</Text>
        )}
      </Card>

      {/* ─── EXERCISE DETAILS MODAL ─── */}
      <Modal visible={!!selectedExercise} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedExercise(null)}>
        <View style={[s.modalRoot, { backgroundColor: BG }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Exercise Guide</Text>
            <Pressable onPress={() => setSelectedExercise(null)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          {selectedExercise && (
            <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.detailsName}>{selectedExercise.name}</Text>
              <View style={s.detailsPills}>
                <View style={s.detailsPill}><Text style={s.detailsPillText}>{selectedExercise.muscleGroup}</Text></View>
                <View style={s.detailsPill}><Text style={s.detailsPillText}>{selectedExercise.equipment}</Text></View>
              </View>

              <Button
                variant="primary"
                label={activeWorkout ? "＋ Add to Active Session" : "⚡ Start Exercise Session"}
                onPress={() => {
                  if (activeWorkout) {
                    addExercise({ id: selectedExercise.id, name: selectedExercise.name, muscleGroup: selectedExercise.muscleGroup })
                  } else {
                    startWorkout(undefined, [{ id: selectedExercise.id, name: selectedExercise.name, muscleGroup: selectedExercise.muscleGroup }])
                  }
                  setSelectedExercise(null)
                }}
                style={{ marginTop: 12 }}
                fullWidth
              />

              {/* PR Status Card */}
              {exercisePr ? (
                <Card style={s.prCard}>
                  <View style={s.prHeader}>
                    <Ionicons name="trophy" size={20} color="#fbbf24" />
                    <Text style={s.prTitle}>PERSONAL RECORD</Text>
                  </View>
                  <Text style={s.prValue}>
                    {exercisePr.weight}kg x {exercisePr.reps} reps
                  </Text>
                  <Text style={s.prSubtitle}>
                    Estimated 1RM: <Text style={{ color: ACCENT, fontWeight: '700' }}>{exercisePr.estimatedOneRepMax}kg</Text>
                  </Text>
                </Card>
              ) : (
                <Card style={s.prCardEmpty}>
                  <Text style={s.prCardEmptyText}>No PR logged yet. Go lift it!</Text>
                </Card>
              )}

              {/* Guide Instructions */}
              <Text style={s.sectionLabel}>INSTRUCTIONS</Text>
              <Card style={s.instructionsCard}>
                {selectedExercise.instructions.map((inst, index) => (
                  <View key={index} style={s.instructionRow}>
                    <View style={s.instructionNum}><Text style={s.instructionNumText}>{index + 1}</Text></View>
                    <Text style={s.instructionText}>{inst}</Text>
                  </View>
                ))}
              </Card>

              {/* Logs History */}
              <Text style={s.sectionLabel}>LOG HISTORY</Text>
              {exerciseHistory.length === 0 ? (
                <Text style={s.emptyHistory}>No completed sets in history.</Text>
              ) : (
                exerciseHistory.map((log) => {
                  const logEx = log.exercises.find((e) => e.id === selectedExercise.id)
                  if (!logEx) return null
                  return (
                    <Card key={log.id} style={s.historyCard}>
                      <View style={s.historyHeader}>
                        <Text style={s.historyName}>{log.name}</Text>
                        <Text style={s.historyDate}>
                          {new Date(log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={s.historySets}>
                        {logEx.sets.map((set, sIdx) => (
                          <View key={sIdx} style={s.historySetRow}>
                            <Text style={s.historySetText}>Set {sIdx + 1}: {set.weight}kg x {set.reps} reps</Text>
                            {set.isPR && (
                              <View style={s.historyPrBadge}>
                                <Text style={s.historyPrText}>PR</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </Card>
                  )
                })
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ─── ROUTINE BUILDER MODAL ─── */}
      <Modal visible={isBuildingRoutine} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsBuildingRoutine(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Routine Template</Text>
            <Pressable onPress={() => setIsBuildingRoutine(false)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.builderScroll} keyboardShouldPersistTaps="handled">
            <View style={s.field}>
              <Text style={s.label}>ROUTINE NAME</Text>
              <TextInput
                value={newRoutineName}
                onChangeText={setNewRoutineName}
                placeholder="e.g. Back and Biceps"
                placeholderTextColor={TEXT_TERTIARY}
                style={s.input}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>DESCRIPTION</Text>
              <TextInput
                value={newRoutineDesc}
                onChangeText={setNewRoutineDesc}
                placeholder="e.g. Focus on compound rows"
                placeholderTextColor={TEXT_TERTIARY}
                style={s.input}
              />
            </View>

            {/* Exercises List in Builder */}
            <View style={s.builderExercisesHeader}>
              <Text style={s.label}>EXERCISES ({newRoutineExercises.length})</Text>
              <Pressable onPress={() => setIsBuilderLibraryOpen(true)} style={s.addExBtn}>
                <Ionicons name="add" size={14} color={ACCENT} />
                <Text style={s.addExBtnText}>Add Exercise</Text>
              </Pressable>
            </View>

            {newRoutineExercises.length === 0 ? (
              <View style={s.builderEmpty}>
                <Text style={s.builderEmptyText}>Tap 'Add Exercise' to build your routine template.</Text>
              </View>
            ) : (
              newRoutineExercises.map((ex, exIdx) => (
                <Card key={exIdx} style={s.builderExerciseCard}>
                  <View style={s.builderExHeader}>
                    <View>
                      <Text style={s.builderExName}>{ex.name}</Text>
                      <Text style={s.builderExMeta}>{ex.muscleGroup}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveExerciseFromBuilder(exIdx)}>
                      <Ionicons name="trash-outline" size={16} color={ERROR} />
                    </Pressable>
                  </View>

                  {/* Sub columns */}
                  <View style={s.builderSetRowHeader}>
                    <Text style={[s.setCell, { flex: 0.8, textAlign: 'center' }]}>SET</Text>
                    <Text style={[s.setCell, { flex: 1.5, textAlign: 'center' }]}>KG</Text>
                    <Text style={[s.setCell, { flex: 1.5, textAlign: 'center' }]}>REPS</Text>
                    <Text style={[s.setCell, { flex: 0.8 }]}></Text>
                  </View>

                  {ex.sets.map((set, setIdx) => (
                    <View key={setIdx} style={s.builderSetRow}>
                      <Text style={s.builderSetNum}>{setIdx + 1}</Text>
                      
                      <View style={{ flex: 1.5, paddingHorizontal: 4 }}>
                        <TextInput
                          keyboardType="numeric"
                          value={set.weight.toString()}
                          onChangeText={(val) => handleUpdateBuilderSet(exIdx, setIdx, { weight: parseFloat(val) || 0 })}
                          style={s.builderInput}
                          selectTextOnFocus
                        />
                      </View>

                      <View style={{ flex: 1.5, paddingHorizontal: 4 }}>
                        <TextInput
                          keyboardType="number-pad"
                          value={set.reps.toString()}
                          onChangeText={(val) => handleUpdateBuilderSet(exIdx, setIdx, { reps: parseInt(val) || 0 })}
                          style={s.builderInput}
                          selectTextOnFocus
                        />
                      </View>

                      <Pressable
                        onPress={() => handleRemoveSetFromBuilderExercise(exIdx, setIdx)}
                        style={{ flex: 0.8, alignItems: 'center' }}
                      >
                        <Ionicons name="close" size={16} color={TEXT_TERTIARY} />
                      </Pressable>
                    </View>
                  ))}

                  <Pressable onPress={() => handleAddSetToBuilderExercise(exIdx)} style={s.builderAddSet}>
                    <Text style={s.builderAddSetText}>+ Add Set</Text>
                  </Pressable>
                </Card>
              ))
            )}

            <Button
              variant="primary"
              label="Save Routine Template"
              onPress={handleSaveRoutine}
              disabled={!newRoutineName.trim() || newRoutineExercises.length === 0}
              style={{ marginTop: 16 }}
            />
          </ScrollView>

          {/* Library popup inside Builder */}
          <ExerciseLibraryModal
            visible={isBuilderLibraryOpen}
            onClose={() => setIsBuilderLibraryOpen(false)}
            onSelect={handleAddExerciseToBuilder}
          />
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: TEXT_SECONDARY },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  createBtnText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
  emptyCard: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyCardText: { color: TEXT_TERTIARY, fontSize: 13 },
  routineCard: { padding: 16, gap: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  routineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routineCardName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  routineCardDesc: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  routineCardSummary: { paddingVertical: 4 },
  routineExercisesText: { fontSize: 12, color: TEXT_TERTIARY },
  routineCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  routineCardSetCount: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  startBtn: { paddingHorizontal: 16, height: 34, borderRadius: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: TEXT_PRIMARY, fontSize: 15 },
  clearBtn: { padding: 4 },
  filterRow: { gap: 8, height: 38 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pillActive: {
    backgroundColor: ACCENT_DIM,
    borderColor: ACCENT_BORDER
  },
  pillText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  pillTextActive: { color: ACCENT, fontWeight: '700' },
  libraryCard: { paddingHorizontal: 0, paddingVertical: 4, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  exName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  exMeta: { fontSize: 11, color: TEXT_TERTIARY, marginTop: 1 },
  moreText: { textAlign: 'center', color: TEXT_TERTIARY, fontSize: 11, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },

  // Modal styles
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  modalCloseBtn: { padding: 4 },
  modalScroll: { padding: 20, gap: 16, paddingBottom: 60 },
  detailsName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  detailsPills: { flexDirection: 'row', gap: 8 },
  detailsPill: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  detailsPillText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  prCard: { padding: 14, gap: 4, backgroundColor: 'rgba(251,191,36,0.04)', borderColor: 'rgba(251,191,36,0.2)' },
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prTitle: { fontSize: 11, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.6 },
  prValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  prSubtitle: { fontSize: 12, color: TEXT_SECONDARY },
  prCardEmpty: { padding: 14, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  prCardEmptyText: { color: TEXT_TERTIARY, fontSize: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12 },
  instructionsCard: { padding: 14, gap: 10 },
  instructionRow: { flexDirection: 'row', gap: 12 },
  instructionNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' },
  instructionNumText: { fontSize: 11, color: ACCENT, fontWeight: '700' },
  instructionText: { flex: 1, fontSize: 13, lineHeight: 18, color: TEXT_SECONDARY },
  emptyHistory: { fontSize: 13, color: TEXT_TERTIARY, textAlign: 'center', paddingVertical: 10 },
  historyCard: { padding: 14, gap: 8, backgroundColor: SURFACE },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  historyDate: { fontSize: 11, color: TEXT_TERTIARY },
  historySets: { gap: 4 },
  historySetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historySetText: { fontSize: 12, color: TEXT_SECONDARY },
  historyPrBadge: { backgroundColor: ACCENT_DIM, borderColor: ACCENT_BORDER, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  historyPrText: { fontSize: 9, fontWeight: '800', color: ACCENT },

  // Builder modal
  builderScroll: { padding: 20, gap: 18, paddingBottom: 60 },
  field: { gap: 8 },
  label: { fontSize: 10, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { height: 48, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, color: TEXT_PRIMARY, fontSize: 14 },
  builderExercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExBtnText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
  builderEmpty: { height: 100, borderStyle: 'dashed', borderWidth: 1, borderColor: BORDER, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 20 },
  builderEmptyText: { color: TEXT_TERTIARY, fontSize: 12, textAlign: 'center' },
  builderExerciseCard: { padding: 14, gap: 10, backgroundColor: SURFACE },
  builderExHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  builderExName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  builderExMeta: { fontSize: 11, color: TEXT_TERTIARY },
  builderSetRowHeader: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  setCell: { fontSize: 9, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.5 },
  builderSetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  builderSetNum: { flex: 0.8, textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  builderInput: { height: 34, backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER, borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 0 },
  builderAddSet: { paddingVertical: 6, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  builderAddSetText: { color: ACCENT, fontSize: 12, fontWeight: '700' }
})
