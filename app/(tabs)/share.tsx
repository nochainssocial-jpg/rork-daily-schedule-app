import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Share as RNShare, TextInput, ActivityIndicator } from 'react-native';
import { Share, Users, Hash, Download, Copy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';

export default function ShareScreen() {
  const { selectedDate, getScheduleForDate, staff, shareScheduleWithCode, importScheduleWithCode } = useSchedule();
  const insets = useSafeAreaInsets();
  const schedule = getScheduleForDate(selectedDate);
  
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [importCode, setImportCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

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



  const shareApp = async () => {
    let appUrl = '';
    let shareText = '';
    
    if (Platform.OS === 'web') {
      // Get the current web URL
      if (typeof window !== 'undefined' && window.location) {
        appUrl = window.location.origin;
        // Ensure we have a clean base URL
        if (!appUrl.endsWith('/')) {
          appUrl += '/';
        }
      } else {
        appUrl = 'https://your-app-domain.com';
      }
      shareText = `Check out this Daily Schedule app! 📅\n\n🔗 Access it here: ${appUrl}\n\nThis app helps organize staff schedules and participant attendance efficiently. Perfect for teams!`;
    } else {
      // For mobile, we'll use a universal link or provide instructions
      shareText = `Check out this Daily Schedule app! 📅\n\nIt helps organize staff schedules and participant attendance efficiently. Perfect for teams and organizations.\n\nAsk your admin for the web link or download from your app store!`;
    }
    
    console.log('Sharing app with URL:', appUrl);
    console.log('Share text:', shareText);
    
    try {
      const shareOptions: any = {
        message: shareText,
        title: 'Daily Schedule App - Team Collaboration Tool',
      };
      
      // For web, include both message and URL
      if (Platform.OS === 'web' && appUrl) {
        shareOptions.url = appUrl;
        // Some platforms prefer the URL in the message itself
        shareOptions.message = shareText;
      }
      
      console.log('Share options:', shareOptions);
      
      const result = await RNShare.share(shareOptions);
      
      console.log('Share result:', result);
      
      if (result.action === RNShare.sharedAction) {
        console.log('App shared successfully');
        Alert.alert('Success! 🎉', 'App link shared successfully! Your colleagues can now access the app.');
      } else if (result.action === RNShare.dismissedAction) {
        console.log('Share dismissed by user');
      }
    } catch (error) {
      console.error('Error sharing app:', error);
      
      // Enhanced fallback handling
      if (Platform.OS === 'web') {
        // Try clipboard first
        if (navigator.clipboard) {
          try {
            const textToCopy = `${shareText}\n\nDirect link: ${appUrl}`;
            await navigator.clipboard.writeText(textToCopy);
            Alert.alert(
              '📋 Copied to Clipboard!', 
              'App link and message copied to clipboard! You can now paste and share it with your colleagues.',
              [{ text: 'Got it!' }]
            );
            return;
          } catch (clipboardError) {
            console.error('Clipboard error:', clipboardError);
          }
        }
        
        // Final fallback - show the URL in an alert
        Alert.alert(
          '🔗 Share App Link', 
          `Copy this information to share with colleagues:\n\n${shareText}\n\n📱 Direct Link:\n${appUrl}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Copy All', 
              onPress: () => {
                const fullText = `${shareText}\n\nDirect Link: ${appUrl}`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(fullText).then(() => {
                    Alert.alert('Copied!', 'All information copied to clipboard.');
                  }).catch(() => {
                    console.log('Failed to copy to clipboard');
                  });
                }
              }
            }
          ]
        );
      } else {
        // Mobile fallback - show share text in alert
        Alert.alert(
          '📱 Share App Info', 
          `${shareText}\n\nYou can copy this message and send it manually to your colleagues.`,
          [
            { text: 'OK' }
          ]
        );
      }
    }
  };

  const generateCode = async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule found for the selected date.');
      return;
    }

    setIsGenerating(true);
    try {
      const code = await shareScheduleWithCode(schedule);
      setGeneratedCode(code);
      Alert.alert(
        'Code Generated! 🎉',
        `Your 6-digit sharing code is: ${code}\n\nThis code will expire in 24 hours. Share it with colleagues to import your schedule.`,
        [
          { text: 'Copy Code', onPress: () => copyCodeToClipboard(code) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate sharing code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCodeToClipboard = async (code: string) => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        Alert.alert('Copied!', 'Code copied to clipboard');
      } catch (error) {
        console.log('Clipboard error:', error);
      }
    } else {
      Alert.alert('Code', `Your sharing code: ${code}`);
    }
  };

  const importSchedule = async () => {
    if (!importCode.trim()) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importScheduleWithCode(importCode.trim());
      
      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          'Schedule imported successfully! The schedule has been loaded for today.',
          [{ text: 'OK', onPress: () => setImportCode('') }]
        );
      } else {
        Alert.alert('Import Failed', result.error || 'Failed to import schedule.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import schedule. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Share & Collaborate</Text>
        <Text style={styles.subtitle}>Share schedules with 6-digit codes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate Sharing Code</Text>
        <Text style={styles.date}>{selectedDate}</Text>
        
        {schedule ? (
          <>
            <TouchableOpacity 
              style={[styles.codeButton, styles.generateButton]} 
              onPress={generateCode}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Hash size={24} color="white" />
              )}
              <Text style={styles.shareButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Code'}
              </Text>
            </TouchableOpacity>
            
            {generatedCode && (
              <View style={styles.codeDisplay}>
                <Text style={styles.codeLabel}>Your sharing code:</Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyCodeToClipboard(generatedCode)}
                  >
                    <Copy size={16} color="#2196F3" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.codeExpiry}>Expires in 24 hours</Text>
              </View>
            )}
            
            <Text style={styles.helpText}>Generate a 6-digit code to share this schedule with colleagues</Text>
          </>
        ) : (
          <View style={styles.noScheduleContainer}>
            <Hash size={32} color="#CCC" />
            <Text style={styles.noScheduleText}>No schedule available for {selectedDate}</Text>
            <Text style={styles.helpText}>Create a schedule first or import one using a code below</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import Schedule</Text>
        <Text style={styles.inputLabel}>Enter 6-digit code:</Text>
        <View style={styles.importContainer}>
          <TextInput
            style={styles.codeInput}
            value={importCode}
            onChangeText={setImportCode}
            placeholder="123456"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={6}
            testID="import-code-input"
          />
          <TouchableOpacity 
            style={[styles.codeButton, styles.importButton]} 
            onPress={importSchedule}
            disabled={isImporting || importCode.length !== 6}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Download size={20} color="white" />
            )}
            <Text style={styles.importButtonText}>
              {isImporting ? 'Importing...' : 'Import'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>Import a schedule shared by a colleague using their 6-digit code</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share App with Colleagues</Text>
        <TouchableOpacity style={styles.appShareButton} onPress={shareApp}>
          <Users size={24} color="white" />
          <Text style={styles.shareButtonText}>Share App Link</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>Share this link so colleagues can access the app instantly</Text>
      </View>

      {schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Today&apos;s Schedule (Text)</Text>
          <Text style={styles.date}>{selectedDate}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={shareSchedule}>
            <Share size={24} color="white" />
            <Text style={styles.shareButtonText}>Share as Text</Text>
          </TouchableOpacity>
        </View>
      )}

      {schedule && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Schedule Preview</Text>
          <Text style={styles.previewText}>{generateScheduleText(schedule)}</Text>
        </View>
      )}
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
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: '#FF9800',
  },
  importButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 8,
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  codeDisplay: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: 4,
  },
  codeExpiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  importContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
    backgroundColor: 'white',
  },
  noScheduleContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  noScheduleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
});