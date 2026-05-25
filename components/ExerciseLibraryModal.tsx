import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Modal, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { workoutDb, type LeaderboardUser } from '@/lib/workoutDb'
import { type Exercise, MuscleGroup, EquipmentType } from '@/lib/exerciseData'
import { BG, SURFACE, SURFACE2, BORDER, ACCENT, ACCENT_DIM, ACCENT_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/lib/theme'

interface ExerciseLibraryModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const EQUIPMENTS: EquipmentType[] = ['Barbell', 'Dumbbell', 'Cables', 'Machine', 'Bodyweight', 'Kettlebell']

export default function ExerciseLibraryModal({ visible, onClose, onSelect }: ExerciseLibraryModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  
  // Custom exercise creation state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Chest')
  const [customEquip, setCustomEquip] = useState<EquipmentType>('Dumbbell')

  useEffect(() => {
    if (visible) {
      loadExercises()
      setIsCreatingCustom(false)
      setCustomName('')
      setSearch('')
      setSelectedMuscle(null)
    }
  }, [visible])

  const loadExercises = async () => {
    const list = await workoutDb.getExercises()
    setExercises(list)
  }

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = selectedMuscle ? ex.muscleGroup === selectedMuscle : true
    return matchesSearch && matchesMuscle
  })

  const handleCreateCustom = async () => {
    if (!customName.trim()) return
    const newEx = await workoutDb.addCustomExercise({
      name: customName.trim(),
      muscleGroup: customMuscle,
      equipment: customEquip,
      instructions: ['Custom user exercise.']
    })
    onSelect(newEx)
    setIsCreatingCustom(false)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{isCreatingCustom ? 'New Exercise' : 'Add Exercise'}</Text>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {!isCreatingCustom ? (
          <>
            {/* Search Bar */}
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color={TEXT_TERTIARY} style={s.searchIcon} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search exercises..."
                placeholderTextColor={TEXT_TERTIARY}
                style={s.searchInput}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} style={s.clearBtn}>
                  <Ionicons name="close-circle" size={16} color={TEXT_SECONDARY} />
                </Pressable>
              ) : null}
            </View>

            {/* Muscle Group Horizontal Pills */}
            <View style={s.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsWrap}>
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
            </View>

            {/* Exercise List */}
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.listContent}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [s.exerciseRow, pressed && { backgroundColor: SURFACE2 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.exerciseName}>{item.name}</Text>
                    <Text style={s.exerciseMeta}>
                      {item.muscleGroup} · <Text style={{ color: TEXT_TERTIARY }}>{item.equipment}</Text>
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={18} color={TEXT_TERTIARY} />
                </Pressable>
              )}
              ListFooterComponent={
                <Pressable
                  onPress={() => setIsCreatingCustom(true)}
                  style={s.customBtn}
                >
                  <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
                  <Text style={s.customBtnText}>Create Custom Exercise</Text>
                </Pressable>
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <View style={s.field}>
              <Text style={s.label}>EXERCISE NAME</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Incline Cable Fly"
                placeholderTextColor={TEXT_TERTIARY}
                style={s.input}
                autoFocus
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>PRIMARY MUSCLE GROUP</Text>
              <View style={s.grid}>
                {MUSCLE_GROUPS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setCustomMuscle(m)}
                    style={[s.selectorPill, customMuscle === m && s.selectorPillActive]}
                  >
                    <Text style={[s.selectorText, customMuscle === m && s.selectorTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>EQUIPMENT TYPE</Text>
              <View style={s.grid}>
                {EQUIPMENTS.map((eq) => (
                  <Pressable
                    key={eq}
                    onPress={() => setCustomEquip(eq)}
                    style={[s.selectorPill, customEquip === eq && s.selectorPillActive]}
                  >
                    <Text style={[s.selectorText, customEquip === eq && s.selectorTextActive]}>{eq}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.formButtons}>
              <Button
                variant="secondary"
                label="Back to Library"
                onPress={() => setIsCreatingCustom(false)}
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                label="Save Exercise"
                onPress={handleCreateCustom}
                disabled={!customName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER
  },
  title: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  closeBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 12,
    height: 46
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: TEXT_PRIMARY, fontSize: 15, paddingVertical: 8 },
  clearBtn: { padding: 4 },
  filterContainer: { marginTop: 12 },
  pillsWrap: { paddingHorizontal: 20, gap: 8, height: 38 },
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
  pillText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  pillTextActive: { color: ACCENT, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER
  },
  exerciseName: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  exerciseMeta: { fontSize: 12, color: TEXT_SECONDARY },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER
  },
  customBtnText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  formContent: { padding: 20, gap: 24 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8 },
  input: {
    height: 50,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: TEXT_PRIMARY,
    fontSize: 15
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER
  },
  selectorPillActive: {
    backgroundColor: ACCENT_DIM,
    borderColor: ACCENT_BORDER
  },
  selectorText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  selectorTextActive: { color: ACCENT },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 12 }
})
