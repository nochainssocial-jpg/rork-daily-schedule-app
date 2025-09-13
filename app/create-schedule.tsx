import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronRight, Check, X } from 'lucide-react-native';
import { useSchedule } from '@/hooks/schedule-store';
import { Assignment, Staff, Participant } from '@/types/schedule';

export default function CreateScheduleScreen() {
  const { 
    staff, 
    participants, 
    scheduleStep, 
    setScheduleStep, 
    createSchedule,
    selectedDate 
  } = useSchedule();
  
  // Ensure we start at step 1 when component mounts
  useEffect(() => {
    setScheduleStep(1);
  }, []);
  
  // Check if selected date is Saturday
  const isSaturday = () => {
    // selectedDate is in YYYY-MM-DD format
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getDay() === 6;
  };

  const [workingStaff, setWorkingStaff] = useState<string[]>([]);
  const [attendingParticipants, setAttendingParticipants] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [finalChecklistStaff, setFinalChecklistStaff] = useState<string>('');

  const toggleStaffSelection = (staffId: string) => {
    setWorkingStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const toggleParticipantSelection = (participantId: string) => {
    setAttendingParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleBackStep = () => {
    if (scheduleStep > 1) {
      setScheduleStep(scheduleStep - 1);
    } else {
      router.back();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Schedule Creation',
      'Are you sure you want to cancel? All progress will be lost.',
      [
        {
          text: 'Continue Editing',
          style: 'cancel'
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            // Reset schedule step and go back to home
            setScheduleStep(1);
            router.replace('/(tabs)/home');
          }
        }
      ]
    );
  };

  // Override hardware back button behavior
  useEffect(() => {
    const unsubscribe = router.canGoBack() ? 
      (() => {
        // This will be called when back button is pressed
        handleBackStep();
        return true; // Prevent default back behavior
      }) : undefined;
    
    return () => {
      if (unsubscribe) {
        // Clean up
      }
    };
  }, [scheduleStep]);

  const canProceedToNextStep = useMemo(() => {
    switch (scheduleStep) {
      case 1:
        return workingStaff.length > 0;
      case 2:
        return attendingParticipants.length > 0;
      case 3:
        const assignedParticipants = assignments.flatMap(a => a.participantIds);
        const unassignedParticipants = attendingParticipants.filter(p => !assignedParticipants.includes(p));
        return attendingParticipants.length > 0 && unassignedParticipants.length === 0;
      case 4:
        return true;
      case 5:
        return finalChecklistStaff !== '';
      default:
        return false;
    }
  }, [scheduleStep, workingStaff.length, attendingParticipants, assignments, finalChecklistStaff]);

  const handleNextStep = useCallback(() => {
    console.log('handleNextStep called, current step:', scheduleStep);
    
    switch (scheduleStep) {
      case 1:
        if (workingStaff.length === 0) {
          Alert.alert('Selection Required', 'Please select at least one staff member.');
          return;
        }
        console.log('Moving from step 1 to step 2');
        setScheduleStep(2);
        break;
      case 2:
        if (attendingParticipants.length === 0) {
          Alert.alert('Selection Required', 'Please select at least one participant.');
          return;
        }
        // Initialize assignments
        const initialAssignments = workingStaff.map(staffId => ({
          staffId,
          participantIds: []
        }));
        setAssignments(initialAssignments);
        console.log('Moving from step 2 to step 3');
        setScheduleStep(3);
        break;
      case 3:
        // Check if all participants are assigned
        const assignedParticipants = assignments.flatMap(a => a.participantIds);
        const unassignedParticipants = attendingParticipants.filter(p => !assignedParticipants.includes(p));
        
        if (unassignedParticipants.length > 0) {
          Alert.alert('Assignment Incomplete', 'Please assign all participants to staff members.');
          return;
        }
        console.log('Moving from step 3 to step 4');
        setScheduleStep(4);
        break;
      case 4:
        console.log('Moving from step 4 to step 5');
        setScheduleStep(5);
        break;
      case 5:
        if (!finalChecklistStaff) {
          Alert.alert('Selection Required', 'Please select a staff member for the final checklist.');
          return;
        }
        console.log('Creating schedule and navigating to view-pdf');
        // Create the schedule
        createSchedule(workingStaff, attendingParticipants, assignments, finalChecklistStaff);
        Alert.alert(
          'Schedule Complete',
          'Your Daily Schedule is now complete!',
          [
            {
              text: 'Review',
              onPress: () => {
                console.log('Navigating to view-pdf');
                router.replace('/(tabs)/view-pdf');
              }
            }
          ]
        );
        break;
      default:
        console.log('Unknown step:', scheduleStep);
        break;
    }
  }, [scheduleStep, workingStaff, attendingParticipants, assignments, finalChecklistStaff, createSchedule, setScheduleStep]);

  const assignParticipantToStaff = (staffId: string, participantId: string) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.staffId === staffId) {
        const isAlreadyAssigned = assignment.participantIds.includes(participantId);
        return {
          ...assignment,
          participantIds: isAlreadyAssigned 
            ? assignment.participantIds.filter(id => id !== participantId)
            : [...assignment.participantIds, participantId]
        };
      }
      // Remove from other staff if reassigning
      return {
        ...assignment,
        participantIds: assignment.participantIds.filter(id => id !== participantId)
      };
    }));
  };

  const getStepTitle = () => {
    switch (scheduleStep) {
      case 1: return 'Select Working Staff';
      case 2: return 'Select Attending Participants';
      case 3: return 'Assign Participants to Staff';
      case 4: return 'Time Slots & Chores Assignment';
      case 5: return 'Final Checklist Assignment';
      default: return 'Create Schedule';
    }
  };

  const getProgressPercentage = () => {
    switch (scheduleStep) {
      case 1:
        return (workingStaff.length / Math.max(staff.length, 1)) * 100;
      case 2:
        return (attendingParticipants.length / Math.max(participants.length, 1)) * 100;
      case 3:
        const assignedParticipants = assignments.flatMap(a => a.participantIds);
        return (assignedParticipants.length / attendingParticipants.length) * 100;
      default:
        return (scheduleStep / 5) * 100;
    }
  };

  const getProgressText = () => {
    switch (scheduleStep) {
      case 1:
        return `${workingStaff.length} of ${staff.length} staff selected`;
      case 2:
        return `${attendingParticipants.length} of ${participants.length} participants selected`;
      case 3:
        const assignedParticipants = assignments.flatMap(a => a.participantIds);
        return `${assignedParticipants.length} of ${attendingParticipants.length} participants assigned`;
      default:
        return '';
    }
  };

  // Parse the date string and create a date object
  const [year, month, day] = selectedDate.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);
  
  // Get day name
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[currentDate.getDay()];
  
  // Get month name
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[currentDate.getMonth()];
  
  const dateString = `${currentDate.getDate()} ${monthName} ${currentDate.getFullYear()}`;

  const renderStepContent = () => {
    switch (scheduleStep) {
      case 1:
        return (
          <View style={styles.selectionContainer}>
            {staff.map((staffMember: Staff) => (
              <TouchableOpacity
                key={staffMember.id}
                style={[
                  styles.selectionItem,
                  workingStaff.includes(staffMember.id) && styles.selectedItem
                ]}
                onPress={() => toggleStaffSelection(staffMember.id)}
              >
                <View style={[styles.colorIndicator, { backgroundColor: staffMember.color }]} />
                <Text style={[
                  styles.selectionText,
                  workingStaff.includes(staffMember.id) && styles.selectedText
                ]}>
                  {staffMember.name}
                </Text>
                {workingStaff.includes(staffMember.id) && (
                  <Check size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2:
        return (
          <View style={styles.selectionContainer}>
            {participants.map((participant: Participant) => (
              <TouchableOpacity
                key={participant.id}
                style={[
                  styles.selectionItem,
                  attendingParticipants.includes(participant.id) && styles.selectedItem
                ]}
                onPress={() => toggleParticipantSelection(participant.id)}
              >
                <Text style={[
                  styles.selectionText,
                  attendingParticipants.includes(participant.id) && styles.selectedText
                ]}>
                  {participant.name}
                </Text>
                {attendingParticipants.includes(participant.id) && (
                  <Check size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.assignmentContainer}>
            
            {assignments.map(assignment => {
              const staffMember = staff.find((s: Staff) => s.id === assignment.staffId);
              return (
                <View key={assignment.staffId} style={styles.assignmentGroup}>
                  <View style={styles.staffHeader}>
                    <View style={[styles.colorIndicator, { backgroundColor: staffMember?.color }]} />
                    <Text style={styles.staffName}>{staffMember?.name}</Text>
                  </View>
                  
                  <View style={styles.participantsList}>
                    {attendingParticipants.map(participantId => {
                      const participant = participants.find((p: Participant) => p.id === participantId);
                      const isAssigned = assignment.participantIds.includes(participantId);
                      
                      // Check if this participant is assigned to another staff member
                      const isAssignedToOther = assignments.some(a => 
                        a.staffId !== assignment.staffId && 
                        a.participantIds.includes(participantId)
                      );
                      
                      return (
                        <TouchableOpacity
                          key={participantId}
                          style={[
                            styles.participantItem,
                            isAssigned && styles.assignedParticipant,
                            isAssignedToOther && styles.unavailableParticipant
                          ]}
                          onPress={() => assignParticipantToStaff(assignment.staffId, participantId)}
                          disabled={isAssignedToOther}
                        >
                          <Text style={[
                            styles.participantText,
                            isAssigned && styles.assignedParticipantText,
                            isAssignedToOther && styles.unavailableParticipantText
                          ]}>
                            {participant?.name}
                          </Text>
                          {isAssigned && <Check size={16} color="white" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        );

      case 4:
        return (
          <View style={styles.autoAssignmentContainer}>
            <Text style={styles.autoAssignmentTitle}>Automatic Assignment</Text>
            <Text style={styles.autoAssignmentText}>
              The app will automatically assign working staff to:
            </Text>
            <View style={styles.assignmentList}>
              {!isSaturday() && (
                <>
                  <Text style={styles.assignmentListItem}>• Front Room time slots</Text>
                  <Text style={styles.assignmentListItem}>• Scotty time slots</Text>
                  <Text style={styles.assignmentListItem}>• Twins time slots</Text>
                </>
              )}
              <Text style={styles.assignmentListItem}>• Chores distribution</Text>
            </View>
            {isSaturday() && (
              <Text style={styles.saturdayNote}>
                Note: Front Room, Scott, and Twins categories are not required on Saturdays.
              </Text>
            )}
            {!isSaturday() && (
              <>
                <Text style={styles.constraintText}>
                  * Antoinette will only be assigned from 2:00pm onwards
                </Text>
                <Text style={styles.constraintText}>
                  * No staff member will have consecutive time slots
                </Text>
              </>
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.selectionContainer}>
            <Text style={styles.finalChecklistTitle}>
              Select the staff member who will be last to leave:
            </Text>
            {workingStaff.map(staffId => {
              const staffMember = staff.find((s: Staff) => s.id === staffId);
              return (
                <TouchableOpacity
                  key={staffId}
                  style={[
                    styles.selectionItem,
                    finalChecklistStaff === staffId && styles.selectedItem
                  ]}
                  onPress={() => setFinalChecklistStaff(staffId)}
                >
                  <View style={[styles.colorIndicator, { backgroundColor: staffMember?.color }]} />
                  <Text style={[
                    styles.selectionText,
                    finalChecklistStaff === staffId && styles.selectedText
                  ]}>
                    {staffMember?.name}
                  </Text>
                  {finalChecklistStaff === staffId && (
                    <Check size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: getStepTitle(),
          headerBackTitle: 'Back',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackStep}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>
                {scheduleStep === 1 ? 'Back' : 'Previous'}
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleCancel}
              style={styles.headerButton}
            >
              <X size={24} color="#FF3B30" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <View style={styles.container}>
        <View style={styles.stickyHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dayText}>{dayName}</Text>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
          
          {(scheduleStep === 1 || scheduleStep === 2 || scheduleStep === 3) && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {getProgressText()}
              </Text>
            </View>
          )}
          
          <Text style={styles.stepIndicator}>Step {scheduleStep} of 5</Text>
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderStepContent()}

          <TouchableOpacity 
            style={[styles.nextButton, !canProceedToNextStep && styles.nextButtonDisabled]} 
            onPress={() => {
              console.log('Next button pressed, canProceed:', canProceedToNextStep);
              if (canProceedToNextStep) {
                handleNextStep();
              }
            }}
            activeOpacity={canProceedToNextStep ? 0.7 : 1}
          >
            <Text style={[styles.nextButtonText, !canProceedToNextStep && styles.nextButtonTextDisabled]}>
              {scheduleStep === 5 ? 'Complete Schedule' : 'Next'}
            </Text>
            <ChevronRight size={20} color={canProceedToNextStep ? "white" : "#999"} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  stickyHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  dateContainer: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dayText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  selectionContainer: {
    padding: 16,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  assignmentContainer: {
    padding: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center' as const,
  },
  assignmentGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  assignedParticipant: {
    backgroundColor: '#007AFF',
  },
  participantText: {
    fontSize: 14,
    color: '#333',
  },
  assignedParticipantText: {
    color: 'white',
  },
  unavailableParticipant: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  unavailableParticipantText: {
    color: '#999',
  },
  autoAssignmentContainer: {
    padding: 20,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
  },
  autoAssignmentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  autoAssignmentText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  assignmentList: {
    marginBottom: 20,
  },
  assignmentListItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  constraintText: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
  },
  saturdayNote: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 12,
    fontStyle: 'italic',
  },
  finalChecklistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  nextButtonTextDisabled: {
    color: '#999',
  },
  headerButton: {
    paddingHorizontal: 10,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 17,
  },
});