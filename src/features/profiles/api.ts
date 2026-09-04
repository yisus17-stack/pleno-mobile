import { api } from "@convex/_generated/api";

export type AvailabilityBlock = {
  day: string;
  start: string;
  end: string;
};

export type UserProfile = {
  _id: string;
  userId: string;
  role?: string;
  age?: number;
  occupation?: string;
  availableHoursPerDay?: number;
  availableSchedule?: AvailabilityBlock[];
  workHoursPerDay?: number;
  studyHoursPerDay?: number;
  energyMorning?: number;
  energyAfternoon?: number;
  energyNight?: number;
  preferredActivities?: string[];
  distractions?: string[];
  workMethod?: string;
  personalGoals?: string[];
  learningStyle?: string;
  workloadTolerance?: number;
  declaredFieldNames?: string[];
};

export type SaveProfileArgs = Omit<Partial<UserProfile>, "_id" | "userId"> & {
  userId: string;
};

export const profilesApi = (api as unknown as {
  profiles: {
    getProfile: any;
    saveProfile: any;
  };
}).profiles;
