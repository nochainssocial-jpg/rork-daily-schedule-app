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
  const [scheduleStep, setScheduleStep] = useState<number>(1);
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
      try {
        const storedVersion = await AsyncStorage.getItem('lastViewedVersion');
        setLastViewedVersion(storedVersion || '');
        
        if (storedVersion !== APP_VERSION) {
          setHasNewUpdates(true);
        }
        
        // Load category updates for current date
        const updates = await AsyncStorage.getItem(`categoryUpdates_${selectedDate}`);
        if (updates) {
          try {
            const trimmed = updates.trim();
            if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
              setCategoryUpdates(JSON.parse(trimmed));
            } else {
              setCategoryUpdates([]);
            }
          } catch (parseError) {
            console.error('Error parsing category updates:', parseError);
            setCategoryUpdates([]);
          }
        }
      } catch (error) {
        console.error('Error checking app version:', error);
        setLastViewedVersion('');
        setHasNewUpdates(false);
        setCategoryUpdates([]);
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

  // Update selected date when day changes - optimized to prevent excessive re-renders
  useEffect(() => {
    const checkDateChange = () => {
      try {
        const now = new Date();
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

    // Only check every 5 minutes to reduce performance impact
    const interval = setInterval(checkDateChange, 300000);

    return () => clearInterval(interval);
  }, []);  // Remove selectedDate from dependencies to prevent infinite loop

  // Load staff data
  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem('staff');
        if (!stored || stored === 'undefined' || stored === 'null') {
          console.log('No staff data found, using defaults');
          return DEFAULT_STAFF;
        }
        
        // Validate JSON before parsing
        const trimmed = stored.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          console.warn('Invalid staff data format, clearing and using defaults');
          await AsyncStorage.removeItem('staff');
          return DEFAULT_STAFF;
        }
        
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          console.warn('Staff data is not an array, using defaults');
          await AsyncStorage.removeItem('staff');
          return DEFAULT_STAFF;
        }
        
        return parsed;
      } catch (error) {
        console.error('Error parsing staff data:', error);
        await AsyncStorage.removeItem('staff');
        return DEFAULT_STAFF;
      }
    }
  });

  // Load participants data
  const participantsQuery = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem('participants');
        if (!stored || stored === 'undefined' || stored === 'null') {
          console.log('No participants data found, using defaults');
          return DEFAULT_PARTICIPANTS;
        }
        
        // Validate JSON before parsing
        const trimmed = stored.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          console.warn('Invalid participants data format, clearing and using defaults');
          await AsyncStorage.removeItem('participants');
          return DEFAULT_PARTICIPANTS;
        }
        
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          console.warn('Participants data is not an array, using defaults');
          await AsyncStorage.removeItem('participants');
          return DEFAULT_PARTICIPANTS;
        }
        
        return parsed;
      } catch (error) {
        console.error('Error parsing participants data:', error);
        await AsyncStorage.removeItem('participants');
        return DEFAULT_PARTICIPANTS;
      }
    }
  });

  // Load chores data
  const choresQuery = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem('chores');
        if (!stored || stored === 'undefined' || stored === 'null') {
          console.log('No chores data found, using defaults');
          return DEFAULT_CHORES;
        }
        
        // Validate JSON before parsing
        const trimmed = stored.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          console.warn('Invalid chores data format, clearing and using defaults');
          await AsyncStorage.removeItem('chores');
          return DEFAULT_CHORES;
        }
        
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          console.warn('Chores data is not an array, using defaults');
          await AsyncStorage.removeItem('chores');
          return DEFAULT_CHORES;
        }
        
        return parsed;
      } catch (error) {
        console.error('Error parsing chores data:', error);
        await AsyncStorage.removeItem('chores');
        return DEFAULT_CHORES;
      }
    }
  });

  // Load checklist data
  const checklistQuery = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem('checklist');
        if (!stored || stored === 'undefined' || stored === 'null') {
          console.log('No checklist data found, using defaults');
          return DEFAULT_CHECKLIST;
        }
        
        // Validate JSON before parsing
        const trimmed = stored.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          console.warn('Invalid checklist data format, clearing and using defaults');
          await AsyncStorage.removeItem('checklist');
          return DEFAULT_CHECKLIST;
        }
        
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          console.warn('Checklist data is not an array, using defaults');
          await AsyncStorage.removeItem('checklist');
          return DEFAULT_CHECKLIST;
        }
        
        return parsed;
      } catch (error) {
        console.error('Error parsing checklist data:', error);
        await AsyncStorage.removeItem('checklist');
        return DEFAULT_CHECKLIST;
      }
    }
  });

  // Load schedules data
  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      try {
        console.log('Loading schedules from AsyncStorage...');
        const stored = await AsyncStorage.getItem('schedules');
        
        if (!stored || stored === 'undefined' || stored === 'null') {
          console.log('No schedules data found in AsyncStorage, returning empty array');
          return [];
        }
        
        console.log('Raw schedules data length:', stored.length);
        
        // Validate JSON before parsing
        const trimmed = stored.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          console.warn('Invalid schedules data format, clearing and using empty array');
          await AsyncStorage.removeItem('schedules');
          return [];
        }
        
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          console.warn('Schedules data is not an array, using empty array');
          await AsyncStorage.removeItem('schedules');
          return [];
        }
        
        console.log('Successfully loaded', parsed.length, 'schedules from storage');
        if (parsed.length > 0) {
          console.log('Available schedule dates:', parsed.map((s: Schedule) => s.date));
        }
        
        return parsed;
      } catch (error) {
        console.error('Error parsing schedules data:', error);
        await AsyncStorage.removeItem('schedules');
        return [];
      }
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Track critical updates
  const trackCriticalUpdate = async (updateType: string) => {
    try {
      const updates = await AsyncStorage.getItem('criticalUpdates') || '[]';
      let parsedUpdates = [];
      
      try {
        const trimmed = updates.trim();
        if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
          parsedUpdates = JSON.parse(trimmed);
        }
      } catch (parseError) {
        console.error('Error parsing critical updates, starting fresh:', parseError);
        parsedUpdates = [];
      }
      
      parsedUpdates.push({
        type: updateType,
        timestamp: new Date().toISOString(),
        version: APP_VERSION
      });
      
      await AsyncStorage.setItem('criticalUpdates', JSON.stringify(parsedUpdates));
      setHasNewUpdates(true);
    } catch (error) {
      console.error('Error tracking critical update:', error);
    }
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
      console.log('Saving schedule for date:', schedule.date);
      
      // Get current schedules directly from AsyncStorage to ensure we have the latest data
      let currentSchedules: Schedule[] = [];
      try {
        const stored = await AsyncStorage.getItem('schedules');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          const trimmed = stored.trim();
          if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
            currentSchedules = JSON.parse(trimmed);
            if (!Array.isArray(currentSchedules)) {
              currentSchedules = [];
            }
          }
        }
      } catch (error) {
        console.error('Error reading current schedules:', error);
        currentSchedules = schedulesQuery.data || [];
      }
      
      const existingIndex = currentSchedules.findIndex((s: Schedule) => s.date === schedule.date);
      
      const isNew = existingIndex < 0;
      
      if (existingIndex >= 0) {
        currentSchedules[existingIndex] = schedule;
        console.log('Updated existing schedule at index:', existingIndex);
      } else {
        currentSchedules.push(schedule);
        console.log('Added new schedule, total schedules:', currentSchedules.length);
      }
      
      // Save to AsyncStorage with error handling
      try {
        const schedulesJson = JSON.stringify(currentSchedules);
        
        // Validate the JSON before saving
        if (!schedulesJson || schedulesJson === 'undefined' || schedulesJson === 'null' || schedulesJson.trim() === '') {
          throw new Error('Invalid schedules data to save');
        }
        
        // Test parse to ensure valid JSON
        try {
          JSON.parse(schedulesJson);
        } catch (parseError) {
          console.error('Generated invalid JSON for schedules:', parseError);
          throw new Error('Generated invalid JSON for schedules');
        }
        
        await AsyncStorage.setItem('schedules', schedulesJson);
        console.log('Successfully saved schedules to AsyncStorage');
        
        // Verify the save
        const verification = await AsyncStorage.getItem('schedules');
        if (verification) {
          const verifiedSchedules = JSON.parse(verification);
          console.log('Verification: Saved', verifiedSchedules.length, 'schedules to storage');
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
        let updates = [];
        
        if (existingUpdates) {
          try {
            const trimmed = existingUpdates.trim();
            if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
              updates = JSON.parse(trimmed);
            }
          } catch (parseError) {
            console.error('Error parsing existing category updates:', parseError);
            updates = [];
          }
        }
        
        // Remove any previous schedule update and add the new one
        const filteredUpdates = updates.filter((u: CategoryUpdate) => u.category !== 'schedule');
        filteredUpdates.push(update);
        
        await AsyncStorage.setItem(`categoryUpdates_${schedule.date}`, JSON.stringify(filteredUpdates));
        setCategoryUpdates(filteredUpdates);
      } catch (error) {
        console.error('Error saving category updates:', error);
      }
      
      return currentSchedules;
    },
    onSuccess: async (schedules) => {
      console.log('Schedule mutation succeeded, invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['schedules'] });
      await trackCriticalUpdate('schedule_saved');
      
      // Force a refetch to ensure UI is updated
      await queryClient.refetchQueries({ queryKey: ['schedules'] });
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
    const participants = participantsQuery.data || [];
    
    // Filter out 'Everyone', 'Drive/Outing', and 'Audit' from auto-assignments
    const excludedNames = ['Everyone', 'Drive/Outing', 'Audit'];
    const availableStaff = staff.filter((s: Staff) => 
      workingStaffIds.includes(s.id) && !excludedNames.includes(s.name)
    );
    
    // Check if twins (Zara and Zoya) are attending
    const zara = participants.find((p: Participant) => p.name === 'Zara');
    const zoya = participants.find((p: Participant) => p.name === 'Zoya');
    const twinsAttending = (zara && workingStaffIds.includes(zara.id)) || (zoya && workingStaffIds.includes(zoya.id));
    
    // Filter out Antoinette before 1:30pm (slot 8 is 1:30pm-2:00pm)
    const getAvailableStaffForSlot = (timeSlotId: string) => {
      const antoinette = availableStaff.find((s: Staff) => s.isTeamLeader);
      if (antoinette && parseInt(timeSlotId) < 8) { // Before 1:30pm (slot 8 is 1:30pm-2:00pm)
        return availableStaff.filter((s: Staff) => s.id !== antoinette.id);
      }
      return availableStaff;
    };

    const frontRoom: TimeSlotAssignment[] = [];
    const scotty: TimeSlotAssignment[] = [];
    const twins: TimeSlotAssignment[] = [];

    // Track staff assignments across all slots and categories for better distribution
    const staffAssignmentCount: { [staffId: string]: number } = {};
    const staffAssignments: { [staffId: string]: string[] } = {}; // staffId -> [timeSlotIds]
    const usedStaffPerSlot: { [key: string]: string[] } = {}; // timeSlotId -> [staffIds]

    // Initialize tracking
    availableStaff.forEach(staff => {
      staffAssignmentCount[staff.id] = 0;
      staffAssignments[staff.id] = [];
    });

    // Helper function to check if staff can be assigned to a slot
    const canAssignStaff = (staffId: string, timeSlotId: string): boolean => {
      const currentSlotNum = parseInt(timeSlotId);
      const assignedSlots = staffAssignments[staffId] || [];
      
      // Rule 1: Staff can only be assigned 1 time slot at a time (across all categories)
      if (assignedSlots.includes(timeSlotId)) {
        return false;
      }
      
      // Rule 2: Staff cannot be assigned 2 consecutive time slots
      const hasConsecutive = assignedSlots.some(assignedSlot => {
        const assignedSlotNum = parseInt(assignedSlot);
        return Math.abs(currentSlotNum - assignedSlotNum) === 1;
      });
      
      if (hasConsecutive) {
        return false;
      }
      
      return true;
    };

    // Enhanced staff selection with better randomization and distribution
    const selectStaffForSlot = (availableForSlot: Staff[], timeSlotId: string): Staff | null => {
      // Filter staff that can be assigned to this slot
      const eligibleStaff = availableForSlot.filter((s: Staff) => 
        canAssignStaff(s.id, timeSlotId) && 
        !(usedStaffPerSlot[timeSlotId] || []).includes(s.id)
      );
      
      if (eligibleStaff.length === 0) {
        return null;
      }
      
      // Prioritize staff with fewer assignments for better distribution
      const minAssignments = Math.min(...eligibleStaff.map(s => staffAssignmentCount[s.id]));
      const leastAssignedStaff = eligibleStaff.filter(s => staffAssignmentCount[s.id] === minAssignments);
      
      // Randomize selection from least assigned staff
      const randomIndex = Math.floor(Math.random() * leastAssignedStaff.length);
      return leastAssignedStaff[randomIndex];
    };

    // Helper function to assign staff to a category for a time slot
    const assignStaffToSlot = (category: 'frontRoom' | 'scotty' | 'twins', timeSlotId: string): string | null => {
      // Skip twins assignments if neither Zara nor Zoya are attending
      if (category === 'twins' && !twinsAttending) {
        return null;
      }
      
      const availableForSlot = getAvailableStaffForSlot(timeSlotId);
      const selectedStaff = selectStaffForSlot(availableForSlot, timeSlotId);
      
      if (!selectedStaff) {
        return null;
      }
      
      // Track the assignment
      staffAssignmentCount[selectedStaff.id]++;
      if (!staffAssignments[selectedStaff.id]) {
        staffAssignments[selectedStaff.id] = [];
      }
      staffAssignments[selectedStaff.id].push(timeSlotId);
      
      if (!usedStaffPerSlot[timeSlotId]) {
        usedStaffPerSlot[timeSlotId] = [];
      }
      usedStaffPerSlot[timeSlotId].push(selectedStaff.id);
      
      return selectedStaff.id;
    };

    // Assign staff to all time slots for all categories
    TIME_SLOTS.forEach(slot => {
      // Initialize slot tracking
      usedStaffPerSlot[slot.id] = [];
      
      // Assign to Front Room
      const frontRoomStaffId = assignStaffToSlot('frontRoom', slot.id);
      if (frontRoomStaffId) {
        frontRoom.push({ timeSlotId: slot.id, staffId: frontRoomStaffId });
      }

      // Assign to Scotty
      const scottyStaffId = assignStaffToSlot('scotty', slot.id);
      if (scottyStaffId) {
        scotty.push({ timeSlotId: slot.id, staffId: scottyStaffId });
      }

      // Assign to Twins (only if twins are attending)
      const twinsStaffId = assignStaffToSlot('twins', slot.id);
      if (twinsStaffId) {
        twins.push({ timeSlotId: slot.id, staffId: twinsStaffId });
      }
    });

    console.log('Time slot assignments generated:');
    console.log('Twins attending:', twinsAttending);
    console.log('Staff assignment distribution:', staffAssignmentCount);
    console.log('Front Room slots:', frontRoom.length);
    console.log('Scotty slots:', scotty.length);
    console.log('Twins slots:', twins.length);

    return { frontRoom, scotty, twins };
  };

  // Enhanced chore assignment with weekly randomization - OPTIMIZED for 1 chore per person
  const generateChoreAssignments = async (workingStaffIds: string[], forceRegenerate: boolean = false): Promise<ChoreAssignment[]> => {
    const chores = choresQuery.data || [];
    const staff = staffQuery.data || [];
    const assignments: ChoreAssignment[] = [];
    
    // Filter out 'Everyone', 'Drive/Outing', 'Audit', and 'Antoinette' from auto-assignments
    const excludedNames = ['Everyone', 'Drive/Outing', 'Audit', 'Antoinette'];
    const validStaffIds = workingStaffIds.filter(id => {
      const staffMember = staff.find((s: Staff) => s.id === id);
      return staffMember && !excludedNames.includes(staffMember.name);
    });

    if (validStaffIds.length === 0) {
      return assignments;
    }

    // Get current week's start date (Monday)
    const currentDate = new Date(selectedDate);
    const dayOfWeek = currentDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() + mondayOffset);
    const weekKey = weekStart.toISOString().split('T')[0];

    try {
      // Load existing weekly assignments
      const weeklyAssignmentsKey = `weeklyChoreAssignments_${weekKey}`;
      let weeklyAssignments: { [choreId: string]: string[] } = {}; // choreId -> [staffIds for each day]
      
      if (!forceRegenerate) {
        const stored = await AsyncStorage.getItem(weeklyAssignmentsKey);
        if (stored) {
          try {
            const trimmed = stored.trim();
            if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
              weeklyAssignments = JSON.parse(trimmed);
            }
          } catch (parseError) {
            console.error('Error parsing weekly assignments:', parseError);
            weeklyAssignments = {};
          }
        }
      }

      // Calculate which day of the week this is (0 = Monday, 6 = Sunday)
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      // Track staff assignments for today to ensure only 1 chore per person
      const todayStaffAssignments: Set<string> = new Set();
      
      // First, collect existing assignments for today that we're keeping
      if (!forceRegenerate) {
        chores.forEach((chore: Chore) => {
          if (weeklyAssignments[chore.id] && weeklyAssignments[chore.id][dayIndex]) {
            const existingStaffId = weeklyAssignments[chore.id][dayIndex];
            if (validStaffIds.includes(existingStaffId)) {
              todayStaffAssignments.add(existingStaffId);
            }
          }
        });
      }

      // Shuffle chores array for random assignment order
      const shuffledChores = [...chores].sort(() => Math.random() - 0.5);

      // Generate assignments for each chore with 1-per-person constraint
      shuffledChores.forEach((chore: Chore) => {
        if (!weeklyAssignments[chore.id]) {
          weeklyAssignments[chore.id] = new Array(7).fill(null);
        }

        // If this day doesn't have an assignment yet, or we're forcing regeneration
        if (!weeklyAssignments[chore.id][dayIndex] || forceRegenerate) {
          // Get staff assignments for this chore across the week
          const choreStaffThisWeek = weeklyAssignments[chore.id].filter(Boolean);
          
          // Find staff who:
          // 1. Haven't been assigned this chore this week (for variety)
          // 2. Don't already have a chore assigned today (1 chore per person)
          // 3. Are in the valid staff list
          let availableStaff = validStaffIds.filter(staffId => 
            !choreStaffThisWeek.includes(staffId) && 
            !todayStaffAssignments.has(staffId)
          );
          
          // If no staff available with weekly variety constraint, relax it but keep 1-per-day constraint
          if (availableStaff.length === 0) {
            availableStaff = validStaffIds.filter(staffId => 
              !todayStaffAssignments.has(staffId)
            );
          }
          
          // If still no staff available (more chores than staff), assign to least loaded staff
          if (availableStaff.length === 0) {
            // Count current assignments per staff member for today
            const staffChoreCount: { [staffId: string]: number } = {};
            validStaffIds.forEach(staffId => {
              staffChoreCount[staffId] = 0;
            });
            
            // Count existing assignments
            todayStaffAssignments.forEach(staffId => {
              if (staffChoreCount[staffId] !== undefined) {
                staffChoreCount[staffId]++;
              }
            });
            
            // Find staff with minimum assignments
            const minAssignments = Math.min(...Object.values(staffChoreCount));
            availableStaff = validStaffIds.filter(staffId => 
              staffChoreCount[staffId] === minAssignments
            );
          }
          
          if (availableStaff.length > 0) {
            // Randomize selection from available staff
            const randomStaffId = availableStaff[Math.floor(Math.random() * availableStaff.length)];
            weeklyAssignments[chore.id][dayIndex] = randomStaffId;
            todayStaffAssignments.add(randomStaffId);
          }
        } else {
          // Keep existing assignment and track it
          const existingStaffId = weeklyAssignments[chore.id][dayIndex];
          if (validStaffIds.includes(existingStaffId)) {
            todayStaffAssignments.add(existingStaffId);
          }
        }

        // Add assignment for today
        const todayStaffId = weeklyAssignments[chore.id][dayIndex];
        if (todayStaffId && validStaffIds.includes(todayStaffId)) {
          assignments.push({ choreId: chore.id, staffId: todayStaffId });
        }
      });

      // Save updated weekly assignments
      await AsyncStorage.setItem(weeklyAssignmentsKey, JSON.stringify(weeklyAssignments));
      
      console.log('Generated optimized chore assignments (1 per person):', assignments.length);
      console.log('Staff with assignments today:', todayStaffAssignments.size, 'out of', validStaffIds.length, 'available staff');
      
      // Log assignment distribution for debugging
      const assignmentCounts: { [staffId: string]: number } = {};
      assignments.forEach(assignment => {
        assignmentCounts[assignment.staffId] = (assignmentCounts[assignment.staffId] || 0) + 1;
      });
      console.log('Chore distribution today:', assignmentCounts);
      
      return assignments;
    } catch (error) {
      console.error('Error generating chore assignments:', error);
      // Fallback to optimized simple assignment (1 per person)
      const usedStaff: Set<string> = new Set();
      const shuffledChores = [...chores].sort(() => Math.random() - 0.5);
      
      shuffledChores.forEach((chore: Chore) => {
        const availableStaff = validStaffIds.filter(staffId => !usedStaff.has(staffId));
        if (availableStaff.length > 0) {
          const randomStaffId = availableStaff[Math.floor(Math.random() * availableStaff.length)];
          assignments.push({ choreId: chore.id, staffId: randomStaffId });
          usedStaff.add(randomStaffId);
        } else if (validStaffIds.length > 0) {
          // If more chores than staff, assign to random staff (but this breaks 1-per-person rule)
          const randomStaffId = validStaffIds[Math.floor(Math.random() * validStaffIds.length)];
          assignments.push({ choreId: chore.id, staffId: randomStaffId });
        }
      });
      
      return assignments;
    }
  };

  const createSchedule = async (
    workingStaff: string[],
    attendingParticipants: string[],
    assignments: Assignment[],
    finalChecklistStaff: string
  ) => {
    console.log('Creating new schedule for date:', selectedDate);
    console.log('Working staff:', workingStaff.length);
    console.log('Attending participants:', attendingParticipants.length);
    
    const timeSlotAssignments = generateTimeSlotAssignments(workingStaff);
    const choreAssignments = await generateChoreAssignments(workingStaff);

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
      let updates = [];
      
      if (existingUpdates) {
        try {
          const trimmed = existingUpdates.trim();
          if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
            updates = JSON.parse(trimmed);
          }
        } catch (parseError) {
          console.error('Error parsing category updates:', parseError);
          updates = [];
        }
      }
      
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
  const regenerateAssignments = async (scheduleId: string, forceChoreRegeneration: boolean = false) => {
    const schedules = schedulesQuery.data || [];
    const schedule = schedules.find((s: Schedule) => s.id === scheduleId);
    if (schedule) {
      const timeSlotAssignments = generateTimeSlotAssignments(schedule.workingStaff);
      const choreAssignments = await generateChoreAssignments(schedule.workingStaff, forceChoreRegeneration);
      
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

  // Auto-reassign chores with weekly randomization
  const autoReassignChores = async (scheduleId: string) => {
    console.log('Auto-reassigning chores for schedule:', scheduleId);
    await regenerateAssignments(scheduleId, true);
  };

  // Get weekly chore distribution for analysis
  const getWeeklyChoreDistribution = async (): Promise<{ [staffId: string]: number }> => {
    try {
      const currentDate = new Date(selectedDate);
      const dayOfWeek = currentDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() + mondayOffset);
      const weekKey = weekStart.toISOString().split('T')[0];

      const weeklyAssignmentsKey = `weeklyChoreAssignments_${weekKey}`;
      const stored = await AsyncStorage.getItem(weeklyAssignmentsKey);
      
      if (!stored) {
        return {};
      }

      const weeklyAssignments = JSON.parse(stored);
      const distribution: { [staffId: string]: number } = {};

      // Count assignments per staff member
      Object.values(weeklyAssignments).forEach((choreWeek: any) => {
        choreWeek.forEach((staffId: string) => {
          if (staffId) {
            distribution[staffId] = (distribution[staffId] || 0) + 1;
          }
        });
      });

      return distribution;
    } catch (error) {
      console.error('Error getting weekly chore distribution:', error);
      return {};
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
          try {
            const trimmed = updates.trim();
            if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
              const parsedUpdates = JSON.parse(trimmed);
              setCategoryUpdates(parsedUpdates);
              console.log('Category updates reloaded:', parsedUpdates.length, 'updates');
            } else {
              setCategoryUpdates([]);
              console.log('Invalid category updates format for date:', selectedDate);
            }
          } catch (parseError) {
            console.error('Error parsing category updates during refresh:', parseError);
            setCategoryUpdates([]);
          }
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
          try {
            const trimmed = allSchedules.trim();
            if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
              const parsedSchedules = JSON.parse(trimmed);
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
              console.log('Invalid schedules data format in AsyncStorage');
            }
          } catch (parseError) {
            console.error('Error parsing schedules during verification:', parseError);
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
      let codes = [];
      
      if (activeCodes) {
        try {
          const trimmed = activeCodes.trim();
          if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
            codes = JSON.parse(trimmed);
          }
        } catch (parseError) {
          console.error('Error parsing active sharing codes:', parseError);
          codes = [];
        }
      }
      
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
      
      let sharedSchedule: SharedSchedule;
      
      try {
        const trimmed = sharedData.trim();
        if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) {
          return { success: false, error: 'Invalid shared data format.' };
        }
        sharedSchedule = JSON.parse(trimmed);
      } catch (parseError) {
        console.error('Error parsing shared schedule data:', parseError);
        return { success: false, error: 'Invalid shared data format.' };
      }
      
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
      
      let codes = [];
      
      try {
        const trimmed = activeCodes.trim();
        if (trimmed && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
          codes = JSON.parse(trimmed);
        }
      } catch (parseError) {
        console.error('Error parsing active codes during cleanup:', parseError);
        codes = [];
      }
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

  // Clear all corrupted data and reset to defaults
  const clearCorruptedData = useCallback(async () => {
    console.log('Clearing all corrupted data and resetting to defaults...');
    try {
      const keysToRemove = [
        'staff',
        'participants', 
        'chores',
        'checklist',
        'schedules',
        'criticalUpdates',
        'active_sharing_codes'
      ];
      
      // Remove all potentially corrupted keys
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      // Clear all category updates
      const allKeys = await AsyncStorage.getAllKeys();
      const categoryUpdateKeys = allKeys.filter(key => key.startsWith('categoryUpdates_'));
      const sharedKeys = allKeys.filter(key => key.startsWith('shared_'));
      
      await Promise.all([
        ...categoryUpdateKeys.map(key => AsyncStorage.removeItem(key)),
        ...sharedKeys.map(key => AsyncStorage.removeItem(key))
      ]);
      
      // Clear React Query cache
      queryClient.clear();
      
      // Reset local state
      setCategoryUpdates([]);
      setCurrentSchedule(null);
      setScheduleStep(1);
      
      console.log('All corrupted data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing corrupted data:', error);
      return false;
    }
  }, [queryClient]);
  
  // Diagnostic function to check data integrity
  const checkDataIntegrity = useCallback(async () => {
    console.log('=== DATA INTEGRITY CHECK ===');
    const issues: string[] = [];
    
    try {
      // Check schedules
      const schedulesData = await AsyncStorage.getItem('schedules');
      if (schedulesData) {
        try {
          const parsed = JSON.parse(schedulesData);
          if (!Array.isArray(parsed)) {
            issues.push('Schedules data is not an array');
          } else {
            console.log(`✓ Schedules: ${parsed.length} items`);
          }
        } catch (e) {
          issues.push('Schedules data is corrupted (invalid JSON)');
        }
      } else {
        console.log('✓ Schedules: No data (will use empty array)');
      }
      
      // Check staff
      const staffData = await AsyncStorage.getItem('staff');
      if (staffData) {
        try {
          const parsed = JSON.parse(staffData);
          if (!Array.isArray(parsed)) {
            issues.push('Staff data is not an array');
          } else {
            console.log(`✓ Staff: ${parsed.length} items`);
          }
        } catch (e) {
          issues.push('Staff data is corrupted (invalid JSON)');
        }
      } else {
        console.log('✓ Staff: No data (will use defaults)');
      }
      
      // Check participants
      const participantsData = await AsyncStorage.getItem('participants');
      if (participantsData) {
        try {
          const parsed = JSON.parse(participantsData);
          if (!Array.isArray(parsed)) {
            issues.push('Participants data is not an array');
          } else {
            console.log(`✓ Participants: ${parsed.length} items`);
          }
        } catch (e) {
          issues.push('Participants data is corrupted (invalid JSON)');
        }
      } else {
        console.log('✓ Participants: No data (will use defaults)');
      }
      
      if (issues.length > 0) {
        console.error('Data integrity issues found:', issues);
        return { success: false, issues };
      }
      
      console.log('=== DATA INTEGRITY CHECK PASSED ===');
      return { success: true, issues: [] };
    } catch (error) {
      console.error('Error checking data integrity:', error);
      return { success: false, issues: ['Failed to check data integrity'] };
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
    
    // Chore assignment functions
    autoReassignChores,
    getWeeklyChoreDistribution,
    
    // Sharing functions
    shareScheduleWithCode,
    importScheduleWithCode,
    cleanupExpiredCodes,
    
    // Utility functions
    clearCorruptedData,
    checkDataIntegrity
  };
});