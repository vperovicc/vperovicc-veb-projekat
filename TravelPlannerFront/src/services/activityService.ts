import api from './api';
import type { Activity, ActivityStatus } from '../models/types';

const statusMap: Record<ActivityStatus, number> = { Planned: 0, Reserved: 1, Completed: 2, Cancelled: 3 };
const reverseStatusMap: Record<number, ActivityStatus> = { 0: 'Planned', 1: 'Reserved', 2: 'Completed', 3: 'Cancelled' };

export const activityService = {
  // Use 'any' here to allow us to pass null into the time parameter safely
  create: async (planId: number, activity: any): Promise<Activity> => {
    const payload = {
      ...activity,
      time: null, // <-- THE FIX: Bypass the C# TimeSpan deserialization crash entirely
      status: statusMap[activity.status as ActivityStatus]
    };

    const res = await api.post(`/api/travel-plans/${planId}/activities`, payload);
    return { ...res.data, status: reverseStatusMap[res.data.status] };
  },

  updateStatus: async (planId: number, id: number, status: ActivityStatus): Promise<void> => {
    await api.put(`/api/travel-plans/${planId}/activities/${id}`, { status: statusMap[status] });
  },

  delete: async (planId: number, id: number): Promise<void> => {
    await api.delete(`/api/travel-plans/${planId}/activities/${id}`);
  }
};