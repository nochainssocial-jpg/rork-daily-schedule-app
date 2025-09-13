import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Staff, Participant, Chore, ChecklistItem, Schedule, Assignment, TimeSlotAssignment, ChoreAssignment, DropOffAssignment, PickupAssignment } from '@/types/schedule';
import { DEFAULT_STAFF, DEFAULT_PARTICIPANTS, DEFAULT_CHORES, DEFAULT_CHECKLIST, TIME_SLOTS } from '@/constants/data';

// App version tracking for critical updates
const APP_VERSION = '1.2.0';
const LAST_CRITICAL_UPDATE = new Date().toISOString();

interface CategoryUpdate {
  category: string;
  timestamp: string;
  action: 'created' | 'updated';
}

export const [ScheduleProvider, useSchedule] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [scheduleStep, setScheduleStep] = useState<number>(0);
  const [appVersion, setAppVersion] = useState<string>(APP_VERSION);
  const [lastViewedVersion, setLastViewedVersion] = useState<string>('');
  const [hasNewUpdates, setHasNewUpdates] = useState<boolean>(false);
  const [categoryUpdates, setCategoryUpdates] = useState<CategoryUpdate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Get current date in Sydney timezone
    try {
      const now = new Date();
      // Use a more robust date formatting approach
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error getting date:', error);
      // Fallback to a safe date format
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
  });

  // Check for app updates and load category updates
  useEffect(() => {
    const checkAppVersion = async () => {
      const storedVersion = await AsyncStorage.getItem('lastViewedVersion');
      setLastViewedVersion(storedVersion || '');
      
      if (storedVersion !== APP_VERSION) {
        setHasNewUpdates(true);
      }
      
      // Load category updates for current date
      const updates = await AsyncStorage.getItem(`categoryUpdates_${selectedDate}`);
      if (updates) {
        setCategoryUpdates(JSON.parse(updates));
      }
    };
    checkAppVersion();
  }, [selectedDate]);

  // Mark updates as viewed
  const markUpdatesAsViewed = async () => {
    await AsyncStorage.setItem('lastViewedVersion', APP_VERSION);
    setLastViewedVersion(APP_VERSION);
    setHasNewUpdates(false);
  };

  // Update selected date when day changes
  useEffect(() => {
    const checkDateChange = () => {
      try {
        const now = new Date();
        // Use a more robust date formatting approach
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDateString = `${year}-${month}-${day}`;
        
        if (currentDateString !== selectedDate) {
          setSelectedDate(currentDateString);
        }
      } catch (error) {
        console.error('Error checking date change:', error);
      }
    };

    // Check immediately
    checkDateChange();

    // Check every minute
    const interval = setInterval(checkDateChange, 60000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  // Load staff data
  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('staff');
      return stored ? JSON.parse(stored) : DEFAULT_STAFF;
    }
  });

  // Load participants data
  const participantsQuery = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('participants');
      return stored ? JSON.parse(stored) : DEFAULT_PARTICIPANTS;
    }
  });

  // Load chores data
  const choresQuery = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('chores');
      return stored ? JSON.parse(stored) : DEFAULT_CHORES;
    }
  });

  // Load checklist data
  const checklistQuery = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('checklist');
      return stored ? JSON.parse(stored) : DEFAULT_CHECKLIST;
    }
  });

  // Load schedules data
  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('schedules');
      return stored ? JSON.parse(stored) : [];
    }
  });

  // Track critical updates
  const trackCriticalUpdate = async (updateType: string) => {
    const updates = await AsyncStorage.getItem('criticalUpdates') || '[]';
    const parsedUpdates = JSON.parse(updates);
    parsedUpdates.push({
      type: updateType,
      timestamp: new Date().toISOString(),
      version: APP_VERSION
    });
    await AsyncStorage.setItem('criticalUpdates', JSON.stringify(parsedUpdates));
    setHasNewUpdates(true);
  };

  // Save mutations
  const saveStaffMutation = useMutation({
    mutationFn: async (staff: Staff[]) => {
      const previousStaff = staffQuery.data || [];
      await AsyncStorage.setItem('staff', JSON.stringify(staff));
      
      // Find newly added staff
      const newStaffIds = staff
        .filter(s => !previousStaff.find((ps: Staff) => ps.id === s.id))
        .map(s => s.id);
      
      return { staff, newStaffIds };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      
      // If new staff were added, make them available for selection in existing schedules
      if (data.newStaffIds.length > 0) {
        // Note: We don't automatically add them to working staff as that should be user's choice
        // But they will be available for selection in future schedule creation
        console.log(`Added ${data.newStaffIds.length} new staff members`);
        await trackCriticalUpdate('staff_added');
      }
    }
  });

  const saveParticipantsMutation = useMutation({
    mutationFn: async (participants: Participant[]) => {
      await AsyncStorage.setItem('participants', JSON.stringify(participants));
      return participants;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      await trackCriticalUpdate('participants_updated');
    }
  });

  const saveChoresMutation = useMutation({
    mutationFn: async (chores: Chore[]) => {
      await AsyncStorage.setItem('chores', JSON.stringify(chores));
      return chores;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      await trackCriticalUpdate('chores_updated');
    }
  });

  const saveChecklistMutation = useMutation({
    mutationFn: async (checklist: ChecklistItem[]) => {
      await AsyncStorage.setItem('checklist', JSON.stringify(checklist));
      return checklist;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      await trackCriticalUpdate('checklist_updated');
    }
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (schedule: Schedule) => {
      const schedules = schedulesQuery.data || [];
      const existingIndex = schedules.findIndex((s: Schedule) => s.date === schedule.date);
      
      const isNew = existingIndex < 0;
      
      if (existingIndex >= 0) {
        schedules[existingIndex] = schedule;
      } else {
        schedules.push(schedule);
      }
      
      await AsyncStorage.setItem('schedules', JSON.stringify(schedules));
      
      // Track schedule creation
      if (isNew) {
        const update: CategoryUpdate = {
          category: 'schedule',
          timestamp: new Date().toISOString(),
          action: 'created'
        };
        const updates = [update];
        await AsyncStorage.setItem(`categoryUpdates_${schedule.date}`, JSON.stringify(updates));
        setCategoryUpdates(updates);
      }
      
      return schedules;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      await trackCriticalUpdate('schedule_saved');
    }
  });

  // Helper functions
  const generateTimeSlotAssignments = (workingStaffIds: string[]): {
    frontRoom: TimeSlotAssignment[];
    scotty: TimeSlotAssignment[];
    twins: TimeSlotAssignment[];
  } => {
    const staff = staffQuery.data || [];
    // Filter out 'Everyone', 'Drive/Outing', and 'Audit' from auto-assignments
    const excludedNames = ['Everyone', 'Drive/Outing', 'Audit'];
    const availableStaff = staff.filter((s: Staff) => 
      workingStaffIds.includes(s.id) && !excludedNames.includes(s.name)
    );
    
    // Filter out Antoinette before 2pm for initial slots
    const getAvailableStaffForSlot = (timeSlotId: string) => {
      const antoinette = availableStaff.find((s: Staff) => s.isTeamLeader);
      if (antoinette && parseInt(timeSlotId) < 9) { // Before 2pm (slot 9 is 2:00pm-2:30pm)
        return availableStaff.filter((s: Staff) => s.id !== antoinette.id);
      }
      return availableStaff;
    };

    const frontRoom: TimeSlotAssignment[] = [];
    const scotty: TimeSlotAssignment[] = [];
    const twins: TimeSlotAssignment[] = [];

    const usedStaffPerSlot: { [key: string]: string[] } = {};

    TIME_SLOTS.forEach(slot => {
      const availableForSlot = getAvailableStaffForSlot(slot.id);
      
      // Track which staff are used in this time slot across all categories
      usedStaffPerSlot[slot.id] = [];

      // Assign to Front Room
      const availableForFrontRoom = availableForSlot.filter((s: Staff) => 
        !usedStaffPerSlot[slot.id].includes(s.id)
      );
      if (availableForFrontRoom.length > 0) {
        const randomStaff = availableForFrontRoom[Math.floor(Math.random() * availableForFrontRoom.length)];
        frontRoom.push({ timeSlotId: slot.id, staffId: randomStaff.id });
        usedStaffPerSlot[slot.id].push(randomStaff.id);
      }

      // Assign to Scotty
      const availableForScotty = availableForSlot.filter((s: Staff) => 
        !usedStaffPerSlot[slot.id].includes(s.id)
      );
      if (availableForScotty.length > 0) {
        const randomStaff = availableForScotty[Math.floor(Math.random() * availableForScotty.length)];
        scotty.push({ timeSlotId: slot.id, staffId: randomStaff.id });
        usedStaffPerSlot[slot.id].push(randomStaff.id);
      }

      // Assign to Twins
      const availableForTwins = availableForSlot.filter((s: Staff) => 
        !usedStaffPerSlot[slot.id].includes(s.id)
      );
      if (availableForTwins.length > 0) {
        const randomStaff = availableForTwins[Math.floor(Math.random() * availableForTwins.length)];
        twins.push({ timeSlotId: slot.id, staffId: randomStaff.id });
        usedStaffPerSlot[slot.id].push(randomStaff.id);
      }
    });

    return { frontRoom, scotty, twins };
  };

  const generateChoreAssignments = (workingStaffIds: string[]): ChoreAssignment[] => {
    const chores = choresQuery.data || [];
    const staff = staffQuery.data || [];
    const assignments: ChoreAssignment[] = [];
    
    // Filter out 'Everyone', 'Drive/Outing', and 'Audit' from auto-assignments
    const excludedNames = ['Everyone', 'Drive/Outing', 'Audit'];
    const validStaffIds = workingStaffIds.filter(id => {
      const staffMember = staff.find((s: Staff) => s.id === id);
      return staffMember && !excludedNames.includes(staffMember.name);
    });

    chores.forEach((chore: Chore) => {
      if (validStaffIds.length > 0) {
        const randomStaffId = validStaffIds[Math.floor(Math.random() * validStaffIds.length)];
        assignments.push({ choreId: chore.id, staffId: randomStaffId });
      }
    });

    return assignments;
  };

  const createSchedule = (
    workingStaff: string[],
    attendingParticipants: string[],
    assignments: Assignment[],
    finalChecklistStaff: string
  ) => {
    const timeSlotAssignments = generateTimeSlotAssignments(workingStaff);
    const choreAssignments = generateChoreAssignments(workingStaff);

    const schedule: Schedule = {
      id: `schedule-${selectedDate}`,
      date: selectedDate,
      workingStaff,
      attendingParticipants,
      assignments,
      frontRoomSlots: timeSlotAssignments.frontRoom,
      scottySlots: timeSlotAssignments.scotty,
      twinsSlots: timeSlotAssignments.twins,
      choreAssignments,
      finalChecklistStaff,
      dropOffs: [] as DropOffAssignment[],
      pickups: [] as PickupAssignment[]
    };

    setCurrentSchedule(schedule);
    saveScheduleMutation.mutate(schedule);
  };

  const getScheduleForDate = useCallback((date: string): Schedule | null => {
    const schedules = schedulesQuery.data || [];
    return schedules.find((s: Schedule) => s.date === date) || null;
  }, [schedulesQuery.data]);
  
  const updateCategory = async (category: string, schedule: Schedule) => {
    // Save the schedule
    await saveScheduleMutation.mutateAsync(schedule);
    
    // Track category update
    const update: CategoryUpdate = {
      category,
      timestamp: new Date().toISOString(),
      action: 'updated'
    };
    
    const existingUpdates = await AsyncStorage.getItem(`categoryUpdates_${schedule.date}`);
    const updates = existingUpdates ? JSON.parse(existingUpdates) : [];
    
    // Remove any previous update for the same category and add the new one
    const filteredUpdates = updates.filter((u: CategoryUpdate) => u.category !== category);
    filteredUpdates.push(update);
    
    await AsyncStorage.setItem(`categoryUpdates_${schedule.date}`, JSON.stringify(filteredUpdates));
    setCategoryUpdates(filteredUpdates);
  };

  // Regenerate assignments with updated staff
  const regenerateAssignments = (scheduleId: string) => {
    const schedules = schedulesQuery.data || [];
    const schedule = schedules.find((s: Schedule) => s.id === scheduleId);
    if (schedule) {
      const timeSlotAssignments = generateTimeSlotAssignments(schedule.workingStaff);
      const choreAssignments = generateChoreAssignments(schedule.workingStaff);
      
      const updatedSchedule: Schedule = {
        ...schedule,
        frontRoomSlots: timeSlotAssignments.frontRoom,
        scottySlots: timeSlotAssignments.scotty,
        twinsSlots: timeSlotAssignments.twins,
        choreAssignments
      };
      
      saveScheduleMutation.mutate(updatedSchedule);
    }
  };

  // Update working staff to include newly added staff
  const updateWorkingStaffWithNewStaff = (newStaffIds: string[]) => {
    const schedules = schedulesQuery.data || [];
    const updatedSchedules = schedules.map((schedule: Schedule) => {
      // Add new staff to working staff list if they're not already included
      const updatedWorkingStaff = [...schedule.workingStaff];
      newStaffIds.forEach(staffId => {
        if (!updatedWorkingStaff.includes(staffId)) {
          updatedWorkingStaff.push(staffId);
        }
      });
      
      // Always return the schedule object, either updated or unchanged
      return {
        ...schedule,
        workingStaff: updatedWorkingStaff
      };
    });
    
    // Save updated schedules if there were changes
    const hasChanges = updatedSchedules.some((schedule: Schedule, index: number) => 
      schedule.workingStaff.length !== schedules[index].workingStaff.length
    );
    
    if (hasChanges) {
      AsyncStorage.setItem('schedules', JSON.stringify(updatedSchedules));
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  };

  // Refresh all data function
  const refreshAllData = async () => {
    console.log('Refreshing all data from AsyncStorage...');
    
    try {
      // First, invalidate all queries to force fresh data fetch from AsyncStorage
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff'] }),
        queryClient.invalidateQueries({ queryKey: ['participants'] }),
        queryClient.invalidateQueries({ queryKey: ['chores'] }),
        queryClient.invalidateQueries({ queryKey: ['checklist'] }),
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
      ]);
      
      // Wait for queries to refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['staff'] }),
        queryClient.refetchQueries({ queryKey: ['participants'] }),
        queryClient.refetchQueries({ queryKey: ['chores'] }),
        queryClient.refetchQueries({ queryKey: ['checklist'] }),
        queryClient.refetchQueries({ queryKey: ['schedules'] })
      ]);
      
      // Reload category updates for current date
      const updates = await AsyncStorage.getItem(`categoryUpdates_${selectedDate}`);
      if (updates) {
        setCategoryUpdates(JSON.parse(updates));
        console.log('Category updates reloaded:', JSON.parse(updates));
      } else {
        setCategoryUpdates([]);
        console.log('No category updates found for date:', selectedDate);
      }
      
      console.log('Data refresh completed successfully');
    } catch (error) {
      console.error('Error during data refresh:', error);
      setCategoryUpdates([]);
    }
  };

  return {
    // Data
    staff: staffQuery.data || [],
    participants: participantsQuery.data || [],
    chores: choresQuery.data || [],
    checklist: checklistQuery.data || [],
    schedules: schedulesQuery.data || [],
    timeSlots: TIME_SLOTS,
    
    // Current state
    currentSchedule,
    scheduleStep,
    selectedDate,
    appVersion,
    lastViewedVersion,
    hasNewUpdates,
    categoryUpdates,
    
    // Loading states
    isLoading: staffQuery.isLoading || participantsQuery.isLoading || choresQuery.isLoading || checklistQuery.isLoading,
    
    // Actions
    setScheduleStep,
    setSelectedDate,
    setCurrentSchedule,
    createSchedule,
    getScheduleForDate,
    updateCategory,
    markUpdatesAsViewed,
    refreshAllData,
    
    // Save functions
    saveStaff: saveStaffMutation.mutate,
    saveParticipants: saveParticipantsMutation.mutate,
    saveChores: saveChoresMutation.mutate,
    saveChecklist: saveChecklistMutation.mutate,
    regenerateAssignments,
    updateWorkingStaffWithNewStaff
  };
});