import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import { Save, Check, X, Shuffle, Users, RotateCcw } from 'lucide-react-native';
import { Schedule, Staff, Participant, Chore, ChecklistItem, TimeSlotAssignment } from '@/types/schedule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

export default function EditScheduleScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { 
    selectedDate, 
    getScheduleForDate, 
    staff, 
    participants, 
    chores, 
    checklist,
    timeSlots,
    schedules,
    updateCategory,
    autoReassignChores,
    getWeeklyChoreDistribution
  } = useSchedule();
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [selectedStaffForDropOff, setSelectedStaffForDropOff] = useState<string | null>(null);
  const [weeklyDistribution, setWeeklyDistribution] = useState<{ [staffId: string]: number }>({});
  const [showReassignOptions, setShowReassignOptions] = useState<boolean>(false);

  const initializeEditData = useCallback((currentSchedule: Schedule) => {
    if (!category) return;
    
    switch (category) {
      case 'staff':
        setEditedData(currentSchedule.workingStaff);
        break;
      case 'participants':
        setEditedData(currentSchedule.attendingParticipants);
        break;
      case 'assignments':
        setEditedData(currentSchedule.assignments);
        break;
      case 'frontRoom':
        setEditedData(currentSchedule.frontRoomSlots);
        break;
      case 'scotty':
        setEditedData(currentSchedule.scottySlots);
        break;
      case 'twins':
        setEditedData(currentSchedule.twinsSlots);
        break;
      case 'chores':
        setEditedData(currentSchedule.choreAssignments);
        break;
      case 'dropOffs':
        setEditedData(currentSchedule.dropOffs || []);
        break;
      case 'finalChecklist':
        setEditedData(currentSchedule.finalChecklistStaff);
        break;
    }
  }, [category]);

  useEffect(() => {
    const currentSchedule = getScheduleForDate(selectedDate);
    if (currentSchedule) {
      setSchedule(currentSchedule);
      initializeEditData(currentSchedule);
      
      // Load weekly distribution for chores category
      if (category === 'chores') {
        loadWeeklyDistribution();
      }
    }
  }, [selectedDate, getScheduleForDate, initializeEditData, category]);

  const loadWeeklyDistribution = async () => {
    try {
      const distribution = await getWeeklyChoreDistribution();
      setWeeklyDistribution(distribution);
    } catch (error) {
      console.error('Error loading weekly distribution:', error);
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'staff': return 'Staff Working Today';
      case 'participants': return 'Participants Attending';
      case 'assignments': return 'Daily Assignments';
      case 'frontRoom': return 'Front Room Schedule';
      case 'scotty': return 'Scotty Schedule';
      case 'twins': return 'Twins Schedule';
      case 'chores': return 'Chores Assignment';
      case 'dropOffs': return 'Drop-offs';
      case 'finalChecklist': return 'Final Checklist';
      default: return 'Edit Schedule';
    }
  };

  const handleCancel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Cancel editing? Any unsaved changes will be lost.')) {
        router.back();
      }
    } else {
      Alert.alert(
        'Cancel Editing',
        'Any unsaved changes will be lost. Are you sure?',
        [
          { text: 'Continue Editing', style: 'cancel' },
          { 
            text: 'Cancel', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  const handleSave = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Save changes to this category?')) {
        saveChanges();
      }
    } else {
      Alert.alert(
        'Save Changes',
        'Save changes to this category?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: saveChanges }
        ]
      );
    }
  };

  const saveChanges = async () => {
    if (!schedule || !editedData || !category) return;
    
    try {
      // Create updated schedule with the edited data
      const updatedSchedule = { ...schedule };
      
      switch (category) {
        case 'staff':
          updatedSchedule.workingStaff = editedData;
          break;
        case 'participants':
          updatedSchedule.attendingParticipants = editedData;
          break;
        case 'assignments':
          updatedSchedule.assignments = editedData;
          break;
        case 'frontRoom':
          updatedSchedule.frontRoomSlots = editedData;
          break;
        case 'scotty':
          updatedSchedule.scottySlots = editedData;
          break;
        case 'twins':
          updatedSchedule.twinsSlots = editedData;
          break;
        case 'chores':
          updatedSchedule.choreAssignments = editedData;
          break;
        case 'dropOffs':
          updatedSchedule.dropOffs = editedData;
          break;
        case 'finalChecklist':
          updatedSchedule.finalChecklistStaff = editedData;
          break;
      }
      
      // Use the updateCategory method to save and track the update
      await updateCategory(category, updatedSchedule);
      
      console.log('Changes saved successfully for category:', category);
      Alert.alert('Success', 'Changes saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const renderCategoryContent = () => {
    if (!schedule || !category) return null;

    switch (category) {
      case 'staff':
        return renderStaffList();
      case 'participants':
        return renderParticipantsList();
      case 'assignments':
        return renderAssignments();
      case 'frontRoom':
      case 'scotty':
      case 'twins':
        return renderTimeSlots(category);
      case 'chores':
        return renderChores();
      case 'dropOffs':
        return renderDropOffs();
      case 'finalChecklist':
        return renderFinalChecklist();
      default:
        return null;
    }
  };

  const renderStaffList = () => {
    const workingStaffIds = editedData || schedule?.workingStaff || [];
    
    const toggleStaff = (staffId: string) => {
      const currentIds = [...workingStaffIds];
      const index = currentIds.indexOf(staffId);
      
      if (index > -1) {
        currentIds.splice(index, 1);
      } else {
        currentIds.push(staffId);
      }
      
      setEditedData(currentIds);
    };
    
    return (
      <View style={styles.listContainer}>
        {staff.map((staffMember: Staff) => {
          const isWorking = workingStaffIds.includes(staffMember.id);
          const staffColor = staffMember.color || '#666';
          
          return (
            <TouchableOpacity 
              key={staffMember.id} 
              style={[styles.listItem, isWorking && styles.selectedItem]}
              onPress={() => toggleStaff(staffMember.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorIndicator, { backgroundColor: staffColor }]} />
              <Text style={[styles.listItemText, isWorking && styles.selectedText]}>{staffMember.name}</Text>
              {isWorking && <Check size={20} color="#4CAF50" />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderParticipantsList = () => {
    const attendingIds = editedData || schedule?.attendingParticipants || [];
    
    const toggleParticipant = (participantId: string) => {
      const currentIds = [...attendingIds];
      const index = currentIds.indexOf(participantId);
      
      if (index > -1) {
        currentIds.splice(index, 1);
      } else {
        currentIds.push(participantId);
      }
      
      setEditedData(currentIds);
    };
    
    return (
      <View style={styles.listContainer}>
        {participants.map((participant: Participant) => {
          const isAttending = attendingIds.includes(participant.id);
          
          return (
            <TouchableOpacity 
              key={participant.id} 
              style={[styles.listItem, isAttending && styles.selectedItem]}
              onPress={() => toggleParticipant(participant.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.listItemText, isAttending && styles.selectedText]}>{participant.name}</Text>
              {isAttending && <Check size={20} color="#4CAF50" />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderAssignments = () => {
    const assignments = schedule?.assignments || [];
    
    // Sort assignments alphabetically by staff name
    const sortedAssignments = [...assignments].sort((a, b) => {
      const staffA = staff.find((s: Staff) => s.id === a.staffId);
      const staffB = staff.find((s: Staff) => s.id === b.staffId);
      const nameA = staffA?.name || '';
      const nameB = staffB?.name || '';
      return nameA.localeCompare(nameB);
    });
    
    return (
      <View style={styles.listContainer}>
        <View style={styles.assignmentHeader}>
          <Text style={styles.assignmentHeaderTitle}>Daily Assignments (Alphabetical)</Text>
          <Text style={styles.assignmentHeaderSubtitle}>Staff names sorted alphabetically</Text>
        </View>
        {sortedAssignments.map((assignment, index) => {
          const staffMember = staff.find((s: Staff) => s.id === assignment.staffId);
          const assignedParticipants = assignment.participantIds.map((pId: string) => 
            participants.find((p: Participant) => p.id === pId)?.name
          ).filter(Boolean);
          
          return (
            <View key={`assignment-${assignment.staffId}`} style={styles.assignmentItem}>
              <View style={[styles.colorIndicator, { backgroundColor: staffMember?.color || '#666' }]} />
              <View style={styles.assignmentContent}>
                <Text style={styles.assignmentStaff}>{staffMember?.name}</Text>
                <Text style={styles.assignmentParticipants}>
                  {assignedParticipants.join(', ') || 'No participants assigned'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTimeSlots = (slotType: string) => {
    let slots: TimeSlotAssignment[] = [];
    switch (slotType) {
      case 'frontRoom':
        slots = editedData || schedule?.frontRoomSlots || [];
        break;
      case 'scotty':
        slots = editedData || schedule?.scottySlots || [];
        break;
      case 'twins':
        slots = editedData || schedule?.twinsSlots || [];
        break;
    }

    const changeStaffForSlot = (timeSlotId: string) => {
      const workingStaffIds = schedule?.workingStaff || [];
      // Filter out 'Everyone', 'Drive/Outing', and 'Audit' from assignments
      const excludedNames = ['Everyone', 'Drive/Outing', 'Audit'];
      let workingStaff = staff.filter((s: Staff) => 
        workingStaffIds.includes(s.id) && !excludedNames.includes(s.name)
      );
      
      // Sort staff alphabetically for better randomization in selection
      workingStaff = workingStaff.sort((a, b) => a.name.localeCompare(b.name));
      
      if (workingStaff.length === 0) {
        Alert.alert('No Staff', 'No working staff available for assignment');
        return;
      }
      
      const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
      const slotName = timeSlot?.displayTime || 'Time Slot';
      
      // Create staff selection options
      const staffOptions = workingStaff.map((s: Staff) => ({
        text: s.name,
        onPress: () => {
          const updatedSlots = slots.filter((s: TimeSlotAssignment) => s.timeSlotId !== timeSlotId);
          updatedSlots.push({ timeSlotId, staffId: s.id });
          setEditedData(updatedSlots);
        }
      }));
      
      if (Platform.OS === 'web') {
        // For web, show a simple prompt with staff names
        const staffNames = workingStaff.map((s: Staff, index: number) => `${index + 1}. ${s.name}`).join('\n');
        const selection = window.prompt(
          `Select staff member for "${slotName}":\n\n${staffNames}\n\nEnter number (1-${workingStaff.length}):`
        );
        
        if (selection) {
          const selectedIndex = parseInt(selection) - 1;
          if (selectedIndex >= 0 && selectedIndex < workingStaff.length) {
            const selectedStaff = workingStaff[selectedIndex];
            const updatedSlots = slots.filter((s: TimeSlotAssignment) => s.timeSlotId !== timeSlotId);
            updatedSlots.push({ timeSlotId, staffId: selectedStaff.id });
            setEditedData(updatedSlots);
          }
        }
      } else {
        // For mobile, show action sheet with staff options
        Alert.alert(
          `Assign "${slotName}"`,
          'Select a staff member:',
          [
            { text: 'Cancel', style: 'cancel' },
            ...staffOptions
          ]
        );
      }
    };
    
    const unassignSlot = (timeSlotId: string) => {
      const updatedSlots = slots.filter((s: TimeSlotAssignment) => s.timeSlotId !== timeSlotId);
      setEditedData(updatedSlots);
    };
    
    const handleSlotPress = (timeSlotId: string) => {
      const currentAssignment = slots.find(s => s.timeSlotId === timeSlotId);
      
      if (currentAssignment) {
        // For frontRoom, scotty, and twins - only allow change assignment, no unassign
        changeStaffForSlot(timeSlotId);
      } else {
        // No assignment, just assign
        changeStaffForSlot(timeSlotId);
      }
    };

    // Check if twins are attending for twins slot type
    const attendingParticipantIds = schedule?.attendingParticipants || [];
    const attendingParticipants = participants.filter((p: Participant) => attendingParticipantIds.includes(p.id));
    const twinsAttending = attendingParticipants.some((p: Participant) => p.name === 'Zara' || p.name === 'Zoya');
    
    // If this is twins slot and no twins are attending, show message
    if (slotType === 'twins' && !twinsAttending) {
      return (
        <View style={styles.listContainer}>
          <View style={styles.noTwinsMessage}>
            <Text style={styles.noTwinsTitle}>Twins Time Slot Omitted</Text>
            <Text style={styles.noTwinsText}>Neither Zara nor Zoya are attending today, so the twins time slot has been omitted.</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.listContainer}>
        <View style={styles.timeSlotHeader}>
          <Text style={styles.timeSlotHeaderTitle}>
            {slotType === 'frontRoom' ? 'Front Room Schedule' : 
             slotType === 'scotty' ? 'Scotty Schedule' : 'Twins Schedule'}
          </Text>
          <Text style={styles.timeSlotHeaderSubtitle}>Randomized staff assignments with better distribution</Text>
        </View>
        {timeSlots.map((timeSlot) => {
          const assignment = slots.find((s: TimeSlotAssignment) => s.timeSlotId === timeSlot.id);
          const assignedStaff = assignment ? staff.find((s: Staff) => s.id === assignment.staffId) : null;
          
          return (
            <TouchableOpacity 
              key={timeSlot.id} 
              style={styles.timeSlotItem}
              onPress={() => handleSlotPress(timeSlot.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.timeSlotTime}>{timeSlot.displayTime}</Text>
              {assignedStaff ? (
                <View style={styles.staffBadge}>
                  <View style={[styles.colorDot, { backgroundColor: assignedStaff.color || '#666' }]} />
                  <Text style={styles.staffName}>{assignedStaff.name}</Text>
                </View>
              ) : (
                <Text style={styles.unassignedText}>Tap to assign</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderChores = () => {
    const choreAssignments = editedData || schedule?.choreAssignments || [];
    
    const changeChoreAssignment = (choreId: string) => {
      const workingStaffIds = schedule?.workingStaff || [];
      // Filter out 'Everyone', 'Drive/Outing', and 'Audit' from assignments
      const excludedNames = ['Everyone', 'Drive/Outing', 'Audit'];
      const workingStaff = staff.filter((s: Staff) => 
        workingStaffIds.includes(s.id) && !excludedNames.includes(s.name)
      );
      
      if (workingStaff.length === 0) {
        Alert.alert('No Staff', 'No working staff available for assignment');
        return;
      }
      
      const chore = chores.find((c: Chore) => c.id === choreId);
      const choreName = chore?.name || 'Chore';
      
      // Create staff selection options
      const staffOptions = workingStaff.map((s: Staff) => ({
        text: s.name,
        onPress: () => {
          const updatedAssignments = choreAssignments.filter((ca: any) => ca.choreId !== choreId);
          updatedAssignments.push({ choreId, staffId: s.id });
          setEditedData(updatedAssignments);
        }
      }));
      
      if (Platform.OS === 'web') {
        // For web, show a simple prompt with staff names
        const staffNames = workingStaff.map((s: Staff, index: number) => `${index + 1}. ${s.name}`).join('\n');
        const selection = window.prompt(
          `Select staff member for "${choreName}":\n\n${staffNames}\n\nEnter number (1-${workingStaff.length}):`
        );
        
        if (selection) {
          const selectedIndex = parseInt(selection) - 1;
          if (selectedIndex >= 0 && selectedIndex < workingStaff.length) {
            const selectedStaff = workingStaff[selectedIndex];
            const updatedAssignments = choreAssignments.filter((ca: any) => ca.choreId !== choreId);
            updatedAssignments.push({ choreId, staffId: selectedStaff.id });
            setEditedData(updatedAssignments);
          }
        }
      } else {
        // For mobile, show action sheet with staff options
        Alert.alert(
          `Assign "${choreName}"`,
          'Select a staff member:',
          [
            { text: 'Cancel', style: 'cancel' },
            ...staffOptions
          ]
        );
      }
    };
    
    const unassignChore = (choreId: string) => {
      const updatedAssignments = choreAssignments.filter((ca: any) => ca.choreId !== choreId);
      setEditedData(updatedAssignments);
    };
    
    const handleChorePress = (choreId: string) => {
      const currentAssignment = choreAssignments.find((ca: any) => ca.choreId === choreId);
      
      if (currentAssignment) {
        // Show options to change assignment or unassign
        if (Platform.OS === 'web') {
          const action = window.confirm('Choose action:\nOK = Change Assignment\nCancel = Unassign');
          if (action) {
            changeChoreAssignment(choreId);
          } else {
            unassignChore(choreId);
          }
        } else {
          Alert.alert(
            'Chore Assignment',
            'What would you like to do?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Unassign', onPress: () => unassignChore(choreId), style: 'destructive' },
              { text: 'Change Assignment', onPress: () => changeChoreAssignment(choreId) }
            ]
          );
        }
      } else {
        // No assignment, just assign
        changeChoreAssignment(choreId);
      }
    };
    
    const handleAutoReassign = async () => {
      if (!schedule) return;
      
      if (Platform.OS === 'web') {
        if (window.confirm('Auto-reassign all chores with weekly randomization? This will redistribute chores to ensure fair allocation.')) {
          await performAutoReassign();
        }
      } else {
        Alert.alert(
          'Auto-Reassign Chores',
          'This will redistribute all chores using weekly randomization to ensure fair allocation. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reassign', onPress: performAutoReassign }
          ]
        );
      }
    };

    const performAutoReassign = async () => {
      if (!schedule) return;
      
      try {
        await autoReassignChores(schedule.id);
        // Refresh the data to show new assignments
        const updatedSchedule = getScheduleForDate(selectedDate);
        if (updatedSchedule) {
          setEditedData(updatedSchedule.choreAssignments);
          await loadWeeklyDistribution();
        }
        Alert.alert('Success', 'Chores have been reassigned with weekly randomization!');
      } catch (error) {
        console.error('Error auto-reassigning chores:', error);
        Alert.alert('Error', 'Failed to reassign chores. Please try again.');
      }
    };

    const handleShowReassignOptions = () => {
      setShowReassignOptions(!showReassignOptions);
    };

    const getStaffChoreCount = (staffId: string): number => {
      return weeklyDistribution[staffId] || 0;
    };

    const workingStaffIds = schedule?.workingStaff || [];
    const workingStaff = staff.filter((s: Staff) => workingStaffIds.includes(s.id));
    
    return (
      <View style={styles.listContainer}>
        {/* Reassign Options Header */}
        <View style={styles.choreHeader}>
          <View style={styles.choreHeaderTop}>
            <Text style={styles.choreHeaderTitle}>Chore Assignments</Text>
            <TouchableOpacity 
              style={styles.reassignButton}
              onPress={handleShowReassignOptions}
              activeOpacity={0.7}
            >
              <Shuffle size={16} color="#007AFF" />
              <Text style={styles.reassignButtonText}>Options</Text>
            </TouchableOpacity>
          </View>
          
          {showReassignOptions && (
            <View style={styles.reassignOptions}>
              <TouchableOpacity 
                style={styles.reassignOptionButton}
                onPress={handleAutoReassign}
                activeOpacity={0.7}
              >
                <RotateCcw size={16} color="#4CAF50" />
                <Text style={styles.reassignOptionText}>Auto Re-assign All</Text>
              </TouchableOpacity>
              
              <View style={styles.weeklyStatsContainer}>
                <View style={styles.weeklyStatsHeader}>
                  <Users size={14} color="#666" />
                  <Text style={styles.weeklyStatsTitle}>Weekly Chore Count</Text>
                </View>
                <View style={styles.weeklyStatsList}>
                  {workingStaff
                    .filter(s => !['Everyone', 'Drive/Outing', 'Audit', 'Antoinette'].includes(s.name))
                    .sort((a, b) => getStaffChoreCount(b.id) - getStaffChoreCount(a.id))
                    .map((staffMember) => {
                      const count = getStaffChoreCount(staffMember.id);
                      return (
                        <View key={staffMember.id} style={styles.weeklyStatsItem}>
                          <View style={[styles.colorDot, { backgroundColor: staffMember.color || '#666' }]} />
                          <Text style={styles.weeklyStatsName}>{staffMember.name}</Text>
                          <Text style={styles.weeklyStatsCount}>{count} chores</Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Chore List */}
        {chores.map((chore: Chore) => {
          const assignment = choreAssignments.find((ca: any) => ca.choreId === chore.id);
          const assignedStaff = assignment ? staff.find((s: Staff) => s.id === assignment.staffId) : null;
          
          return (
            <TouchableOpacity 
              key={chore.id} 
              style={styles.choreItem}
              onPress={() => handleChorePress(chore.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.choreText}>{chore.name}</Text>
              {assignedStaff ? (
                <View style={styles.staffBadge}>
                  <View style={[styles.colorDot, { backgroundColor: assignedStaff.color || '#666' }]} />
                  <Text style={styles.staffName}>{assignedStaff.name}</Text>
                  <Text style={styles.weeklyCountBadge}>({getStaffChoreCount(assignedStaff.id)})</Text>
                </View>
              ) : (
                <Text style={styles.unassignedText}>Tap to assign</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderDropOffs = () => {
    const dropOffAssignments = editedData || schedule?.dropOffs || [];
    const workingStaffIds = schedule?.workingStaff || [];
    const workingStaff = staff
      .filter((s: Staff) => workingStaffIds.includes(s.id))
      .sort((a: Staff, b: Staff) => a.name.localeCompare(b.name));
    const attendingParticipantIds = schedule?.attendingParticipants || [];
    const attendingParticipants = participants.filter((p: Participant) => attendingParticipantIds.includes(p.id));
    
    
    const toggleParticipantDropOff = (participantId: string, staffId: string) => {
      const currentAssignments = [...dropOffAssignments];
      const existingIndex = currentAssignments.findIndex((da: any) => da.participantId === participantId);
      
      if (existingIndex > -1) {
        // If already assigned to this staff, remove the assignment
        if (currentAssignments[existingIndex].staffId === staffId) {
          currentAssignments.splice(existingIndex, 1);
        } else {
          // Otherwise, update to new staff
          const participant = participants.find((p: Participant) => p.id === participantId);
          currentAssignments[existingIndex] = {
            participantId,
            staffId,
            location: participant?.dropOffLocation || ''
          };
        }
      } else {
        // Add new assignment
        const participant = participants.find((p: Participant) => p.id === participantId);
        currentAssignments.push({
          participantId,
          staffId,
          location: participant?.dropOffLocation || ''
        });
      }
      
      setEditedData(currentAssignments);
    };
    
    const addNewStaff = () => {
      router.push('/(tabs)/settings');
    };
    
    const handleDropOffPress = (staffId: string) => {
      setSelectedStaffForDropOff(selectedStaffForDropOff === staffId ? null : staffId);
    };
    
    return (
      <View style={styles.listContainer}>
        <View style={styles.dropOffHeader}>
          <Text style={styles.dropOffTitle}>Assign Drop-offs to Working Staff</Text>
        </View>
        
        <View style={styles.addStaffSection}>
          <TouchableOpacity style={styles.addStaffButton} onPress={addNewStaff}>
            <Text style={styles.addStaffText}>+ Add Staff</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.workingStaffList}>
          <Text style={styles.sectionTitle}>Working Staff (Alphabetical)</Text>
          {workingStaff.map((staffMember: Staff) => {
            const assignedDropOffs = dropOffAssignments.filter((da: any) => da.staffId === staffMember.id);
            const isExpanded = selectedStaffForDropOff === staffMember.id;
            
            return (
              <View key={staffMember.id} style={styles.staffDropOffItem}>
                <View style={styles.staffHeader}>
                  <View style={[styles.colorDot, { backgroundColor: staffMember.color || '#666' }]} />
                  <Text style={styles.staffName}>{staffMember.name}</Text>
                  <Text style={styles.dropOffCount}>({assignedDropOffs.length} drop-offs)</Text>
                  <TouchableOpacity 
                    style={styles.dropOffButton}
                    onPress={() => handleDropOffPress(staffMember.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropOffButtonText}>Drop Off</Text>
                  </TouchableOpacity>
                </View>
                
                {isExpanded && (
                  <View style={styles.participantSelectionGrid}>
                    {attendingParticipants.map((participant: Participant) => {
                      const isAssignedToThisStaff = dropOffAssignments.some(
                        (da: any) => da.participantId === participant.id && da.staffId === staffMember.id
                      );
                      const isAssignedElsewhere = dropOffAssignments.some(
                        (da: any) => da.participantId === participant.id && da.staffId !== staffMember.id
                      );
                      
                      return (
                        <TouchableOpacity
                          key={participant.id}
                          style={[
                            styles.participantChip,
                            isAssignedToThisStaff && styles.participantChipSelected,
                            isAssignedElsewhere && styles.participantChipDisabled
                          ]}
                          onPress={() => toggleParticipantDropOff(participant.id, staffMember.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.participantChipText,
                            isAssignedToThisStaff && styles.participantChipTextSelected,
                            isAssignedElsewhere && styles.participantChipTextDisabled
                          ]}>
                            {participant.name}
                          </Text>
                          {participant.dropOffLocation && (
                            <Text style={[
                              styles.participantChipLocation,
                              isAssignedToThisStaff && styles.participantChipTextSelected,
                              isAssignedElsewhere && styles.participantChipTextDisabled
                            ]}>
                              {participant.dropOffLocation}
                            </Text>
                          )}
                          {isAssignedToThisStaff && <Check size={16} color="white" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        
        {attendingParticipants.length === 0 && (
          <View style={styles.noDropOffsMessage}>
            <Text style={styles.noDropOffsText}>No participants attending today</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFinalChecklist = () => {
    const finalStaffId = editedData || schedule?.finalChecklistStaff;
    const finalStaff = staff.find((s: Staff) => s.id === finalStaffId);
    
    const changeFinalStaff = () => {
      const workingStaffIds = schedule?.workingStaff || [];
      const workingStaff = staff.filter((s: Staff) => workingStaffIds.includes(s.id));
      
      if (workingStaff.length === 0) {
        Alert.alert('No Staff', 'No working staff available for assignment');
        return;
      }
      
      const currentStaffIndex = finalStaffId ? 
        workingStaff.findIndex((s: Staff) => s.id === finalStaffId) : -1;
      
      const nextStaffIndex = (currentStaffIndex + 1) % workingStaff.length;
      const nextStaff = workingStaff[nextStaffIndex];
      
      setEditedData(nextStaff.id);
    };
    
    return (
      <View style={styles.listContainer}>
        <TouchableOpacity 
          style={styles.finalChecklistContainer}
          onPress={changeFinalStaff}
          activeOpacity={0.7}
        >
          <Text style={styles.finalChecklistLabel}>Last Staff Member to Leave:</Text>
          {finalStaff ? (
            <View style={styles.finalChecklistStaffBadge}>
              <View style={[styles.finalChecklistColorDot, { backgroundColor: finalStaff.color || '#666' }]} />
              <Text style={styles.finalChecklistStaffName}>{finalStaff.name}</Text>
            </View>
          ) : (
            <Text style={styles.unassignedText}>Tap to assign</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.checklistItems}>
          {checklist.map((item: ChecklistItem) => (
            <View key={item.id} style={styles.checklistItem}>
              <Check size={16} color="#4CAF50" />
              <Text style={styles.checklistText}>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: getCategoryTitle(),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <X size={24} color="#FF3B30" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Save size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView style={styles.container}>
        {renderCategoryContent()}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    marginRight: 10,
    padding: 5,
  },
  cancelButton: {
    marginRight: 10,
    padding: 5,
  },
  listContainer: {
    backgroundColor: '#fff',
    marginTop: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colorIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  assignmentItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentStaff: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  assignmentParticipants: {
    fontSize: 14,
    color: '#666',
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSlotTime: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500' as const,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  staffName: {
    fontSize: 14,
    color: '#333',
  },
  finalChecklistStaffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  finalChecklistColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  finalChecklistStaffName: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#333',
  },
  choreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  choreText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginRight: 10,
  },
  finalChecklistContainer: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  finalChecklistLabel: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 10,
  },
  checklistItems: {
    paddingVertical: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
  selectedItem: {
    backgroundColor: '#e8f5e8',
  },
  selectedText: {
    fontWeight: '600' as const,
    color: '#2e7d32',
  },
  unassignedText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic' as const,
  },
  dropOffHeader: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addStaffSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropOffTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
  },
  addStaffButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addStaffText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  workingStaffList: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  participantDropOffList: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 10,
  },
  staffDropOffItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dropOffCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  dropOffButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  dropOffButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  assignedParticipant: {
    fontSize: 13,
    color: '#666',
    marginLeft: 20,
    marginTop: 2,
  },
  participantDropOffItem: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dropOffLocation: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  assignedText: {
    fontWeight: '600' as const,
    color: '#2e7d32',
  },
  staffAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  assignedStaffName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  tapToChange: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic' as const,
  },
  participantSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  participantChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  participantChipDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f8f8',
  },
  participantChipText: {
    fontSize: 13,
    color: '#333',
  },
  participantChipTextSelected: {
    color: 'white',
    fontWeight: '600' as const,
  },
  participantChipTextDisabled: {
    color: '#999',
  },
  participantChipLocation: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic' as const,
  },
  noDropOffsMessage: {
    padding: 30,
    alignItems: 'center',
  },
  noDropOffsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center' as const,
  },
  // Chore assignment styles
  choreHeader: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  choreHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  choreHeaderTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  reassignButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  reassignOptions: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#f8f8f8',
  },
  reassignOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  reassignOptionText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  weeklyStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weeklyStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  weeklyStatsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  weeklyStatsList: {
    gap: 6,
  },
  weeklyStatsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weeklyStatsName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    marginLeft: 4,
  },
  weeklyStatsCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500' as const,
  },
  weeklyCountBadge: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  // Assignment header styles
  assignmentHeader: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  assignmentHeaderTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  assignmentHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Time slot header styles
  timeSlotHeader: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeSlotHeaderTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  timeSlotHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // No twins message styles
  noTwinsMessage: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noTwinsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  noTwinsText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});