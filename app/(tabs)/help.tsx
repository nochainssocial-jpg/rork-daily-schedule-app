import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChevronRight, AlertCircle, RefreshCw, Settings, Trash2, FileText } from 'lucide-react-native';
import { useSchedule } from '@/hooks/schedule-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HelpSectionProps {
  title: string;
  description: string;
  items?: string[];
}

const HelpSection: React.FC<HelpSectionProps> = ({ title, description, items }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionDescription}>{description}</Text>
    {items && items.map((item, index) => (
      <View key={index} style={styles.itemRow}>
        <ChevronRight size={16} color="#666" style={styles.bullet} />
        <Text style={styles.itemText}>{item}</Text>
      </View>
    ))}
  </View>
);

export default function HelpScreen() {
  const { 
    hasNewUpdates, 
    markUpdatesAsViewed, 
    appVersion,
    checkDataIntegrity,
    clearCorruptedData,
    refreshAllData
  } = useSchedule();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<{ success: boolean; issues: string[] } | null>(null);

  // Auto-refresh when critical updates are detected
  useEffect(() => {
    if (hasNewUpdates) {
      // Show alert about new updates
      Alert.alert(
        'App Updated',
        'The app has been updated with new features. The help documentation has been refreshed to reflect the latest changes.',
        [
          {
            text: 'OK',
            onPress: () => {
              markUpdatesAsViewed();
              setRefreshKey(prev => prev + 1); // Force re-render
            }
          }
        ]
      );
    }
  }, [hasNewUpdates, markUpdatesAsViewed]);

  const handleRefresh = () => {
    if (hasNewUpdates) {
      markUpdatesAsViewed();
    }
    setRefreshKey(prev => prev + 1);
  };
  
  const handleCheckIntegrity = async () => {
    setIsChecking(true);
    try {
      const result = await checkDataIntegrity();
      setLastCheckResult(result);
      
      if (result.success) {
        Alert.alert('Data Check', 'All data is healthy! No issues found.');
      } else {
        Alert.alert(
          'Data Issues Found',
          `Found ${result.issues.length} issue(s):\n\n${result.issues.join('\n')}\n\nConsider using "Clear All Data" to reset.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check data integrity');
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL stored data including schedules and reset to defaults. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const success = await clearCorruptedData();
              if (success) {
                await refreshAllData();
                Alert.alert('Success', 'All data has been cleared and reset to defaults.');
                setLastCheckResult(null);
              } else {
                Alert.alert('Error', 'Failed to clear data');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };
  
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshAllData();
      if (success) {
        Alert.alert('Success', 'Data refreshed successfully');
      } else {
        Alert.alert('Warning', 'Data refresh completed with some issues');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleExportDebugLog = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const debugInfo: any = {};
      
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Try to parse JSON, if it fails, store as string
            try {
              debugInfo[key] = JSON.parse(value);
            } catch {
              debugInfo[key] = value;
            }
          }
        } catch (error) {
          debugInfo[key] = 'ERROR_READING';
        }
      }
      
      console.log('=== DEBUG EXPORT ===');
      console.log('Total keys:', allKeys.length);
      console.log('Data:', JSON.stringify(debugInfo, null, 2));
      console.log('=== END DEBUG EXPORT ===');
      
      Alert.alert('Debug Log', `Exported ${allKeys.length} keys to console. Check developer console for details.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export debug log');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView key={refreshKey} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>How to Use This App</Text>
              <Text style={styles.subtitle}>
                Learn how to create and manage your schedules effectively
              </Text>
            </View>
            {hasNewUpdates && (
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleRefresh}
              >
                <AlertCircle size={16} color="#FF6B6B" />
                <RefreshCw size={20} color="#FF6B6B" />
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasNewUpdates && (
            <View style={styles.updateBanner}>
              <AlertCircle size={14} color="#FF6B6B" />
              <Text style={styles.updateBannerText}>
                New app updates available! Tap Update to see the latest features.
              </Text>
            </View>
          )}
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>

        <HelpSection
          title="Getting Started"
          description="Create your first schedule by tapping the 'Create New Schedule' button on the home screen. Each schedule represents a day's worth of staff assignments and activities."
        />

        <HelpSection
          title="Schedule Categories"
          description="Each schedule contains multiple categories that help organize your day:"
          items={[
            "Working Staff: List all staff members who are working that day",
            "Front Room: Assign staff to front room duties",
            "Scott: Manage Scott's specific assignments (not required on Saturdays)",
            "Twins: Handle twin-related tasks (not required on Saturdays)",
            "Pickups: Organize pickup schedules and assignments",
            "Drop Offs: Manage drop-off schedules with staff assignments",
            "Participants: Track all participants for the day",
            "Absent: Record staff members who are absent",
            "Notes: Add any additional information or reminders"
          ]}
        />

        <HelpSection
          title="Managing Staff"
          description="When creating or editing a schedule:"
          items={[
            "Add staff names to the Working Staff section first",
            "These names will automatically appear in dropdown menus for other categories",
            "You can assign the same staff member to multiple categories",
            "Use the '+' button to add new entries to any category",
            "Use the trash icon to remove entries"
          ]}
        />

        <HelpSection
          title="Saturday Schedules"
          description="Saturdays have special rules:"
          items={[
            "Front Room, Scott, and Twins categories are automatically hidden",
            "These categories are not required for Saturday operations",
            "All other categories function normally",
            "The View PDF and schedule creation automatically adjust for Saturdays"
          ]}
        />

        <HelpSection
          title="Viewing Your Schedule"
          description="The home screen displays your current schedule:"
          items={[
            "Tap on any category to expand and view details",
            "Use the Edit button to modify the current schedule",
            "The calendar shows the current date and day",
            "Schedules automatically update at midnight"
          ]}
        />

        <HelpSection
          title="Sharing Schedules"
          description="Share your schedules with others:"
          items={[
            "Go to the Share tab to see sharing options",
            "You can share as text or generate a PDF",
            "Text format is perfect for messaging apps",
            "PDF format provides a professional document"
          ]}
        />

        <HelpSection
          title="PDF View"
          description="The View PDF tab provides a formatted document:"
          items={[
            "Automatically generates a PDF of your current schedule",
            "Use the Refresh button to update after making changes",
            "Drop Offs section shows staff names first with participants listed below",
            "Categories not needed for the day are automatically hidden",
            "Saturday schedules omit Front Room, Scott, and Twins sections",
            "Top padding ensures content is visible below device status bar",
            "Perfect for printing or saving for records"
          ]}
        />

        <HelpSection
          title="Settings"
          description="Customize your app experience:"
          items={[
            "Manage Staff, Participants, Chores, and Final Checklist items",
            "Pink tabs with white text indicate the selected category",
            "Grey tabs show unselected categories",
            "Add new items using the field and button at the top of each tab",
            "Settings are saved automatically",
            "Your schedules persist between app sessions"
          ]}
        />

        <HelpSection
          title="Automatic Updates"
          description="The app automatically refreshes when critical updates occur:"
          items={[
            "View PDF and Help sections update automatically",
            "You'll see an update notification when new features are added",
            "The app version is displayed for reference",
            "Updates ensure you always have the latest information"
          ]}
        />

        <HelpSection
          title="Tips for Success"
          description="Get the most out of the app:"
          items={[
            "Always add Working Staff first when creating a schedule",
            "Use the Notes section for important reminders",
            "Check the PDF view before sharing to ensure formatting",
            "Schedules are saved automatically as you make changes",
            "The app works offline - no internet connection required"
          ]}
        />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.sectionDescription}>
            If you're experiencing issues with data not loading or saving correctly, use these diagnostic tools:
          </Text>
          
          <TouchableOpacity
            style={[styles.diagnosticsButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleCheckIntegrity}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Settings size={20} color="white" />
                <Text style={styles.diagnosticsButtonText}>Check Data Integrity</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.diagnosticsButton, { backgroundColor: '#2196F3' }]}
            onPress={handleRefreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <RefreshCw size={20} color="white" />
                <Text style={styles.diagnosticsButtonText}>Refresh All Data</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.diagnosticsButton, { backgroundColor: '#FF9800' }]}
            onPress={handleExportDebugLog}
          >
            <FileText size={20} color="white" />
            <Text style={styles.diagnosticsButtonText}>Export Debug Log to Console</Text>
          </TouchableOpacity>
          
          <View style={styles.diagnosticsDivider} />
          
          <Text style={styles.diagnosticsWarning}>⚠️ Danger Zone</Text>
          <Text style={styles.diagnosticsDescription}>
            Only use this if you're experiencing persistent issues. This will delete ALL your schedules and data:
          </Text>
          
          <TouchableOpacity
            style={[styles.diagnosticsButton, { backgroundColor: '#F44336' }]}
            onPress={handleClearData}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Trash2 size={20} color="white" />
                <Text style={styles.diagnosticsButtonText}>Clear All Data & Reset</Text>
              </>
            )}
          </TouchableOpacity>
          
          {lastCheckResult && (
            <View style={styles.diagnosticsResult}>
              <Text style={styles.diagnosticsResultTitle}>
                Last Check: {lastCheckResult.success ? '✅ Healthy' : '⚠️ Issues Found'}
              </Text>
              {!lastCheckResult.success && lastCheckResult.issues.map((issue, index) => (
                <Text key={index} style={styles.diagnosticsIssue}>• {issue}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Need more help? Contact your administrator for assistance.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: 6,
  },
  updateButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    gap: 8,
  },
  updateBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B6B',
    lineHeight: 18,
  },
  versionText: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingLeft: 5,
  },
  bullet: {
    marginTop: 2,
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  diagnosticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  diagnosticsButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  diagnosticsDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  diagnosticsWarning: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#F44336',
    marginBottom: 8,
  },
  diagnosticsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  diagnosticsResult: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  diagnosticsResultTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
    color: '#333',
  },
  diagnosticsIssue: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    marginTop: 4,
  },
});