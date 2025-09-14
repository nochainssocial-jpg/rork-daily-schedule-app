import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionButtons from '@/components/ActionButtons';
import { useSchedule } from '@/hooks/schedule-store';
import { 
  Users, 
  UserCheck, 
  ClipboardList,
  Home,
  Baby,
  Users2,
  CheckSquare,
  Car,
  ListChecks,
  Edit
} from 'lucide-react-native';

export default function HomeScreen() {
  const { 
    selectedDate, 
    setScheduleStep,
    getScheduleForDate,
    categoryUpdates,
    refreshAllData,
    schedules,
    updateScheduleImmediately
  } = useSchedule();
  const insets = useSafeAreaInsets();
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showScheduleSelector, setShowScheduleSelector] = useState<boolean>(false);


  useEffect(() => {
    if (categoryUpdates && categoryUpdates.length > 0) {
      // Sort updates by timestamp to get the most recent
      const sortedUpdates = [...categoryUpdates].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const latestUpdate = sortedUpdates[0];
      
      try {
        const updateDate = new Date(latestUpdate.timestamp);
        const timeString = `${updateDate.getDate().toString().padStart(2, '0')}/${(updateDate.getMonth() + 1).toString().padStart(2, '0')}/${updateDate.getFullYear()} ${updateDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        setLastUpdateTime(timeString);
        
        // Create update message based on category
        if (latestUpdate.category === 'schedule' && latestUpdate.action === 'created') {
          setUpdateMessage('Schedule created');
        } else {
          // Map category IDs to display names
          const categoryNames: { [key: string]: string } = {
            'staff': 'Staff',
            'participants': 'Participants',
            'assignments': 'Daily Assignment',
            'frontRoom': 'Front Room',
            'scotty': 'Scotty',
            'twins': 'Twins',
            'chores': 'Chores',
            'dropOffs': 'Drop-offs',
            'pickups': 'Pickups',
            'dropoffs_pickups': 'Drop-offs & Pickups',
            'finalChecklist': 'Final Checklist'
          };
          
          const categoryName = categoryNames[latestUpdate.category] || latestUpdate.category;
          setUpdateMessage(`${categoryName} updated`);
        }
      } catch (error) {
        console.error('Error formatting update time:', error);
      }
    }
  }, [categoryUpdates]);

  const todaySchedule = getScheduleForDate(selectedDate);
  
  // Debug logging - only in development
  useEffect(() => {
    if (__DEV__) {
      console.log('Home screen - Date:', selectedDate, 'Schedule:', todaySchedule ? 'Found' : 'Not found', 'Total:', schedules.length);
    }
  }, [selectedDate, todaySchedule, schedules.length]);
  
  // Auto-refresh data when component mounts - optimized
  useEffect(() => {
    const autoRefreshData = async () => {
      console.log('Initial data load - schedules:', schedules.length, 'todaySchedule:', !!todaySchedule);
      
      // Only auto-refresh on initial mount if no data is available
      if (schedules.length === 0) {
        console.log('No schedules found, refreshing data...');
        setIsRefreshing(true);
        try {
          await refreshAllData();
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    
    // Small delay to let the component settle
    const timeoutId = setTimeout(autoRefreshData, 200);
    
    return () => clearTimeout(timeoutId);
  }, []); // Only run on mount
  
  // Auto-load most recent schedule on app startup
  useEffect(() => {
    const autoLoadRecentSchedule = async () => {
      console.log('Checking for auto-load conditions...');
      console.log('Today schedule exists:', !!todaySchedule);
      console.log('Available schedules:', schedules.length);
      
      // Only auto-load if:
      // 1. There's no schedule for today
      // 2. We have schedules available
      if (!todaySchedule && schedules.length > 0) {
        console.log('Auto-loading most recent schedule on startup');
        
        // Find the most recently created schedule
        const sortedSchedules = [...schedules].sort((a, b) => {
          // Sort by date (most recent first)
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        const lastSchedule = sortedSchedules[0];
        console.log('Most recent schedule date:', lastSchedule.date);
        
        // Don't auto-load if the most recent schedule is already for today
        if (lastSchedule.date === selectedDate) {
          console.log('Most recent schedule is already for today');
          return;
        }
        
        // Create a copy of the last schedule for today's date
        const todayScheduleCopy = {
          ...lastSchedule,
          id: `schedule-${selectedDate}`,
          date: selectedDate
        };
        
        try {
          // Save the copied schedule for today
          await updateScheduleImmediately(todayScheduleCopy);
          
          console.log(`Auto-loaded schedule from ${new Date(lastSchedule.date).toLocaleDateString()} for today`);
          
          // Show a brief notification to user
          Alert.alert(
            'Schedule Loaded',
            `Loaded your most recent schedule from ${(() => {
              const date = new Date(lastSchedule.date);
              return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            })()}`,
            [{ text: 'OK' }],
            { cancelable: true }
          );
        } catch (error) {
          console.error('Error auto-loading last schedule:', error);
        }
      } else if (schedules.length === 0) {
        console.log('No schedules available to auto-load');
      }
    };
    
    // Run auto-load after a short delay to ensure data is loaded
    const timeoutId = setTimeout(autoLoadRecentSchedule, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [schedules.length, todaySchedule]); // Run when schedules or today's schedule changes
  
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

  const categoryItems = [
    { id: 'staff', title: 'Staff working today', icon: Users, color: '#4A90E2' },
    { id: 'participants', title: 'Participants attending today', icon: UserCheck, color: '#7B68EE' },
    { id: 'assignments', title: 'Daily Assignment', icon: ClipboardList, color: '#FF6B6B' },
    { id: 'frontRoom', title: 'Front Room', icon: Home, color: '#4ECDC4' },
    { id: 'scotty', title: 'Scotty', icon: Baby, color: '#95E77E' },
    { id: 'twins', title: 'Twins', icon: Users2, color: '#FFD93D' },
    { id: 'chores', title: 'Chores', icon: CheckSquare, color: '#FF8C42' },
    { id: 'dropOffs', title: 'Drop-offs & Pickups', icon: Car, color: '#A8DADC' },
    { id: 'finalChecklist', title: 'Final Checklist', icon: ListChecks, color: '#E56B6F' },
  ];
  
  // Show schedule selector modal
  const showScheduleSelection = async () => {
    console.log('Load button pressed - checking for schedules...');
    console.log('Current schedules count:', schedules.length);
    
    // First try to refresh data to ensure we have the latest schedules
    if (schedules.length === 0) {
      console.log('No schedules in memory, refreshing data first...');
      setIsRefreshing(true);
      try {
        await refreshAllData();
        // Wait a moment for the data to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Check again after refresh
    const currentSchedules = schedules || [];
    console.log('After refresh - schedules count:', currentSchedules.length);
    
    if (currentSchedules.length === 0) {
      Alert.alert(
        'No Schedules Found', 
        'No previous schedules were found to load. Try creating a new schedule first, or use the Refresh button to check for existing data.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowScheduleSelector(true);
  };

  // Load selected schedule
  const loadSelectedSchedule = async (scheduleToLoad: any) => {
    setShowScheduleSelector(false);
    
    if (scheduleToLoad.date === selectedDate) {
      Alert.alert('Already Loaded', 'This schedule is already loaded for today.');
      return;
    }
    
    // Create a copy of the selected schedule for today's date
    const todaySchedule = {
      ...scheduleToLoad,
      id: `schedule-${selectedDate}`,
      date: selectedDate
    };
    
    try {
      // Save the copied schedule for today
      await updateScheduleImmediately(todaySchedule);
      
      Alert.alert(
        'Schedule Loaded', 
        `Successfully loaded schedule from ${(() => {
          const date = new Date(scheduleToLoad.date);
          return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        })()} for today.`
      );
    } catch (error) {
      console.error('Error loading selected schedule:', error);
      Alert.alert('Error', 'Failed to load the selected schedule. Please try again.');
    }
  };



  const getNotificationColor = () => {
    if (!categoryUpdates || categoryUpdates.length === 0) return { bg: '#C8E6C9', text: '#2E7D32' };
    
    const sortedUpdates = [...categoryUpdates].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestUpdate = sortedUpdates[0];
    
    if (latestUpdate.category === 'schedule') return { bg: '#C8E6C9', text: '#2E7D32' };
    
    const category = categoryItems.find(item => item.id === latestUpdate.category);
    if (!category) return { bg: '#C8E6C9', text: '#2E7D32' };
    
    // Create pastel background and darker text colors based on category colors
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      '#4A90E2': { bg: '#D4E5F7', text: '#2A5082' }, // Staff - light blue
      '#7B68EE': { bg: '#E0DBFB', text: '#4B38AE' }, // Participants - light purple
      '#FF6B6B': { bg: '#FFE0E0', text: '#CC3B3B' }, // Daily Assignment - light red
      '#4ECDC4': { bg: '#D5F4F1', text: '#2E9D94' }, // Front Room - light teal
      '#95E77E': { bg: '#E5F7E0', text: '#5BA74E' }, // Scotty - light green
      '#FFD93D': { bg: '#FFF4D4', text: '#CCA91D' }, // Twins - light yellow
      '#FF8C42': { bg: '#FFE5D4', text: '#CC5C22' }, // Chores - light orange
      '#A8DADC': { bg: '#E8F5F6', text: '#68AAAC' }, // Drop-offs - light cyan
      '#E56B6F': { bg: '#FAD9DA', text: '#B53B3F' }, // Final Checklist - light coral
    };
    
    return colorMap[category.color] || { bg: '#C8E6C9', text: '#2E7D32' };
  };

  const handleCreatePress = () => {
    setScheduleStep(1);
    router.push('/create-schedule');
  };

  const handleEditPress = () => {
    router.push('/edit-schedule');
  };

  const handleSharePress = () => {
    if (!todaySchedule) {
      Alert.alert('No Schedule', 'Please create a schedule first');
      return;
    }
    router.push('/share-schedule');
  };

  const handleRefreshPress = async () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    
    try {
      // First, let's check what's actually in AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      console.log('=== DIAGNOSTIC CHECK ===');
      
      try {
        const storedSchedules = await AsyncStorage.getItem('schedules');
        if (storedSchedules) {
          console.log('Raw schedules data exists, length:', storedSchedules.length);
          const parsed = JSON.parse(storedSchedules);
          console.log('Parsed schedules count:', parsed.length);
          if (parsed.length > 0) {
            console.log('Schedule dates in storage:', parsed.map((s: any) => s.date));
          }
        } else {
          console.log('No schedules data in AsyncStorage');
        }
      } catch (diagError) {
        console.error('Diagnostic check failed:', diagError);
      }
      
      const success = await refreshAllData();
      if (success) {
        console.log('Manual refresh completed successfully');
        // After refresh, check what we have
        console.log('After refresh - schedules count:', schedules.length);
        console.log('After refresh - today schedule:', !!todaySchedule);
      } else {
        console.log('Manual refresh completed with issues');
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      // Add a small delay to show the refresh animation
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    if (!todaySchedule) {
      Alert.alert('No Schedule', 'Please create a schedule for today first');
      return;
    }
    
    // Handle drop-offs and pickups together
    if (categoryId === 'dropOffs') {
      router.push('/dropoffs-pickups');
      return;
    }
    
    router.push({
      pathname: '/edit-schedule',
      params: { category: categoryId }
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Daily Schedule</Text>
        <Image 
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sfl62jz9efty7wm6r3s5e' }}
          style={styles.logo}
          resizeMode="contain"
          defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
        />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.dateContainer}>
          <Text style={styles.dayText}>{dayName}</Text>
          <Text style={styles.dateText}>{dateString}</Text>
        </View>
        
        <View style={styles.actionButtonsTop}>
          <ActionButtons
            onCreatePress={handleCreatePress}
            onEditPress={handleEditPress}
            onSharePress={handleSharePress}
            onLoadLastPress={showScheduleSelection}
            onRefreshPress={handleRefreshPress}
            hasSchedules={schedules.length > 0}
            isRefreshing={isRefreshing}
          />
        </View>
        
        {lastUpdateTime && (
          <View style={styles.notificationArea}>
            <View style={[styles.notificationBox, { 
              backgroundColor: getNotificationColor().bg,
              shadowColor: getNotificationColor().text,
            }]}>
              <Text style={[styles.notificationText, { color: getNotificationColor().text }]}>
                {updateMessage}: {lastUpdateTime}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.scrollContainer}>
          
          {todaySchedule ? (
            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categoriesContainer}>
                {categoryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.categoryItem}
                      onPress={() => handleCategoryPress(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                        <Icon size={24} color={item.color} />
                      </View>
                      <Text style={styles.categoryTitle}>{item.title}</Text>
                      <Edit size={22} color="#999" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.noScheduleContainer}>
                <Text style={styles.noScheduleText}>No schedule created for today</Text>
                <Text style={styles.noScheduleSubtext}>Create a schedule to view and manage categories</Text>
                {schedules.length > 0 ? (
                  <Text style={styles.loadHintText}>Use Load button to copy your most recent schedule</Text>
                ) : (
                  <Text style={styles.loadHintText}>Use Refresh button to check for existing schedules</Text>
                )}
                
                {/* Debug info for development */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <Text style={styles.debugText}>Debug Info:</Text>
                    <Text style={styles.debugText}>Date: {selectedDate}</Text>
                    <Text style={styles.debugText}>Total Schedules: {schedules.length}</Text>

                    {schedules.length > 0 && (
                      <Text style={styles.debugText}>
                        Available: {schedules.map((s: any) => s.date).join(', ')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
        
        {/* Schedule Selector Modal */}
        {showScheduleSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Schedule to Load</Text>
              <ScrollView style={styles.modalScrollView}>
                {schedules
                  .filter((schedule: any) => schedule.date !== selectedDate)
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((schedule: any) => {
                    const scheduleDate = new Date(schedule.date);
                    const formattedDate = `${scheduleDate.getDate().toString().padStart(2, '0')}/${(scheduleDate.getMonth() + 1).toString().padStart(2, '0')}/${scheduleDate.getFullYear()}`;
                    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][scheduleDate.getDay()];
                    
                    return (
                      <TouchableOpacity
                        key={schedule.id}
                        style={styles.scheduleOption}
                        onPress={() => loadSelectedSchedule(schedule)}
                      >
                        <View style={styles.scheduleOptionContent}>
                          <Text style={styles.scheduleOptionDate}>{formattedDate}</Text>
                          <Text style={styles.scheduleOptionDay}>{dayName}</Text>
                        </View>
                        <View style={styles.scheduleOptionStats}>
                          <Text style={styles.scheduleOptionStat}>{schedule.workingStaff?.length || 0} staff</Text>
                          <Text style={styles.scheduleOptionStat}>{schedule.attendingParticipants?.length || 0} participants</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowScheduleSelector(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
    fontWeight: 'bold' as const,
    color: '#333',
  },
  logo: {
    width: 45,
    height: 45,
  },
  contentContainer: {
    flex: 1,
  },
  actionButtonsTop: {
    backgroundColor: '#fff',
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationArea: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  notificationBox: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationText: {
    fontSize: 12,
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  dateContainer: {
    backgroundColor: '#fff',
    paddingTop: 3,
    paddingBottom: 3,
    alignItems: 'center',
    marginBottom: 1,
  },
  dayText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 0,
  },
  dateText: {
    fontSize: 17,
    color: '#666',
    fontWeight: '600' as const,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 0,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 17,
    color: '#333',
  },
  noScheduleContainer: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  noScheduleText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 10,
  },
  noScheduleSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center' as const,
  },
  loadHintText: {
    fontSize: 12,
    color: '#2196F3',
    textAlign: 'center' as const,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  scheduleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    marginBottom: 8,
    borderRadius: 8,
  },
  scheduleOptionContent: {
    flex: 1,
  },
  scheduleOptionDate: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
  },
  scheduleOptionDay: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scheduleOptionStats: {
    alignItems: 'flex-end',
  },
  scheduleOptionStat: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  modalCancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});