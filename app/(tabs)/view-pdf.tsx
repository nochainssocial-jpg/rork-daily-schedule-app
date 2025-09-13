import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Share as RNShare, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import type { Staff, Participant, Chore, TimeSlot } from '@/types/schedule';
import { RefreshCw, AlertCircle, Share, FileText } from 'lucide-react-native';

export default function ViewPDFScreen() {
  const { selectedDate, getScheduleForDate, staff, participants, chores, timeSlots, hasNewUpdates, markUpdatesAsViewed, appVersion } = useSchedule();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const insets = useSafeAreaInsets();
  
  // Force re-render by using a timestamp dependency
  const schedule = getScheduleForDate(selectedDate);
  
  // Helper functions with useCallback for performance
  const getStaffName = useCallback((staffId: string) => {
    const staffMember = staff.find((s: Staff) => s.id === staffId);
    return staffMember?.name || 'Unknown';
  }, [staff]);

  const getParticipantName = useCallback((participantId: string) => {
    const participant = participants.find((p: Participant) => p.id === participantId);
    return participant?.name || 'Unknown';
  }, [participants]);

  const getChoreName = useCallback((choreId: string) => {
    const chore = chores.find((c: Chore) => c.id === choreId);
    return chore?.name || 'Unknown';
  }, [chores]);

  const getTimeSlotDisplay = useCallback((timeSlotId: string) => {
    const slot = timeSlots.find((t: TimeSlot) => t.id === timeSlotId);
    return slot?.displayTime || 'Unknown';
  }, [timeSlots]);

  // Check if selected date is Saturday
  const isSaturday = useCallback(() => {
    // selectedDate is in YYYY-MM-DD format
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getDay() === 6;
  }, [selectedDate]);
  
  // Group drop-offs by staff
  const getGroupedDropOffs = useCallback(() => {
    if (!schedule || schedule.dropOffs.length === 0) return [];
    
    const dropOffsByStaff = schedule.dropOffs.reduce((acc, dropOff) => {
      if (!acc[dropOff.staffId]) {
        acc[dropOff.staffId] = [];
      }
      acc[dropOff.staffId].push(dropOff);
      return acc;
    }, {} as Record<string, typeof schedule.dropOffs>);
    
    return Object.entries(dropOffsByStaff).map(([staffId, dropOffs]) => ({
      staffId,
      dropOffs
    }));
  }, [schedule]);
  
  // Group pickups by staff
  const getGroupedPickups = useCallback(() => {
    if (!schedule || schedule.pickups.length === 0) return [];
    
    const pickupsByStaff = schedule.pickups.reduce((acc, pickup) => {
      if (!acc[pickup.staffId]) {
        acc[pickup.staffId] = [];
      }
      acc[pickup.staffId].push(pickup);
      return acc;
    }, {} as Record<string, typeof schedule.pickups>);
    
    return Object.entries(pickupsByStaff).map(([staffId, pickups]) => ({
      staffId,
      pickups
    }));
  }, [schedule]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay for better UX
    setTimeout(() => {
      setLastRefresh(Date.now());
      setRefreshing(false);
      // Mark updates as viewed when refreshing
      if (hasNewUpdates) {
        markUpdatesAsViewed();
      }
    }, 500);
  }, [hasNewUpdates, markUpdatesAsViewed]);

  const generatePDFText = useCallback(() => {
    if (!schedule) return '';

    let pdfText = `DAILY SCHEDULE - ${(() => {
      const [year, month, day] = selectedDate.split('-');
      return `${day}/${month}/${year}`;
    })()}\n`;
    pdfText += `${'='.repeat(50)}\n\n`;

    // Staff Working Today
    pdfText += `1. STAFF WORKING TODAY\n`;
    pdfText += `${'-'.repeat(25)}\n`;
    if (schedule.workingStaff && schedule.workingStaff.length > 0) {
      schedule.workingStaff.forEach((staffId) => {
        pdfText += `• ${getStaffName(staffId)}\n`;
      });
    } else {
      pdfText += `No staff assigned\n`;
    }
    pdfText += `\n`;

    // Participants Attending Today
    pdfText += `2. PARTICIPANTS ATTENDING TODAY\n`;
    pdfText += `${'-'.repeat(32)}\n`;
    if (schedule.attendingParticipants && schedule.attendingParticipants.length > 0) {
      schedule.attendingParticipants.forEach((participantId) => {
        pdfText += `• ${getParticipantName(participantId)}\n`;
      });
    } else {
      pdfText += `No participants assigned\n`;
    }
    pdfText += `\n`;

    // Daily Assignment
    pdfText += `3. DAILY ASSIGNMENT\n`;
    pdfText += `${'-'.repeat(18)}\n`;
    schedule.assignments.forEach((assignment) => {
      pdfText += `${getStaffName(assignment.staffId)}:\n`;
      assignment.participantIds.forEach(participantId => {
        pdfText += `  • ${getParticipantName(participantId)}\n`;
      });
      pdfText += `\n`;
    });

    // Front Room - Not shown on Saturdays
    if (!isSaturday()) {
      pdfText += `4. FRONT ROOM\n`;
      pdfText += `${'-'.repeat(12)}\n`;
      schedule.frontRoomSlots.forEach((slot) => {
        pdfText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      pdfText += `\n`;

      // Scotty
      pdfText += `5. SCOTTY\n`;
      pdfText += `${'-'.repeat(8)}\n`;
      schedule.scottySlots.forEach((slot) => {
        pdfText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      pdfText += `\n`;

      // Twins
      pdfText += `6. TWINS\n`;
      pdfText += `${'-'.repeat(7)}\n`;
      schedule.twinsSlots.forEach((slot) => {
        pdfText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      pdfText += `\n`;
    }

    // Chores
    pdfText += `${isSaturday() ? '4' : '7'}. CHORES\n`;
    pdfText += `${'-'.repeat(8)}\n`;
    schedule.choreAssignments.forEach((assignment) => {
      pdfText += `${getChoreName(assignment.choreId)} - ${getStaffName(assignment.staffId)}\n`;
    });
    pdfText += `\n`;

    // Drop-offs
    pdfText += `${isSaturday() ? '5' : '8'}. DROP-OFFS\n`;
    pdfText += `${'-'.repeat(11)}\n`;
    const groupedDropOffs = getGroupedDropOffs();
    if (groupedDropOffs.length > 0) {
      groupedDropOffs.forEach((group) => {
        pdfText += `${getStaffName(group.staffId)}:\n`;
        pdfText += `  ${group.dropOffs.map(d => getParticipantName(d.participantId)).join(', ')}\n`;
      });
    } else {
      pdfText += `No drop-offs scheduled\n`;
    }
    pdfText += `\n`;

    // Pickups
    pdfText += `${isSaturday() ? '6' : '9'}. PICKUPS\n`;
    pdfText += `${'-'.repeat(9)}\n`;
    const groupedPickups = getGroupedPickups();
    if (groupedPickups.length > 0) {
      groupedPickups.forEach((group) => {
        pdfText += `${getStaffName(group.staffId)}:\n`;
        pdfText += `  ${group.pickups.map(p => getParticipantName(p.participantId)).join(', ')}\n`;
      });
    } else {
      pdfText += `No pickups scheduled\n`;
    }
    pdfText += `\n`;

    // Final Checklist
    pdfText += `${isSaturday() ? '7' : '10'}. FINAL CHECKLIST\n`;
    pdfText += `${'-'.repeat(16)}\n`;
    pdfText += `Assigned to: ${getStaffName(schedule.finalChecklistStaff)}\n`;
    pdfText += `\n`;

    pdfText += `${'='.repeat(50)}\n`;
    pdfText += `Generated on: ${new Date().toLocaleString()}\n`;
    pdfText += `App Version: ${appVersion}\n`;

    return pdfText;
  }, [schedule, selectedDate, appVersion, getStaffName, getParticipantName, getChoreName, getTimeSlotDisplay, isSaturday, getGroupedDropOffs, getGroupedPickups]);

  const sharePDF = useCallback(async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to share');
      return;
    }

    const pdfText = generatePDFText();
    const fileName = `Daily_Schedule_${selectedDate.replace(/-/g, '_')}.txt`;
    
    try {
      if (Platform.OS === 'web') {
        // Create a blob and download it as a file on web
        const blob = new Blob([pdfText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'PDF file downloaded successfully!');
      } else {
        // For mobile, share as text file attachment
        await RNShare.share({
          message: pdfText,
          title: `Daily Schedule - ${(() => {
            const [year, month, day] = selectedDate.split('-');
            return `${day}/${month}/${year}`;
          })()}`,
        });
      }
    } catch (error) {
      console.log('Error sharing PDF:', error);
      Alert.alert('Error', 'Unable to share PDF. Please try again.');
    }
  }, [schedule, generatePDFText, selectedDate]);

  // Auto-refresh when critical updates are detected
  useEffect(() => {
    if (hasNewUpdates) {
      // Show alert about new updates
      Alert.alert(
        'App Updated',
        'The app has been updated with new features and improvements. The view has been refreshed automatically.',
        [
          {
            text: 'OK',
            onPress: () => {
              setRefreshing(true);
              setTimeout(() => {
                setLastRefresh(Date.now());
                setRefreshing(false);
                markUpdatesAsViewed();
              }, 500);
            }
          }
        ]
      );
    }
  }, [hasNewUpdates, markUpdatesAsViewed]);

  // Category colors matching home screen
  const categoryColors = {
    staff: '#4A90E2',
    participants: '#7B68EE',
    assignments: '#FF6B6B',
    frontRoom: '#4ECDC4',
    scotty: '#95E77E',
    twins: '#FFD93D',
    chores: '#FF8C42',
    dropOffs: '#A8DADC',
    pickups: '#B19CD9',
    finalChecklist: '#E56B6F',
  };

  if (!schedule) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Schedule Available</Text>
          <Text style={styles.emptyText}>Create a schedule to view the PDF format.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
        />
      }
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Schedule Overview</Text>
            <Text style={styles.date}>{(() => {
              // Convert YYYY-MM-DD to DD/MM/YYYY for display
              const [year, month, day] = selectedDate.split('-');
              return `${day}/${month}/${year}`;
            })()}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshButton, hasNewUpdates && styles.refreshButtonHighlight]} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            {hasNewUpdates && (
              <AlertCircle 
                size={16} 
                color="#FF6B6B" 
              />
            )}
            <RefreshCw 
              size={20} 
              color={refreshing ? '#999' : hasNewUpdates ? '#FF6B6B' : '#007AFF'} 
            />
            <Text style={[styles.refreshText, refreshing && styles.refreshTextDisabled, hasNewUpdates && styles.refreshTextHighlight]}>
              {hasNewUpdates ? 'Update' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.lastUpdated}>Pull down to refresh</Text>
          {hasNewUpdates && (
            <Text style={styles.updateBadge}>New updates available!</Text>
          )}
        </View>
        <View style={styles.actionRow}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
          <TouchableOpacity 
            style={styles.sharePDFButton} 
            onPress={sharePDF}
          >
            <FileText size={16} color="white" />
            <Text style={styles.sharePDFText}>Share PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Staff Working Today */}
      <View style={[styles.section, { borderLeftColor: categoryColors.staff }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.staff }]}>1. Staff Working Today</Text>
        {schedule.workingStaff && schedule.workingStaff.length > 0 ? (
          schedule.workingStaff.map((staffId, index) => (
            <Text key={index} style={styles.listItem}>• {getStaffName(staffId)}</Text>
          ))
        ) : (
          <Text style={styles.noItems}>No staff assigned</Text>
        )}
      </View>

      {/* Participants Attending Today */}
      <View style={[styles.section, { borderLeftColor: categoryColors.participants }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.participants }]}>2. Participants Attending Today</Text>
        {schedule.attendingParticipants && schedule.attendingParticipants.length > 0 ? (
          schedule.attendingParticipants.map((participantId, index) => (
            <Text key={index} style={styles.listItem}>• {getParticipantName(participantId)}</Text>
          ))
        ) : (
          <Text style={styles.noItems}>No participants assigned</Text>
        )}
      </View>

      {/* Daily Assignment */}
      <View style={[styles.section, { borderLeftColor: categoryColors.assignments }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.assignments }]}>3. Daily Assignment</Text>
        {schedule.assignments.map((assignment, index) => (
          <View key={index} style={styles.assignmentItem}>
            <Text style={styles.staffName}>{getStaffName(assignment.staffId)}</Text>
            {assignment.participantIds.map(participantId => (
              <Text key={participantId} style={styles.participantName}>
                • {getParticipantName(participantId)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Front Room - Not shown on Saturdays */}
      {!isSaturday() && (
        <View style={[styles.section, { borderLeftColor: categoryColors.frontRoom }]}>
          <Text style={[styles.sectionTitle, { color: categoryColors.frontRoom }]}>4. Front Room</Text>
          {schedule.frontRoomSlots.map((slot, index) => (
            <View key={index} style={styles.timeSlotItem}>
              <Text style={styles.timeSlot}>{getTimeSlotDisplay(slot.timeSlotId)}</Text>
              <Text style={styles.assignedStaff}>{getStaffName(slot.staffId)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Scotty - Not shown on Saturdays */}
      {!isSaturday() && (
        <View style={[styles.section, { borderLeftColor: categoryColors.scotty }]}>
          <Text style={[styles.sectionTitle, { color: categoryColors.scotty }]}>5. Scotty</Text>
          {schedule.scottySlots.map((slot, index) => (
            <View key={index} style={styles.timeSlotItem}>
              <Text style={styles.timeSlot}>{getTimeSlotDisplay(slot.timeSlotId)}</Text>
              <Text style={styles.assignedStaff}>{getStaffName(slot.staffId)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Twins - Not shown on Saturdays */}
      {!isSaturday() && (
        <View style={[styles.section, { borderLeftColor: categoryColors.twins }]}>
          <Text style={[styles.sectionTitle, { color: categoryColors.twins }]}>6. Twins</Text>
          {schedule.twinsSlots.map((slot, index) => (
            <View key={index} style={styles.timeSlotItem}>
              <Text style={styles.timeSlot}>{getTimeSlotDisplay(slot.timeSlotId)}</Text>
              <Text style={styles.assignedStaff}>{getStaffName(slot.staffId)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Chores */}
      <View style={[styles.section, { borderLeftColor: categoryColors.chores }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.chores }]}>{isSaturday() ? '4' : '7'}. Chores</Text>
        {schedule.choreAssignments.map((assignment, index) => (
          <View key={index} style={styles.choreItem}>
            <Text style={styles.choreName}>{getChoreName(assignment.choreId)}</Text>
            <Text style={styles.assignedStaff}>{getStaffName(assignment.staffId)}</Text>
          </View>
        ))}
      </View>

      {/* Drop-offs */}
      <View style={[styles.section, { borderLeftColor: categoryColors.dropOffs }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.dropOffs }]}>{isSaturday() ? '5' : '8'}. Drop-offs</Text>
        {getGroupedDropOffs().length > 0 ? (
          getGroupedDropOffs().map((group, index) => (
            <View key={`dropoff-${group.staffId}`} style={styles.dropOffContainer}>
              <Text style={styles.dropOffStaffName}>
                {getStaffName(group.staffId)}
              </Text>
              <Text style={styles.dropOffParticipants}>
                {group.dropOffs.map(d => getParticipantName(d.participantId)).join(', ')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noItems}>No drop-offs scheduled</Text>
        )}
      </View>

      {/* Pickups */}
      <View style={[styles.section, { borderLeftColor: categoryColors.pickups }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.pickups }]}>{isSaturday() ? '6' : '9'}. Pickups</Text>
        {getGroupedPickups().length > 0 ? (
          getGroupedPickups().map((group, index) => (
            <View key={`pickup-${group.staffId}`} style={styles.pickupContainer}>
              <Text style={styles.pickupStaffName}>
                {getStaffName(group.staffId)}
              </Text>
              <Text style={styles.pickupParticipants}>
                {group.pickups.map(p => getParticipantName(p.participantId)).join(', ')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noItems}>No pickups scheduled</Text>
        )}
      </View>

      {/* Final Checklist */}
      <View style={[styles.section, { borderLeftColor: categoryColors.finalChecklist }]}>
        <Text style={[styles.sectionTitle, { color: categoryColors.finalChecklist }]}>{isSaturday() ? '7' : '10'}. Final Checklist</Text>
        <Text style={styles.finalChecklistStaff}>
          Assigned to: {getStaffName(schedule.finalChecklistStaff)}
        </Text>
      </View>
    </ScrollView>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  refreshText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  refreshTextDisabled: {
    color: '#999',
  },
  refreshButtonHighlight: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  refreshTextHighlight: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  updateBadge: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sharePDFButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  sharePDFText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  assignmentItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeSlot: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  assignedStaff: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  choreItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  choreName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  dropOffContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropOffStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  dropOffParticipants: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  pickupContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickupStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  pickupParticipants: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  noItems: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  finalChecklistStaff: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    marginLeft: 8,
  },
});