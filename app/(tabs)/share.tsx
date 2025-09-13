import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Share } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import * as Sharing from 'expo-sharing';
import * as SMS from 'expo-sms';

export default function ShareScreen() {
  const { selectedDate, getScheduleForDate, staff } = useSchedule();
  const insets = useSafeAreaInsets();
  const schedule = getScheduleForDate(selectedDate);

  const shareSchedule = async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule found for the selected date.');
      return;
    }

    const scheduleText = generateScheduleText(schedule);
    
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Schedule for ${selectedDate}`,
            text: scheduleText,
          });
        } catch (error) {
          console.log('Error sharing:', error);
        }
      } else {
        // Fallback for web browsers without native sharing
        navigator.clipboard.writeText(scheduleText);
        Alert.alert('Copied', 'Schedule copied to clipboard');
      }
    } else {
      // Mobile sharing
      try {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync([], scheduleText);
        } else {
          await Sharing.shareAsync('data:text/plain;base64,' + btoa(scheduleText));
        }
      } catch (error) {
        console.log('Error sharing:', error);
        Alert.alert('Error', 'Unable to share schedule');
      }
    }
  };

  const generateScheduleText = (schedule: any) => {
    const staffMap = staff.reduce((acc: any, s: any) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    let text = `Daily Schedule - ${selectedDate}\n\n`;
    
    text += `Working Staff:\n${schedule.workingStaff.map((id: string) => `• ${staffMap[id]}`).join('\n')}\n\n`;
    
    text += `Attending Participants:\n${schedule.attendingParticipants.map((id: string) => {
      // Find participant name logic here
      return `• Participant ${id}`;
    }).join('\n')}\n\n`;

    return text;
  };

  if (!schedule) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Share size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>No Schedule to Share</Text>
          <Text style={styles.emptyText}>Create a schedule first to share it with others.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share Schedule</Text>
        <Text style={styles.date}>{selectedDate}</Text>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={shareSchedule}>
        <Share size={24} color="white" />
        <Text style={styles.shareButtonText}>Share Schedule</Text>
      </TouchableOpacity>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Schedule Preview</Text>
        <Text style={styles.previewText}>{generateScheduleText(schedule)}</Text>
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  preview: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});