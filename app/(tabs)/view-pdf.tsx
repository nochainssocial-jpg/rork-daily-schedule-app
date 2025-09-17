import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Share as RNShare, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import type { Staff, Participant, Chore, TimeSlot, DropOffAssignment, PickupAssignment } from '@/types/schedule';
import { RefreshCw, AlertCircle, FileText, UserPlus, X, Printer } from 'lucide-react-native';

export default function ViewPDFScreen() {
  const { selectedDate, getScheduleForDate, staff, participants, chores, timeSlots, hasNewUpdates, markUpdatesAsViewed, appVersion, updateScheduleImmediately } = useSchedule();
  const [refreshing, setRefreshing] = useState(false);
  const [reassignModal, setReassignModal] = useState<{ 
    type: 'frontRoom' | 'scotty' | 'twins'; 
    timeSlotId: string;
    currentStaffId?: string;
  } | null>(null);
  const insets = useSafeAreaInsets();
  
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
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getDay() === 6;
  }, [selectedDate]);
  
  // Group drop-offs by staff - moved outside conditional rendering
  const groupedDropOffs = useMemo(() => {
    if (!schedule || !schedule.dropOffs || schedule.dropOffs.length === 0) return [];
    
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
  
  // Group pickups by staff - moved outside conditional rendering
  const groupedPickups = useMemo(() => {
    if (!schedule || !schedule.pickups || schedule.pickups.length === 0) return [];
    
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
    setTimeout(() => {
      setRefreshing(false);
      if (hasNewUpdates) {
        markUpdatesAsViewed();
      }
    }, 500);
  }, [hasNewUpdates, markUpdatesAsViewed]);

  const generateScheduleText = useCallback(() => {
    if (!schedule) return '';

    let scheduleText = `DAILY SCHEDULE - ${(() => {
      const [year, month, day] = selectedDate.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    })()}\n`;
    scheduleText += `${'='.repeat(50)}\n\n`;

    // Staff Working Today
    scheduleText += `1. STAFF WORKING TODAY\n`;
    scheduleText += `${'-'.repeat(25)}\n`;
    if (schedule.workingStaff && schedule.workingStaff.length > 0) {
      schedule.workingStaff.forEach((staffId) => {
        scheduleText += `• ${getStaffName(staffId)}\n`;
      });
    } else {
      scheduleText += `No staff assigned\n`;
    }
    scheduleText += `\n`;

    // Participants Attending Today
    scheduleText += `2. PARTICIPANTS ATTENDING TODAY\n`;
    scheduleText += `${'-'.repeat(32)}\n`;
    if (schedule.attendingParticipants && schedule.attendingParticipants.length > 0) {
      schedule.attendingParticipants.forEach((participantId) => {
        scheduleText += `• ${getParticipantName(participantId)}\n`;
      });
    } else {
      scheduleText += `No participants assigned\n`;
    }
    scheduleText += `\n`;

    // Daily Assignment
    scheduleText += `3. DAILY ASSIGNMENT\n`;
    scheduleText += `${'-'.repeat(18)}\n`;
    schedule.assignments.forEach((assignment) => {
      scheduleText += `${getStaffName(assignment.staffId)}:\n`;
      assignment.participantIds.forEach(participantId => {
        scheduleText += `  • ${getParticipantName(participantId)}\n`;
      });
      scheduleText += `\n`;
    });

    // Front Room - Not shown on Saturdays
    if (!isSaturday()) {
      scheduleText += `4. FRONT ROOM\n`;
      scheduleText += `${'-'.repeat(12)}\n`;
      schedule.frontRoomSlots.forEach((slot) => {
        scheduleText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      scheduleText += `\n`;

      // Scotty
      scheduleText += `5. SCOTTY\n`;
      scheduleText += `${'-'.repeat(8)}\n`;
      schedule.scottySlots.forEach((slot) => {
        scheduleText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      scheduleText += `\n`;

      // Twins
      scheduleText += `6. TWINS\n`;
      scheduleText += `${'-'.repeat(7)}\n`;
      schedule.twinsSlots.forEach((slot) => {
        scheduleText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      scheduleText += `\n`;
    }

    // Chores
    scheduleText += `${isSaturday() ? '4' : '7'}. CHORES\n`;
    scheduleText += `${'-'.repeat(8)}\n`;
    schedule.choreAssignments.forEach((assignment) => {
      scheduleText += `${getChoreName(assignment.choreId)} - ${getStaffName(assignment.staffId)}\n`;
    });
    scheduleText += `\n`;

    // Drop-offs
    scheduleText += `${isSaturday() ? '5' : '8'}. DROP-OFFS\n`;
    scheduleText += `${'-'.repeat(11)}\n`;
    if (groupedDropOffs.length > 0) {
      groupedDropOffs.forEach((group: { staffId: string; dropOffs: DropOffAssignment[] }) => {
        scheduleText += `${getStaffName(group.staffId)}:\n`;
        scheduleText += `  ${group.dropOffs.map((d: DropOffAssignment) => getParticipantName(d.participantId)).join(', ')}\n`;
      });
    } else {
      scheduleText += `No drop-offs scheduled\n`;
    }
    scheduleText += `\n`;

    // Pickups
    scheduleText += `${isSaturday() ? '6' : '9'}. PICKUPS\n`;
    scheduleText += `${'-'.repeat(9)}\n`;
    if (groupedPickups.length > 0) {
      groupedPickups.forEach((group: { staffId: string; pickups: PickupAssignment[] }) => {
        scheduleText += `${getStaffName(group.staffId)}:\n`;
        scheduleText += `  ${group.pickups.map((p: PickupAssignment) => getParticipantName(p.participantId)).join(', ')}\n`;
      });
    } else {
      scheduleText += `No pickups scheduled\n`;
    }
    scheduleText += `\n`;

    // Final Checklist
    scheduleText += `${isSaturday() ? '7' : '10'}. FINAL CHECKLIST\n`;
    scheduleText += `${'-'.repeat(16)}\n`;
    scheduleText += `Assigned to: ${getStaffName(schedule.finalChecklistStaff)}\n`;
    scheduleText += `\n`;

    scheduleText += `${'='.repeat(50)}\n`;
    scheduleText += `Generated on: ${(() => {
      const now = new Date();
      return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    })()}\n`;
    scheduleText += `App Version: ${appVersion}\n`;

    return scheduleText;
  }, [schedule, selectedDate, appVersion, getStaffName, getParticipantName, getChoreName, getTimeSlotDisplay, isSaturday, groupedDropOffs, groupedPickups]);

  const printSchedule = useCallback(() => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to print');
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert('Print Not Available', 'Printing is only available on web browsers.');
      return;
    }

    // Generate HTML content for printing
    const generatePrintHTML = () => {
      const formatDate = () => {
        const [year, month, day] = selectedDate.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      };

      const pageStyle = `
        <style>
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-after: always;
            min-height: 100vh;
            padding: 20px;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .date {
            font-size: 16px;
            color: #666;
            margin: 5px 0 0 0;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #007AFF;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .item {
            margin: 5px 0;
            padding-left: 10px;
          }
          .staff-group {
            margin: 10px 0;
            padding: 10px;
            background-color: #f9f9f9;
            border-left: 4px solid #007AFF;
          }
          .staff-name {
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 5px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .table th, .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
          }
          .table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .chore-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          .no-items {
            color: #999;
            font-style: italic;
            padding: 10px;
          }
        </style>
      `;

      // Page 1: Overview
      const overviewPage = `
        <div class="page">
          <div class="header">
            <h1 class="title">Daily Schedule Overview</h1>
            <p class="date">${formatDate()}</p>
          </div>
          
          <div class="section-title">1. Staff Working Today</div>
          ${schedule.workingStaff && schedule.workingStaff.length > 0 ? 
            schedule.workingStaff.map(staffId => `<div class="item">• ${getStaffName(staffId)}</div>`).join('') :
            '<div class="no-items">No staff assigned</div>'
          }
          
          <div class="section-title">2. Participants Attending Today</div>
          ${schedule.attendingParticipants && schedule.attendingParticipants.length > 0 ? 
            schedule.attendingParticipants.map(participantId => `<div class="item">• ${getParticipantName(participantId)}</div>`).join('') :
            '<div class="no-items">No participants assigned</div>'
          }
          
          <div class="section-title">3. Daily Assignment</div>
          ${schedule.assignments.map(assignment => `
            <div class="staff-group">
              <div class="staff-name">${getStaffName(assignment.staffId)}</div>
              ${assignment.participantIds.map(participantId => `<div class="item">• ${getParticipantName(participantId)}</div>`).join('')}
            </div>
          `).join('')}
        </div>
      `;

      // Page 2: Time Slots (only if not Saturday)
      const timeSlotsPage = !isSaturday() ? `
        <div class="page">
          <div class="header">
            <h1 class="title">Time Slot Assignments</h1>
            <p class="date">${formatDate()}</p>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Front Room</th>
                <th>Scott</th>
                <th>Twins</th>
              </tr>
            </thead>
            <tbody>
              ${timeSlots.map(timeSlot => {
                const frontRoomSlot = schedule.frontRoomSlots.find(s => s.timeSlotId === timeSlot.id);
                const scottySlot = schedule.scottySlots.find(s => s.timeSlotId === timeSlot.id);
                const twinsSlot = schedule.twinsSlots.find(s => s.timeSlotId === timeSlot.id);
                return `
                  <tr>
                    <td>${timeSlot.displayTime}</td>
                    <td>${frontRoomSlot ? getStaffName(frontRoomSlot.staffId) : '-'}</td>
                    <td>${scottySlot ? getStaffName(scottySlot.staffId) : '-'}</td>
                    <td>${twinsSlot ? getStaffName(twinsSlot.staffId) : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '';

      // Page 3: Chores and Tasks
      const choresPage = `
        <div class="page">
          <div class="header">
            <h1 class="title">Chores and Tasks</h1>
            <p class="date">${formatDate()}</p>
          </div>
          
          <div class="section-title">${isSaturday() ? '4' : '7'}. Chores</div>
          ${schedule.choreAssignments.map(assignment => `
            <div class="chore-item">
              <span>${getChoreName(assignment.choreId)}</span>
              <span><strong>${getStaffName(assignment.staffId)}</strong></span>
            </div>
          `).join('')}
          
          <div class="section-title">${isSaturday() ? '7' : '10'}. Final Checklist</div>
          <div class="staff-group">
            <div class="staff-name">Assigned to: ${getStaffName(schedule.finalChecklistStaff)}</div>
          </div>
        </div>
      `;

      // Page 4: Drop-offs and Pickups
      const transportPage = `
        <div class="page">
          <div class="header">
            <h1 class="title">Drop-offs and Pickups</h1>
            <p class="date">${formatDate()}</p>
          </div>
          
          <div class="section-title">${isSaturday() ? '5' : '8'}. Drop-offs</div>
          ${groupedDropOffs.length > 0 ? 
            groupedDropOffs.map(group => `
              <div class="staff-group">
                <div class="staff-name">${getStaffName(group.staffId)}</div>
                <div class="item">${group.dropOffs.map(d => getParticipantName(d.participantId)).join(', ')}</div>
              </div>
            `).join('') :
            '<div class="no-items">No drop-offs scheduled</div>'
          }
          
          <div class="section-title">${isSaturday() ? '6' : '9'}. Pickups</div>
          ${groupedPickups.length > 0 ? 
            groupedPickups.map(group => `
              <div class="staff-group">
                <div class="staff-name">${getStaffName(group.staffId)}</div>
                <div class="item">${group.pickups.map(p => getParticipantName(p.participantId)).join(', ')}</div>
              </div>
            `).join('') :
            '<div class="no-items">No pickups scheduled</div>'
          }
        </div>
      `;

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Daily Schedule - ${formatDate()}</title>
          ${pageStyle}
        </head>
        <body>
          ${overviewPage}
          ${timeSlotsPage}
          ${choresPage}
          ${transportPage}
        </body>
        </html>
      `;
    };

    // Create and open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      
      // Wait for content to load then show print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      Alert.alert('Print Error', 'Unable to open print window. Please check your browser settings.');
    }
  }, [schedule, selectedDate, getStaffName, getParticipantName, getChoreName, getTimeSlotDisplay, isSaturday, groupedDropOffs, groupedPickups, timeSlots]);

  const shareSchedule = useCallback(async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to share');
      return;
    }

    const scheduleText = generateScheduleText();
    const fileName = `Daily_Schedule_${selectedDate.replace(/-/g, '_')}.txt`;
    
    try {
      const shareOptions = {
        message: scheduleText,
        title: `Daily Schedule - ${(() => {
          const [year, month, day] = selectedDate.split('-');
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        })()}`,
      };
      
      const result = await RNShare.share(shareOptions);
      
      if (result.action === RNShare.sharedAction) {
        console.log('Schedule shared successfully');
      }
    } catch (error) {
      console.error('Error sharing schedule:', error);
      
      // Fallback for web
      if (Platform.OS === 'web' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(scheduleText);
          Alert.alert('Copied!', 'Schedule copied to clipboard');
        } catch (clipboardError) {
          Alert.alert('Error', 'Unable to share schedule. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Unable to share schedule. Please try again.');
      }
    }
  }, [schedule, selectedDate, generateScheduleText]);

  // Auto-refresh when critical updates are detected
  useEffect(() => {
    if (hasNewUpdates) {
      Alert.alert(
        'App Updated',
        'The app has been updated with new features and improvements. The view has been refreshed automatically.',
        [
          {
            text: 'OK',
            onPress: () => {
              setRefreshing(true);
              setTimeout(() => {
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Schedule Available</Text>
          <Text style={styles.emptyText}>Create a schedule to view the formatted version.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Schedule Overview</Text>
            <Text style={styles.date}>{(() => {
              const [year, month, day] = selectedDate.split('-');
              return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
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
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.printButton} 
              onPress={printSchedule}
            >
              <Printer size={16} color="white" />
              <Text style={styles.printButtonText}>Print PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={shareSchedule}
            >
              <FileText size={16} color="white" />
              <Text style={styles.shareButtonText}>Share Schedule</Text>
            </TouchableOpacity>
          </View>
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
            <Text style={styles.staffNameHeader}>{getStaffName(assignment.staffId)}</Text>
            {assignment.participantIds.map(participantId => (
              <Text key={participantId} style={styles.participantName}>
                • {getParticipantName(participantId)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Time Slots Table - Not shown on Saturdays */}
      {!isSaturday() && (
        <View style={[styles.section, { borderLeftColor: categoryColors.frontRoom }]}>
          <Text style={[styles.sectionTitle, { color: categoryColors.frontRoom }]}>4. Time Slot Assignments</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.timeColumn}>
              <Text style={styles.tableHeaderCell}>Time</Text>
            </View>
            <View style={styles.staffColumn}>
              <Text style={styles.tableHeaderCell}>Front Room</Text>
            </View>
            <View style={styles.staffColumn}>
              <Text style={styles.tableHeaderCell}>Scott</Text>
            </View>
            <View style={styles.staffColumn}>
              <Text style={styles.tableHeaderCell}>Twins</Text>
            </View>
          </View>
          
          {/* Table Rows */}
          {timeSlots.map((timeSlot) => {
            const frontRoomSlot = schedule.frontRoomSlots.find(s => s.timeSlotId === timeSlot.id);
            const scottySlot = schedule.scottySlots.find(s => s.timeSlotId === timeSlot.id);
            const twinsSlot = schedule.twinsSlots.find(s => s.timeSlotId === timeSlot.id);
            
            return (
              <View key={timeSlot.id} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.timeColumn]}>
                  <Text style={styles.timeText}>{timeSlot.displayTime}</Text>
                </View>
                
                {/* Front Room Cell */}
                <TouchableOpacity
                  style={[styles.tableCell, styles.staffColumn]}
                  onPress={() => {
                    setReassignModal({ 
                      type: 'frontRoom', 
                      timeSlotId: timeSlot.id,
                      currentStaffId: frontRoomSlot?.staffId
                    });
                  }}
                >
                  <View style={styles.reassignableCell}>
                    <Text style={styles.staffName}>
                      {frontRoomSlot ? getStaffName(frontRoomSlot.staffId) : '-'}
                    </Text>
                    <UserPlus size={14} color="#007AFF" />
                  </View>
                </TouchableOpacity>
                
                {/* Scott Cell */}
                <TouchableOpacity
                  style={[styles.tableCell, styles.staffColumn]}
                  onPress={() => {
                    setReassignModal({ 
                      type: 'scotty', 
                      timeSlotId: timeSlot.id,
                      currentStaffId: scottySlot?.staffId
                    });
                  }}
                >
                  <View style={styles.reassignableCell}>
                    <Text style={styles.staffName}>
                      {scottySlot ? getStaffName(scottySlot.staffId) : '-'}
                    </Text>
                    <UserPlus size={14} color="#007AFF" />
                  </View>
                </TouchableOpacity>
                
                {/* Twins Cell */}
                <TouchableOpacity
                  style={[styles.tableCell, styles.staffColumn]}
                  onPress={() => {
                    setReassignModal({ 
                      type: 'twins', 
                      timeSlotId: timeSlot.id,
                      currentStaffId: twinsSlot?.staffId
                    });
                  }}
                >
                  <View style={styles.reassignableCell}>
                    <Text style={styles.staffName}>
                      {twinsSlot ? getStaffName(twinsSlot.staffId) : '-'}
                    </Text>
                    <UserPlus size={14} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
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
        {groupedDropOffs.length > 0 ? (
          groupedDropOffs.map((group: { staffId: string; dropOffs: DropOffAssignment[] }, index: number) => (
            <View key={`dropoff-${group.staffId}`} style={styles.dropOffContainer}>
              <Text style={styles.dropOffStaffName}>
                {getStaffName(group.staffId)}
              </Text>
              <Text style={styles.dropOffParticipants}>
                {group.dropOffs.map((d: DropOffAssignment) => getParticipantName(d.participantId)).join(', ')}
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
        {groupedPickups.length > 0 ? (
          groupedPickups.map((group: { staffId: string; pickups: PickupAssignment[] }, index: number) => (
            <View key={`pickup-${group.staffId}`} style={styles.pickupContainer}>
              <Text style={styles.pickupStaffName}>
                {getStaffName(group.staffId)}
              </Text>
              <Text style={styles.pickupParticipants}>
                {group.pickups.map((p: PickupAssignment) => getParticipantName(p.participantId)).join(', ')}
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

      {/* Reassign Modal */}
      <Modal
        visible={reassignModal !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReassignModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Re-assign {reassignModal?.type === 'frontRoom' ? 'Front Room' : 
                          reassignModal?.type === 'scotty' ? 'Scott' : 'Twins'} Slot
              </Text>
              <TouchableOpacity
                onPress={() => setReassignModal(null)}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {reassignModal && (
              <>
                <Text style={styles.modalSubtitle}>
                  Time: {getTimeSlotDisplay(reassignModal.timeSlotId)}
                </Text>
                <Text style={styles.modalCurrentStaff}>
                  Currently assigned: {reassignModal.currentStaffId ? getStaffName(reassignModal.currentStaffId) : 'None'}
                </Text>
                
                <View style={styles.modalDivider} />
                
                <Text style={styles.modalSectionTitle}>Select Staff Member:</Text>
                
                <FlatList
                  data={schedule.workingStaff}
                  keyExtractor={(item) => item}
                  style={styles.staffList}
                  renderItem={({ item: staffId }) => {
                    const isCurrentlyAssigned = staffId === reassignModal.currentStaffId;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.staffOption,
                          isCurrentlyAssigned && styles.staffOptionSelected
                        ]}
                        onPress={() => {
                          const updatedSchedule = { ...schedule };
                          
                          if (reassignModal.type === 'frontRoom') {
                            const slotIndex = updatedSchedule.frontRoomSlots.findIndex(
                              s => s.timeSlotId === reassignModal.timeSlotId
                            );
                            if (slotIndex >= 0) {
                              updatedSchedule.frontRoomSlots[slotIndex].staffId = staffId;
                            } else {
                              updatedSchedule.frontRoomSlots.push({ 
                                timeSlotId: reassignModal.timeSlotId, 
                                staffId 
                              });
                            }
                          } else if (reassignModal.type === 'scotty') {
                            const slotIndex = updatedSchedule.scottySlots.findIndex(
                              s => s.timeSlotId === reassignModal.timeSlotId
                            );
                            if (slotIndex >= 0) {
                              updatedSchedule.scottySlots[slotIndex].staffId = staffId;
                            } else {
                              updatedSchedule.scottySlots.push({ 
                                timeSlotId: reassignModal.timeSlotId, 
                                staffId 
                              });
                            }
                          } else if (reassignModal.type === 'twins') {
                            const slotIndex = updatedSchedule.twinsSlots.findIndex(
                              s => s.timeSlotId === reassignModal.timeSlotId
                            );
                            if (slotIndex >= 0) {
                              updatedSchedule.twinsSlots[slotIndex].staffId = staffId;
                            } else {
                              updatedSchedule.twinsSlots.push({ 
                                timeSlotId: reassignModal.timeSlotId, 
                                staffId 
                              });
                            }
                          }
                          
                          updateScheduleImmediately(updatedSchedule);
                          setReassignModal(null);
                        }}
                      >
                        <Text style={[
                          styles.staffOptionText,
                          isCurrentlyAssigned && styles.staffOptionTextSelected
                        ]}>
                          {getStaffName(staffId)}
                        </Text>
                        {isCurrentlyAssigned && (
                          <Text style={styles.currentBadge}>Current</Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
                
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    const updatedSchedule = { ...schedule };
                    
                    if (reassignModal.type === 'frontRoom') {
                      updatedSchedule.frontRoomSlots = updatedSchedule.frontRoomSlots.filter(
                        s => s.timeSlotId !== reassignModal.timeSlotId
                      );
                    } else if (reassignModal.type === 'scotty') {
                      updatedSchedule.scottySlots = updatedSchedule.scottySlots.filter(
                        s => s.timeSlotId !== reassignModal.timeSlotId
                      );
                    } else if (reassignModal.type === 'twins') {
                      updatedSchedule.twinsSlots = updatedSchedule.twinsSlots.filter(
                        s => s.timeSlotId !== reassignModal.timeSlotId
                      );
                    }
                    
                    updateScheduleImmediately(updatedSchedule);
                    setReassignModal(null);
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear Assignment</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  printButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  shareButtonText: {
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
  staffNameHeader: {
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
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 4,
    textAlign: 'center' as const,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
    minHeight: 44,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  timeColumn: {
    flex: 0.8,
    minWidth: 80,
  },
  staffColumn: {
    flex: 1,
    minWidth: 90,
  },
  reassignableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    minHeight: 32,
  },
  staffName: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalCurrentStaff: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  staffList: {
    maxHeight: 300,
  },
  staffOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  staffOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  staffOptionText: {
    fontSize: 16,
    color: '#333',
  },
  staffOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  currentBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center' as const,
  },
});