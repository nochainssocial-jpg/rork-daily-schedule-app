import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import type { Staff, Participant, DropOffAssignment, PickupAssignment } from '@/types/schedule';

export default function DropoffsPickupsScreen() {
  const insets = useSafeAreaInsets();
  const { staff, participants, selectedDate, updateCategory, getScheduleForDate } = useSchedule();
  const [dropOffs, setDropOffs] = useState<DropOffAssignment[]>([]);
  const [pickups, setPickups] = useState<PickupAssignment[]>([]);
  
  // Use useMemo to prevent infinite re-renders
  const schedule = useMemo(() => getScheduleForDate(selectedDate), [getScheduleForDate, selectedDate]);
  
  useEffect(() => {
    if (schedule) {
      setDropOffs(schedule.dropOffs || []);
      setPickups(schedule.pickups || []);
    }
  }, [schedule]);
  
  const getStaffName = (staffId: string) => {
    const staffMember = staff.find((s: Staff) => s.id === staffId);
    return staffMember?.name || 'Unknown';
  };
  
  const getParticipantName = (participantId: string) => {
    const participant = participants.find((p: Participant) => p.id === participantId);
    return participant?.name || 'Unknown';
  };
  
  // Use useMemo for derived state
  const assignedParticipants = useMemo(() => {
    if (!schedule) return [];
    return schedule.assignments.flatMap(assignment => assignment.participantIds);
  }, [schedule]);
  
  const toggleDropOffAssignment = (staffId: string, participantId: string) => {
    setDropOffs(prev => {
      const existingIndex = prev.findIndex(d => d.participantId === participantId);
      
      if (existingIndex >= 0) {
        // Remove if already assigned
        return prev.filter(d => d.participantId !== participantId);
      } else {
        // Add new assignment
        return [...prev, { participantId, staffId }];
      }
    });
  };
  
  const togglePickupAssignment = (participantId: string) => {
    setPickups(prev => {
      const existingIndex = prev.findIndex(p => p.participantId === participantId);
      
      if (existingIndex >= 0) {
        // Remove if already assigned
        return prev.filter(p => p.participantId !== participantId);
      } else {
        // Add new assignment (no staff assignment for pickups)
        return [...prev, { participantId, staffId: '' }];
      }
    });
  };
  
  const isParticipantAssignedToDropOff = (participantId: string) => {
    return dropOffs.some(d => d.participantId === participantId);
  };
  
  const isParticipantAssignedToPickup = (participantId: string) => {
    return pickups.some(p => p.participantId === participantId);
  };
  
  const getDropOffStaffForParticipant = (participantId: string) => {
    const dropOff = dropOffs.find(d => d.participantId === participantId);
    return dropOff?.staffId;
  };
  
  // Use useMemo for remaining participants (removed as we now show all participants in pickups)
  // const remainingParticipants = useMemo(() => {
  //   // Get participants not assigned to dropoffs
  //   return assignedParticipants.filter(participantId => !isParticipantAssignedToDropOff(participantId));
  // }, [assignedParticipants, dropOffs]);
  
  const handleSave = async () => {
    if (!schedule) return;
    
    const updatedSchedule = {
      ...schedule,
      dropOffs,
      pickups
    };
    
    try {
      await updateCategory('dropoffs_pickups', updatedSchedule);
      Alert.alert(
        'Success',
        'Drop-offs and pickups have been saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to save drop-offs and pickups. Please try again.');
    }
  };
  
  if (!schedule) {
    return (
      <>
        <Stack.Screen options={{ title: 'Drop-offs & Pickups', presentation: 'modal' }} />
        <View style={styles.container}>
          <Text style={styles.title}>No Schedule Found</Text>
          <Text style={styles.subtitle}>Please create a schedule first.</Text>
        </View>
      </>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Drop-offs & Pickups', 
          presentation: 'modal',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Drop-offs & Pickups</Text>
          <Text style={styles.subtitle}>Assign participants to staff members for transportation</Text>
        </View>
        
        {/* Drop-offs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drop-offs</Text>
          <Text style={styles.sectionDescription}>
            Select which participants need to be dropped off and assign them to staff members.
          </Text>
          
          {schedule.workingStaff
            .filter(staffId => {
              const staffMember = staff.find((s: Staff) => s.id === staffId);
              return staffMember?.name !== 'Everyone';
            })
            .map(staffId => {
            const staffMember = staff.find((s: Staff) => s.id === staffId);
            return (
              <View key={`dropoff-${staffId}`} style={styles.staffGroup}>
                <View style={styles.staffHeader}>
                  <View style={[styles.colorIndicator, { backgroundColor: staffMember?.color }]} />
                  <Text style={styles.staffName}>{getStaffName(staffId)}</Text>
                </View>
                
                <View style={styles.participantsList}>
                  {assignedParticipants.map(participantId => {
                    const isAssignedToThisStaff = getDropOffStaffForParticipant(participantId) === staffId;
                    const isAssignedToOtherStaff = isParticipantAssignedToDropOff(participantId) && !isAssignedToThisStaff;
                    const isAssignedToPickup = isParticipantAssignedToPickup(participantId);
                    const isUnavailable = isAssignedToOtherStaff || isAssignedToPickup;
                    
                    return (
                      <TouchableOpacity
                        key={`dropoff-${staffId}-${participantId}`}
                        style={[
                          styles.participantItem,
                          isAssignedToThisStaff && styles.assignedParticipant,
                          isUnavailable && styles.unavailableParticipant
                        ]}
                        onPress={() => toggleDropOffAssignment(staffId, participantId)}
                        disabled={isUnavailable}
                      >
                        <Text style={[
                          styles.participantText,
                          isAssignedToThisStaff && styles.assignedParticipantText,
                          isUnavailable && styles.unavailableParticipantText
                        ]}>
                          {getParticipantName(participantId)}
                        </Text>
                        {isAssignedToThisStaff && <Check size={16} color="white" />}
                        {isAssignedToPickup && !isAssignedToThisStaff && (
                          <Text style={styles.assignmentLabel}>PICKUP</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Pickups Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickups</Text>
          <Text style={styles.sectionDescription}>
            Select participants who need to be picked up in the afternoon (only showing those not assigned to drop-offs)
          </Text>
          
          <View style={styles.participantsList}>
            {assignedParticipants.map(participantId => {
              const isSelected = isParticipantAssignedToPickup(participantId);
              const isAssignedToDropOff = isParticipantAssignedToDropOff(participantId);
              
              return (
                <TouchableOpacity
                  key={`pickup-${participantId}`}
                  style={[
                    styles.participantItem,
                    isSelected && styles.assignedParticipant,
                    isAssignedToDropOff && styles.unavailableParticipant
                  ]}
                  onPress={() => togglePickupAssignment(participantId)}
                  disabled={isAssignedToDropOff}
                >
                  <Text style={[
                    styles.participantText,
                    isSelected && styles.assignedParticipantText,
                    isAssignedToDropOff && styles.unavailableParticipantText
                  ]}>
                    {getParticipantName(participantId)}
                  </Text>
                  {isSelected && <Check size={16} color="white" />}
                  {isSelected && (
                    <Text style={styles.assignmentLabel}>PICKUP</Text>
                  )}
                  {isAssignedToDropOff && !isSelected && (
                    <Text style={styles.assignmentLabel}>DROP-OFF</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {assignedParticipants.length === 0 && (
              <Text style={styles.emptyMessage}>
                No participants available for pickups.
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  saveButton: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  staffGroup: {
    marginBottom: 20,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  staffName: {
    fontSize: 20,
    fontWeight: '600' as const,
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
    fontSize: 16,
    color: '#333',
    fontWeight: '500' as const,
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
  remainingParticipant: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  assignmentLabel: {
    fontSize: 10,
    color: '#6C757D',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
});