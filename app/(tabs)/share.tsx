import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Share as RNShare, TextInput, ActivityIndicator } from 'react-native';
import { Hash, Download, Copy, FileText, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';
import ActionButtons from '@/components/ActionButtons';
import { router } from 'expo-router';

export default function ShareScreen() {
  const { selectedDate, getScheduleForDate, staff, participants, shareScheduleWithCode, importScheduleWithCode, setScheduleStep, schedules, updateScheduleImmediately } = useSchedule();
  const insets = useSafeAreaInsets();
  const schedule = getScheduleForDate(selectedDate);
  
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [importCode, setImportCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

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

  const handleCreatePress = () => {
    setScheduleStep(1);
    router.push('/create-schedule');
  };

  const handleEditPress = () => {
    router.push('/edit-schedule');
  };

  const handleSharePress = () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'Please create a schedule first');
      return;
    }
    router.push('/share-schedule');
  };

  const generateScheduleText = () => {
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
        const staffMember = staff.find(s => s.id === staffId);
        scheduleText += `• ${staffMember?.name || 'Unknown'}\n`;
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
        const participant = participants.find((p: any) => p.id === participantId);
        scheduleText += `• ${participant?.name || 'Unknown'}\n`;
      });
    } else {
      scheduleText += `No participants assigned\n`;
    }
    scheduleText += `\n`;

    return scheduleText;
  };

  const shareAsPDF = async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to share as PDF');
      return;
    }

    try {
      const scheduleText = generateScheduleText();
      
      if (Platform.OS === 'web') {
        // Generate HTML for PDF printing
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
              .section { margin: 20px 0; }
              .section-title { font-size: 16px; font-weight: bold; color: #007AFF; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
              .item { margin: 5px 0; padding-left: 10px; }
              .staff-group { margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007AFF; }
              .staff-name { font-weight: bold; color: #007AFF; margin-bottom: 5px; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
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
              <div class="header">
                <h1 class="title">Daily Schedule</h1>
                <p class="date">${formatDate()}</p>
              </div>
              <pre>${scheduleText}</pre>
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
          Alert.alert('PDF Error', 'Unable to open print window. Please check your browser settings.');
        }
      } else {
        // For mobile, share as text with PDF mention
        await RNShare.share({
          message: `${scheduleText}\n\n(To save as PDF, open this on a computer and use the print function)`,
          title: `Daily Schedule - ${(() => {
            const [year, month, day] = selectedDate.split('-');
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          })()}`,
        });
      }
    } catch (error) {
      console.error('Error sharing as PDF:', error);
      Alert.alert('Error', 'Unable to share schedule as PDF. Please try again.');
    }
  };

  const shareViaEmail = async () => {
    if (!schedule) {
      Alert.alert('No Schedule', 'No schedule available to share via email');
      return;
    }

    try {
      const scheduleText = generateScheduleText();
      const subject = `Daily Schedule - ${(() => {
        const [year, month, day] = selectedDate.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      })()}`;
      
      const emailBody = `Please find the daily schedule below:\n\n${scheduleText}`;
      
      if (Platform.OS === 'web') {
        // Open default email client
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoLink);
      } else {
        // Use share API for mobile
        await RNShare.share({
          message: emailBody,
          title: subject,
        });
      }
    } catch (error) {
      console.error('Error sharing via email:', error);
      Alert.alert('Error', 'Unable to share schedule via email. Please try again.');
    }
  };

  const loadLastSchedule = async () => {
    console.log('Loading last created schedule...');
    
    if (schedules.length === 0) {
      Alert.alert('No Schedules', 'No schedules found to load.');
      return;
    }
    
    const sortedSchedules = [...schedules].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    const lastSchedule = sortedSchedules[0];
    
    if (lastSchedule.date === selectedDate) {
      Alert.alert('Already Loaded', 'The most recent schedule is already loaded for today.');
      return;
    }
    
    const todaySchedule = {
      ...lastSchedule,
      id: `schedule-${selectedDate}`,
      date: selectedDate
    };
    
    try {
      await updateScheduleImmediately(todaySchedule);
      
      Alert.alert(
        'Schedule Loaded', 
        `Successfully loaded schedule from ${new Date(lastSchedule.date).toLocaleDateString()} for today.`
      );
    } catch (error) {
      console.error('Error loading last schedule:', error);
      Alert.alert('Error', 'Failed to load the last schedule. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Share & Collaborate</Text>
      </View>
      
      <View style={styles.actionButtonsTop}>
        <ActionButtons
          onCreatePress={handleCreatePress}
          onEditPress={handleEditPress}
          onSharePress={handleSharePress}
          onLoadLastPress={loadLastSchedule}
          onRefreshPress={() => {}}
          hasSchedules={schedules.length > 0}
        />
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.subtitle}>Share schedules with 6-digit codes</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Options</Text>
          
          {schedule && (
            <View style={styles.shareOptionsGrid}>
              <TouchableOpacity 
                style={styles.shareOptionCard}
                onPress={shareAsPDF}
              >
                <FileText size={24} color="#FF6B6B" />
                <Text style={styles.shareOptionTitle}>Export as PDF</Text>
                <Text style={styles.shareOptionDesc}>Print or save as PDF document</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.shareOptionCard}
                onPress={shareViaEmail}
              >
                <Mail size={24} color="#4CAF50" />
                <Text style={styles.shareOptionTitle}>Share via Email</Text>
                <Text style={styles.shareOptionDesc}>Send schedule via email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Sharing Code</Text>
          <Text style={styles.date}>{(() => {
            const [year, month, day] = selectedDate.split('-');
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          })()}</Text>
          
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
              <Text style={styles.noScheduleText}>No schedule available for {(() => {
                const [year, month, day] = selectedDate.split('-');
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
              })()}</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtonsTop: {
    backgroundColor: '#fff',
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
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
  shareOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareOptionCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  shareOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  shareOptionDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
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