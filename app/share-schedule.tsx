import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Share as RNShare } from 'react-native';
import { Stack, router } from 'expo-router';
import { FileText, MessageSquare, Copy, Printer } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import type { Staff, Participant, Chore, TimeSlot } from '@/types/schedule';

export default function ShareScheduleScreen() {
  const { selectedDate, getScheduleForDate, staff, participants, chores, timeSlots, appVersion } = useSchedule();
  const [isGenerating, setIsGenerating] = useState(false);
  const insets = useSafeAreaInsets();
  
  const schedule = getScheduleForDate(selectedDate);
  
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

  const isSaturday = useCallback(() => {
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getDay() === 6;
  }, [selectedDate]);

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

    // Time slots (not on Saturday)
    if (!isSaturday()) {
      scheduleText += `4. FRONT ROOM\n`;
      scheduleText += `${'-'.repeat(12)}\n`;
      schedule.frontRoomSlots.forEach((slot) => {
        scheduleText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      scheduleText += `\n`;

      scheduleText += `5. SCOTTY\n`;
      scheduleText += `${'-'.repeat(8)}\n`;
      schedule.scottySlots.forEach((slot) => {
        scheduleText += `${getTimeSlotDisplay(slot.timeSlotId)} - ${getStaffName(slot.staffId)}\n`;
      });
      scheduleText += `\n`;

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
    if (schedule.dropOffs && schedule.dropOffs.length > 0) {
      const dropOffsByStaff = schedule.dropOffs.reduce((acc, dropOff) => {
        if (!acc[dropOff.staffId]) {
          acc[dropOff.staffId] = [];
        }
        acc[dropOff.staffId].push(dropOff);
        return acc;
      }, {} as Record<string, typeof schedule.dropOffs>);
      
      Object.entries(dropOffsByStaff).forEach(([staffId, dropOffs]) => {
        scheduleText += `${getStaffName(staffId)}:\n`;
        scheduleText += `  ${dropOffs.map(d => getParticipantName(d.participantId)).join(', ')}\n`;
      });
    } else {
      scheduleText += `No drop-offs scheduled\n`;
    }
    scheduleText += `\n`;

    // Pickups
    scheduleText += `${isSaturday() ? '6' : '9'}. PICKUPS\n`;
    scheduleText += `${'-'.repeat(9)}\n`;
    if (schedule.pickups && schedule.pickups.length > 0) {
      schedule.pickups.forEach((pickup) => {
        scheduleText += `• ${getParticipantName(pickup.participantId)}\n`;
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
  }, [schedule, selectedDate, appVersion, getStaffName, getParticipantName, getChoreName, getTimeSlotDisplay, isSaturday]);

  const shareAsText = useCallback(async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to share');
      return;
    }

    setIsGenerating(true);
    try {
      const scheduleText = generateScheduleText();
      
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
          const scheduleText = generateScheduleText();
          await navigator.clipboard.writeText(scheduleText);
          Alert.alert('Copied!', 'Schedule copied to clipboard');
        } catch {
          Alert.alert('Error', 'Unable to share schedule. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Unable to share schedule. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, selectedDate, generateScheduleText]);

  const copyToClipboard = useCallback(async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to copy');
      return;
    }

    setIsGenerating(true);
    try {
      const scheduleText = generateScheduleText();
      
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(scheduleText);
        Alert.alert('Copied!', 'Schedule copied to clipboard');
      } else {
        // For mobile, use the share API as fallback
        await RNShare.share({
          message: scheduleText,
          title: 'Daily Schedule'
        });
      }
    } catch (error) {
      console.error('Error copying schedule:', error);
      Alert.alert('Error', 'Unable to copy schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, generateScheduleText]);

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
          @page { margin: 20mm; size: A4; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .date { font-size: 16px; color: #666; margin: 5px 0 0 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #007AFF; margin: 20px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .item { margin: 5px 0; padding-left: 10px; }
          .staff-group { margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007AFF; }
          .staff-name { font-weight: bold; color: #007AFF; margin-bottom: 5px; }
        </style>
      `;

      const scheduleText = generateScheduleText();
      const htmlContent = scheduleText.replace(/\n/g, '<br>');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Daily Schedule - ${formatDate()}</title>
          ${pageStyle}
        </head>
        <body>
          <div class="header">
            <h1 class="title">Daily Schedule</h1>
            <p class="date">${formatDate()}</p>
          </div>
          <div style="white-space: pre-line;">${htmlContent}</div>
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
  }, [schedule, selectedDate, generateScheduleText]);

  if (!schedule) {
    return (
      <>
        <Stack.Screen options={{ title: 'Share Schedule', presentation: 'modal' }} />
        <View style={styles.emptyContainer}>
          <FileText size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Schedule Available</Text>
          <Text style={styles.emptySubtitle}>Create a schedule first to share it</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              router.dismiss();
              router.push('/create-schedule');
            }}
          >
            <Text style={styles.createButtonText}>Create Schedule</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Share Schedule', presentation: 'modal' }} />
      <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Share Daily Schedule</Text>
          <Text style={styles.date}>{(() => {
            const [year, month, day] = selectedDate.split('-');
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          })()}</Text>
          <Text style={styles.subtitle}>Choose how you&apos;d like to share this schedule</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.shareOption}
            onPress={shareAsText}
            disabled={isGenerating}
          >
            <View style={styles.shareOptionIcon}>
              <FileText size={24} color="#4CAF50" />
            </View>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Share as Text</Text>
              <Text style={styles.shareOptionDescription}>Share the schedule as formatted text via messaging apps, email, etc.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shareOption}
            onPress={copyToClipboard}
            disabled={isGenerating}
          >
            <View style={styles.shareOptionIcon}>
              <Copy size={24} color="#2196F3" />
            </View>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Copy to Clipboard</Text>
              <Text style={styles.shareOptionDescription}>Copy the schedule text to your clipboard for pasting elsewhere</Text>
            </View>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={printSchedule}
              disabled={isGenerating}
            >
              <View style={styles.shareOptionIcon}>
                <Printer size={24} color="#FF6B6B" />
              </View>
              <View style={styles.shareOptionContent}>
                <Text style={styles.shareOptionTitle}>Print Schedule</Text>
                <Text style={styles.shareOptionDescription}>Print the schedule as a formatted PDF document</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.shareOption}
            onPress={() => {
              router.dismiss();
              router.push('/(tabs)/share');
            }}
          >
            <View style={styles.shareOptionIcon}>
              <MessageSquare size={24} color="#FF9800" />
            </View>
            <View style={styles.shareOptionContent}>
              <Text style={styles.shareOptionTitle}>Share with Code</Text>
              <Text style={styles.shareOptionDescription}>Generate a 6-digit code to share with colleagues</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Schedule Preview</Text>
          <View style={styles.previewContent}>
            <Text style={styles.previewText} numberOfLines={10}>
              {generateScheduleText()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  optionsContainer: {
    padding: 16,
  },
  shareOption: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shareOptionContent: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  previewContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewContent: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  previewText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
});