import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Share as RNShare } from 'react-native';
import { Share, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';

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
    
    try {
      await RNShare.share({
        message: scheduleText,
        title: `Schedule for ${selectedDate}`,
      });
    } catch (error) {
      console.log('Error sharing schedule:', error);
      // Fallback to clipboard for web
      if (Platform.OS === 'web' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(scheduleText);
          Alert.alert('Copied', 'Schedule copied to clipboard');
        } catch (clipboardError) {
          console.log('Clipboard error:', clipboardError);
          Alert.alert('Error', 'Unable to share or copy schedule');
        }
      } else {
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

  const shareApp = async () => {
    let appUrl = 'https://your-app-url.com';
    let shareText = '';
    
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location) {
        appUrl = window.location.href;
      }
      shareText = `Check out this Daily Schedule app! Access it here: ${appUrl}`;
    } else {
      shareText = 'Check out this Daily Schedule app! It helps organize staff schedules and participant attendance. Download it from your app store.';
    }
    
    try {
      const result = await RNShare.share({
        message: shareText,
        title: 'Daily Schedule App',
        ...(Platform.OS === 'web' && { url: appUrl })
      });
      
      if (result.action === RNShare.sharedAction) {
        console.log('App shared successfully');
      }
    } catch (error) {
      console.log('Error sharing app:', error);
      
      // Fallback to clipboard for web
      if (Platform.OS === 'web' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareText);
          Alert.alert('Copied', 'App link copied to clipboard! Share it with your colleagues.');
        } catch (clipboardError) {
          console.log('Clipboard error:', clipboardError);
          Alert.alert('Error', 'Unable to share or copy app link. Please copy this URL manually: ' + appUrl);
        }
      } else {
        Alert.alert('Error', 'Unable to share app link');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share & Collaborate</Text>
        <Text style={styles.subtitle}>Share the app or today&apos;s schedule</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share App with Colleagues</Text>
        <TouchableOpacity style={styles.appShareButton} onPress={shareApp}>
          <Users size={24} color="white" />
          <Text style={styles.shareButtonText}>Share App Link</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>Share this link so colleagues can access the app instantly</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share Today&apos;s Schedule</Text>
        <Text style={styles.date}>{selectedDate}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={shareSchedule}>
          <Share size={24} color="white" />
          <Text style={styles.shareButtonText}>Share Schedule</Text>
        </TouchableOpacity>
      </View>

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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  appShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
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