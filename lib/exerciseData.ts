export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'
export type EquipmentType = 'Barbell' | 'Dumbbell' | 'Cables' | 'Machine' | 'Bodyweight' | 'Kettlebell'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: EquipmentType
  instructions: string[]
  isCustom?: boolean
}

export const PRESEEDED_EXERCISES: Exercise[] = [
  // ── CHEST ──
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    instructions: [
      'Lie flat on the bench, feet flat on the floor.',
      'Grip the bar slightly wider than shoulder-width.',
      'Unrack the bar and lower it slowly to your mid-chest.',
      'Push the bar back up forcefully while keeping your elbows tucked at ~45 degrees.'
    ]
  },
  {
    id: 'db-bench-press',
    name: 'Dumbbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
    instructions: [
      'Sit on a flat bench with dumbbells on your knees.',
      'Lie back, raising the dumbbells over your chest with arms fully extended.',
      'Lower the weights slowly to the sides of your chest.',
      'Press the dumbbells back up to the starting position.'
    ]
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
    instructions: [
      'Set an incline bench to approximately 30-45 degrees.',
      'Lie back and hold the dumbbells over your chest.',
      'Lower the dumbbells in a controlled motion to your upper chest.',
      'Press the dumbbells back up to lockout.'
    ]
  },
  {
    id: 'chest-flys',
    name: 'Dumbbell Chest Flys',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
    instructions: [
      'Lie flat on a bench, dumbbells held above your chest with palms facing each other.',
      'Lower your arms out to the sides in a wide arc, keeping a slight bend in your elbows.',
      'Squeeze your chest to bring the dumbbells back to the starting position.'
    ]
  },
  {
    id: 'dips-chest',
    name: 'Chest Dips',
    muscleGroup: 'Chest',
    equipment: 'Bodyweight',
    instructions: [
      'Grab the parallel dip bars and lift yourself up.',
      'Lean your torso forward slightly to target the chest.',
      'Lower your body by bending your arms until shoulders are below elbows.',
      'Push back up to the starting position.'
    ]
  },

  // ── BACK ──
  {
    id: 'deadlift',
    name: 'Barbell Deadlift',
    muscleGroup: 'Back',
    equipment: 'Barbell',
    instructions: [
      'Stand with feet hip-width apart, shins close to the bar.',
      'Bend at your hips and knees, grabbing the bar with a shoulder-width grip.',
      'Flatten your spine and engage your lat muscles.',
      'Drive through your heels to stand up, pushing hips forward at the top.'
    ]
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    muscleGroup: 'Back',
    equipment: 'Bodyweight',
    instructions: [
      'Grip the pull-up bar with palms facing away, slightly wider than shoulder-width.',
      'Pull your chest up toward the bar, leading with your elbows.',
      'Squeeze your shoulder blades at the top, then lower yourself slowly.'
    ]
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscleGroup: 'Back',
    equipment: 'Machine',
    instructions: [
      'Sit at a lat pulldown machine and adjust the knee pads.',
      'Grip the bar wide and pull it down towards your upper chest.',
      'Keep your back slightly arched and elbows pointing down.',
      'Slowly return the bar to the top.'
    ]
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    muscleGroup: 'Back',
    equipment: 'Barbell',
    instructions: [
      'Hold a barbell with palms facing down, hinge forward from the hips at 45 degrees.',
      'Pull the barbell to your lower chest, keeping your elbows close to your body.',
      'Squeeze your back muscles, then lower the bar slowly.'
    ]
  },
  {
    id: 'cable-row',
    name: 'Seated Cable Row',
    muscleGroup: 'Back',
    equipment: 'Cables',
    instructions: [
      'Sit at the seated row machine, feet on platforms, knees slightly bent.',
      'Grip the handle and sit upright with a flat back.',
      'Pull the handle to your abdomen, squeezing your shoulder blades.',
      'Extend your arms fully to return.'
    ]
  },

  // ── LEGS ──
  {
    id: 'back-squat',
    name: 'Barbell Back Squat',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    instructions: [
      'Rest the barbell on your upper back / traps.',
      'Set your feet shoulder-width apart, toes pointed slightly out.',
      'Squat down by hinging at the hips and bending knees, keeping chest up.',
      'Go down until thighs are parallel to the floor, then drive up through your mid-foot.'
    ]
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    instructions: [
      'Sit in the leg press machine, feet shoulder-width apart on the sled.',
      'Lower the weight platform slowly by bending your knees to ~90 degrees.',
      'Push the platform away by extending your legs, avoiding locking your knees.'
    ]
  },
  {
    id: 'romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift',
    muscleGroup: 'Legs',
    equipment: 'Dumbbell',
    instructions: [
      'Stand holding dumbbells in front of your thighs.',
      'Keep a flat back and a slight bend in your knees.',
      'Hinge forward at the hips, pushing them back to lower the weights down your legs.',
      'Squeeze glutes and hamstrings to return upright.'
    ]
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'Legs',
    equipment: 'Dumbbell',
    instructions: [
      'Stand a stride in front of a bench, placing one foot behind you on the bench.',
      'Hold dumbbells at your sides and lower your hips until rear knee is near the floor.',
      'Drive through your front heel to return to the starting position.'
    ]
  },
  {
    id: 'leg-extension',
    name: 'Leg Extensions',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    instructions: [
      'Sit on the extension machine, shins tucked behind the roller pad.',
      'Extend your legs fully, contracting your quadriceps at the top.',
      'Lower the weights under control to the start.'
    ]
  },

  // ── SHOULDERS ──
  {
    id: 'overhead-press',
    name: 'Barbell Overhead Press',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
    instructions: [
      'Stand with barbell racked on your front shoulders.',
      'Brace your core, squeeze your glutes, and press the bar straight up overhead.',
      'Push your head slightly forward at lockout.',
      'Lower the bar back to your upper chest under control.'
    ]
  },
  {
    id: 'db-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    instructions: [
      'Sit on a bench with back support, holding dumbbells at shoulder level.',
      'Press the dumbbells straight up until arms are fully extended.',
      'Lower the dumbbells slowly to shoulder height.'
    ]
  },
  {
    id: 'lateral-raise',
    name: 'Dumbbell Lateral Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    instructions: [
      'Stand tall holding dumbbells at your sides, palms facing inward.',
      'Raise your arms out to the sides, keeping a slight bend in your elbows.',
      'Stop when your arms are parallel to the floor, then lower slowly.'
    ]
  },
  {
    id: 'face-pull',
    name: 'Cable Face Pull',
    muscleGroup: 'Shoulders',
    equipment: 'Cables',
    instructions: [
      'Set cable pulley to upper chest height with rope attachment.',
      'Hold rope ends with thumbs pointing back, step back to create tension.',
      'Pull the rope towards your face, flaring elbows and pulling rope ends apart.',
      'Return slowly to starting position.'
    ]
  },

  // ── ARMS ──
  {
    id: 'bicep-curl',
    name: 'Dumbbell Bicep Curl',
    muscleGroup: 'Arms',
    equipment: 'Dumbbell',
    instructions: [
      'Stand tall holding dumbbells, palms facing forward, elbows close to sides.',
      'Curl the weights up while keeping your upper arms stationary.',
      'Squeeze biceps at the top, then lower back down.'
    ]
  },
  {
    id: 'hammer-curl',
    name: 'Dumbbell Hammer Curl',
    muscleGroup: 'Arms',
    equipment: 'Dumbbell',
    instructions: [
      'Stand holding dumbbells at your sides, palms facing each other (neutral grip).',
      'Curl the dumbbells up, maintaining the neutral grip.',
      'Squeeze your forearms and biceps, then lower.'
    ]
  },
  {
    id: 'tricep-pushdown',
    name: 'Cable Tricep Pushdown',
    muscleGroup: 'Arms',
    equipment: 'Cables',
    instructions: [
      'Grip the rope attachment on a high cable pulley.',
      'Tuck your elbows to your sides and lean forward slightly.',
      'Push the rope down, extending your elbows fully and separating rope ends.',
      'Slowly return to elbow flexion.'
    ]
  },
  {
    id: 'skull-crusher',
    name: 'EZ-Bar Skull Crusher',
    muscleGroup: 'Arms',
    equipment: 'Barbell',
    instructions: [
      'Lie on a bench holding an EZ bar over your chest.',
      'Hinge at the elbows to lower the bar towards your forehead.',
      'Keep your upper arms locked perpendicular to the bench.',
      'Extend elbows back to starting position.'
    ]
  },

  // ── CORE ──
  {
    id: 'plank',
    name: 'Plank',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    instructions: [
      'Place forearms on the floor, elbows under shoulders.',
      'Extend legs straight behind you, toes tucked, body forming a straight line.',
      'Brace your core, squeeze glutes, and hold this position.'
    ]
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    instructions: [
      'Hang from a pull-up bar with arms straight.',
      'Keep your legs straight and lift them up until parallel to the floor.',
      'Lower them slowly, avoiding swinging.'
    ]
  },
  {
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    muscleGroup: 'Core',
    equipment: 'Bodyweight',
    instructions: [
      'Kneel on the floor, holding the ab wheel handles.',
      'Roll the wheel forward, extending your body as far as you can without arching back.',
      'Contract your abs to pull yourself back to the starting position.'
    ]
  }
]
