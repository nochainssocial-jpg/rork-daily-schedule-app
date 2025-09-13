import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Staff, Participant, Chore, ChecklistItem, Schedule, Assignment, TimeSlotAssignment, ChoreAssignment, DropOffAssignment, PickupAssignment, SharedSchedule, ScheduleImportResult } from '@/types/schedule';
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
  const markUpdatesAsViewed = useCallback(async () => {
    await AsyncStorage.setItem('lastViewedVersion', APP_VERSION);
    setLastViewedVersion(APP_VERSION);
    setHasNewUpdates(false);
  }, []);

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
      console.log('Saving schedule to AsyncStorage:', {
        id: schedule.id,
        date: schedule.date,
        workingStaff: schedule.workingStaff.length,
        participants: schedule.attendingParticipants.length
      });
      
      const schedules = schedulesQuery.data || [];
      const existingIndex = schedules.findIndex((s: Schedule) => s.date === schedule.date);
      
      const isNew = existingIndex < 0;
      
      if (existingIndex >= 0) {
        schedules[existingIndex] = schedule;
        console.log('Updated existing schedule at index:', existingIndex);
      } else {
        schedules.push(schedule);
        console.log('Added new schedule, total schedules:', schedules.length);
      }
      
      // Save to AsyncStorage with error handling
      try {
        await AsyncStorage.setItem('schedules', JSON.stringify(schedules));
        console.log('Successfully saved schedules to AsyncStorage');
        
        // Verify the save by reading it back
        const savedData = await AsyncStorage.getItem('schedules');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('Verified saved schedules count:', parsedData.length);
          const savedSchedule = parsedData.find((s: any) => s.date === schedule.date);
          console.log('Verified schedule for date exists:', savedSchedule ? 'YES' : 'NO');
        }
      } catch (error) {
        console.error('Error saving schedule to AsyncStorage:', error);
        throw error;
      }
      
      // Track schedule creation/update
      const update: CategoryUpdate = {
        category: 'schedule',
        timestamp: new Date().toISOString(),
        action: isNew ? 'created' : 'updated'
      };
      
      try {
        const existingUpdates = await AsyncStorage.getItem(`categoryUpdates_${schedule.date}`);
        const updates = existingUpdates ? JSON.parse(existingUpdates) : [];
        
        // Remove any previous schedule update and add the new one
        const filteredUpdates = updates.filter((u: CategoryUpdate) => u.category !== 'schedule');
        filteredUpdates.push(update);
        
        await AsyncStorage.setItem(`categoryUpdates_${schedule.date}`, JSON.stringify(filteredUpdates));
        setCategoryUpdates(filteredUpdates);
        console.log('Updated category updates for date:', schedule.date);
      } catch (error) {
        console.error('Error saving category updates:', error);
      }
      
      return schedules;
    },
    onSuccess: async (schedules) => {
      console.log('Schedule save mutation successful, invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['schedules'] });
      await queryClient.refetchQueries({ queryKey: ['schedules'] });
      await trackCriticalUpdate('schedule_saved');
      console.log('Queries invalidated and refetched');
    },
    onError: (error) => {
      console.error('Schedule save mutation failed:', error);
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
    console.log('Creating new schedule for date:', selectedDate);
    console.log('Working staff:', workingStaff.length);
    console.log('Attending participants:', attendingParticipants.length);
    
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

    console.log('Schedule created with ID:', schedule.id);
    setCurrentSchedule(schedule);
    saveScheduleMutation.mutate(schedule);
  };

  const getScheduleForDate = useCallback((date: string): Schedule | null => {
    const schedules = schedulesQuery.data || [];
    return schedules.find((s: Schedule) => s.date === date) || null;
  }, [schedulesQuery.data]);
  
  const updateCategory = async (category: string, schedule: Schedule) => {
    console.log('Updating category:', category, 'for date:', schedule.date);
    
    try {
      // Save the schedule with improved error handling
      await saveScheduleMutation.mutateAsync(schedule);
      console.log('Schedule saved successfully for category update:', category);
      
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
      
      console.log('Category update tracked successfully:', category);
    } catch (error) {
      console.error('Error updating category:', category, error);
      throw error;
    }
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

  // Refresh all data function with improved reliability
  const refreshAllData = async () => {
    console.log('=== STARTING DATA REFRESH ===');
    console.log('Current selected date:', selectedDate);
    
    try {
      // First, clear all query cache to force fresh data load
      console.log('Clearing query cache...');
      queryClient.clear();
      
      // Wait a moment for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force refetch all queries with fresh data from AsyncStorage
      console.log('Refetching all queries...');
      const refreshPromises = [
        queryClient.refetchQueries({ queryKey: ['staff'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['participants'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['chores'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['checklist'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['schedules'], type: 'active' })
      ];
      
      await Promise.all(refreshPromises);
      console.log('All queries refetched successfully');
      
      // Wait for React Query to propagate the changes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reload category updates for current date
      console.log('Reloading category updates for date:', selectedDate);
      try {
        const updates = await AsyncStorage.getItem(`categoryUpdates_${selectedDate}`);
        if (updates) {
          const parsedUpdates = JSON.parse(updates);
          setCategoryUpdates(parsedUpdates);
          console.log('Category updates reloaded:', parsedUpdates.length, 'updates');
        } else {
          setCategoryUpdates([]);
          console.log('No category updates found for date:', selectedDate);
        }
      } catch (updateError) {
        console.error('Error loading category updates:', updateError);
        setCategoryUpdates([]);
      }
      
      // Verify data integrity by checking AsyncStorage directly
      console.log('Verifying data integrity...');
      try {
        const allSchedules = await AsyncStorage.getItem('schedules');
        if (allSchedules) {
          const parsedSchedules = JSON.parse(allSchedules);
          console.log('Total schedules in AsyncStorage:', parsedSchedules.length);
          console.log('Available schedule dates:', parsedSchedules.map((s: any) => s.date));
          
          const foundSchedule = parsedSchedules.find((s: any) => s.date === selectedDate);
          console.log('Schedule for current date (' + selectedDate + '):', foundSchedule ? 'FOUND' : 'NOT FOUND');
          
          if (foundSchedule) {
            console.log('Schedule details:', {
              id: foundSchedule.id,
              workingStaff: foundSchedule.workingStaff?.length || 0,
              participants: foundSchedule.attendingParticipants?.length || 0,
              hasAssignments: foundSchedule.assignments?.length || 0,
              hasFrontRoomSlots: foundSchedule.frontRoomSlots?.length || 0,
              hasChoreAssignments: foundSchedule.choreAssignments?.length || 0
            });
          }
        } else {
          console.log('No schedules found in AsyncStorage');
        }
      } catch (verifyError) {
        console.error('Error verifying data integrity:', verifyError);
      }
      
      console.log('=== DATA REFRESH COMPLETED SUCCESSFULLY ===');
      return true;
    } catch (error) {
      console.error('=== DATA REFRESH FAILED ===', error);
      setCategoryUpdates([]);
      return false;
    }
  };

  // Auto-save function for immediate persistence
  const autoSaveSchedule = useCallback(async (schedule: Schedule) => {
    console.log('Auto-saving schedule:', schedule.id);
    try {
      await saveScheduleMutation.mutateAsync(schedule);
      console.log('Schedule auto-saved successfully');
    } catch (error) {
      console.error('Error auto-saving schedule:', error);
    }
  }, [saveScheduleMutation]);
  
  // Enhanced schedule update function with immediate persistence
  const updateScheduleImmediately = useCallback(async (updatedSchedule: Schedule) => {
    console.log('Updating schedule immediately:', updatedSchedule.id);
    
    // Update local state first for immediate UI feedback
    setCurrentSchedule(updatedSchedule);
    
    // Then persist to AsyncStorage
    await autoSaveSchedule(updatedSchedule);
    
    // Force UI refresh
    await refreshAllData();
  }, [autoSaveSchedule, refreshAllData]);

  // Generate 6-digit sharing code
  const generateSharingCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Share schedule with 6-digit code
  const shareScheduleWithCode = useCallback(async (schedule: Schedule): Promise<string> => {
    console.log('Generating sharing code for schedule:', schedule.id);
    
    const code = generateSharingCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const sharedSchedule: SharedSchedule = {
      code,
      schedule,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    try {
      // Store the shared schedule with the code as key
      await AsyncStorage.setItem(`shared_${code}`, JSON.stringify(sharedSchedule));
      
      // Also maintain a list of active codes for cleanup
      const activeCodes = await AsyncStorage.getItem('active_sharing_codes');
      const codes = activeCodes ? JSON.parse(activeCodes) : [];
      codes.push({ code, expiresAt: expiresAt.toISOString() });
      await AsyncStorage.setItem('active_sharing_codes', JSON.stringify(codes));
      
      console.log('Schedule shared with code:', code);
      return code;
    } catch (error) {
      console.error('Error sharing schedule:', error);
      throw new Error('Failed to generate sharing code');
    }
  }, []);

  // Import schedule using 6-digit code
  const importScheduleWithCode = useCallback(async (code: string): Promise<ScheduleImportResult> => {
    console.log('Importing schedule with code:', code);
    
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid code format. Please enter a 6-digit code.' };
    }
    
    try {
      const sharedData = await AsyncStorage.getItem(`shared_${code}`);
      
      if (!sharedData) {
        return { success: false, error: 'Code not found. Please check the code and try again.' };
      }
      
      const sharedSchedule: SharedSchedule = JSON.parse(sharedData);
      
      // Check if code has expired
      const now = new Date();
      const expiresAt = new Date(sharedSchedule.expiresAt);
      
      if (now > expiresAt) {
        // Clean up expired code
        await AsyncStorage.removeItem(`shared_${code}`);
        return { success: false, error: 'This code has expired. Please request a new code.' };
      }
      
      // Import the schedule
      const importedSchedule = {
        ...sharedSchedule.schedule,
        id: `schedule-${selectedDate}`, // Use current date for imported schedule
        date: selectedDate
      };
      
      // Save the imported schedule
      await saveScheduleMutation.mutateAsync(importedSchedule);
      setCurrentSchedule(importedSchedule);
      
      console.log('Schedule imported successfully');
      return { success: true, schedule: importedSchedule };
    } catch (error) {
      console.error('Error importing schedule:', error);
      return { success: false, error: 'Failed to import schedule. Please try again.' };
    }
  }, [selectedDate, saveScheduleMutation]);

  // Clean up expired sharing codes
  const cleanupExpiredCodes = useCallback(async () => {
    try {
      const activeCodes = await AsyncStorage.getItem('active_sharing_codes');
      if (!activeCodes) return;
      
      const codes = JSON.parse(activeCodes);
      const now = new Date();
      const validCodes = [];
      
      for (const codeInfo of codes) {
        const expiresAt = new Date(codeInfo.expiresAt);
        if (now <= expiresAt) {
          validCodes.push(codeInfo);
        } else {
          // Remove expired shared schedule
          await AsyncStorage.removeItem(`shared_${codeInfo.code}`);
        }
      }
      
      await AsyncStorage.setItem('active_sharing_codes', JSON.stringify(validCodes));
      console.log('Cleaned up expired sharing codes');
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }, []);

  // Run cleanup on app start
  useEffect(() => {
    cleanupExpiredCodes();
  }, [cleanupExpiredCodes]);

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
    autoSaveSchedule,
    updateScheduleImmediately,
    
    // Save functions
    saveStaff: saveStaffMutation.mutate,
    saveParticipants: saveParticipantsMutation.mutate,
    saveChores: saveChoresMutation.mutate,
    saveChecklist: saveChecklistMutation.mutate,
    regenerateAssignments,
    updateWorkingStaffWithNewStaff,
    
    // Sharing functions
    shareScheduleWithCode,
    importScheduleWithCode,
    cleanupExpiredCodes
  };
});