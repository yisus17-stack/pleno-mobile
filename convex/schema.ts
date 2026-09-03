import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    googleId: v.string(),
    name: v.string(),
    email: v.string(),
    picture: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_google_id', ['googleId'])
    .index('by_email', ['email']),

  userProfiles: defineTable({
    userId: v.string(),
    role: v.optional(v.string()),
    age: v.optional(v.number()),
    occupation: v.optional(v.string()),
    availableHoursPerDay: v.optional(v.number()),
    availableSchedule: v.optional(v.array(v.object({
      day: v.string(),
      start: v.string(),
      end: v.string(),
    }))),
    workHoursPerDay: v.optional(v.number()),
    studyHoursPerDay: v.optional(v.number()),
    energyMorning: v.optional(v.number()),
    energyAfternoon: v.optional(v.number()),
    energyNight: v.optional(v.number()),
    preferredActivities: v.optional(v.array(v.string())),
    distractions: v.optional(v.array(v.string())),
    workMethod: v.optional(v.string()),
    personalGoals: v.optional(v.array(v.string())),
    learningStyle: v.optional(v.string()),
    workloadTolerance: v.optional(v.number()),
    declaredFieldNames: v.optional(v.array(v.string())),
    averageMinutesByTaskType: v.optional(v.record(v.string(), v.number())),
    averageEstimationErrorMinutes: v.optional(v.number()),
    onTimeCompletionRate: v.optional(v.number()),
    averageActualMinutes: v.optional(v.number()),
    actualWorkloadTolerance: v.optional(v.number()),
    lastBehaviorObservedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),

  tasks: defineTable({
    userId: v.string(),
    courseWorkId: v.optional(v.string()),
    externalId: v.optional(v.string()), // Soporte para compatibilidad con documentos preexistentes
    title: v.string(),
    description: v.string(),
    dueDate: v.optional(v.number()),
    courseName: v.string(),
    status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('completed')),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    source: v.optional(v.string()),
    createdAt: v.number(),
    importanceScore: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_coursework', ['userId', 'courseWorkId']),
});
