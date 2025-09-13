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
  const [forceUpdate, setForceUpdate] = useState<number>(0);

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
  
  // Enhanced debug logging with automatic data loading
  useEffect(() => {
    console.log('=== HOME SCREEN DEBUG ===');
    console.log('Selected date:', selectedDate);
    console.log('Today schedule:', todaySchedule ? 'Found' : 'Not found');
    console.log('Total schedules:', schedules.length);
    console.log('Force update counter:', forceUpdate);
    
    if (todaySchedule) {
      console.log('Schedule details:', {
        id: todaySchedule.id,
        date: todaySchedule.date,
        workingStaff: todaySchedule.workingStaff.length,
        participants: todaySchedule.attendingParticipants.length
      });
    } else {
      console.log('No schedule found for today. Checking if data needs to be loaded...');
      
      // If no schedule is found but we have schedules in general, log available dates
      if (schedules.length > 0) {
        console.log('Available schedule dates:', schedules.map((s: any) => ({ date: s.date, id: s.id })));
        console.log('Date mismatch - looking for:', selectedDate);
      } else {
        console.log('No schedules available in state - may need to refresh data');
      }
    }
    
    console.log('========================');
  }, [selectedDate, todaySchedule, schedules, forceUpdate]);
  
  // Auto-refresh data when component mounts or date changes
  useEffect(() => {
    const autoRefreshData = async () => {
      // Only auto-refresh if we don't have a schedule for the current date
      if (!todaySchedule && schedules.length === 0) {
        console.log('Auto-refreshing data on mount/date change...');
        await refreshAllData();
        setForceUpdate(prev => prev + 1);
      }
    };
    
    // Small delay to let the component settle
    const timeoutId = setTimeout(autoRefreshData, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedDate, todaySchedule, schedules.length, refreshAllData]); // Include all dependencies
  
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
  
  // Load the most recently created schedule
  const loadLastSchedule = async () => {
    console.log('Loading last created schedule...');
    
    if (schedules.length === 0) {
      Alert.alert('No Schedules', 'No schedules found to load.');
      return;
    }
    
    // Find the most recently created schedule
    const sortedSchedules = [...schedules].sort((a, b) => {
      // Sort by date (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    const lastSchedule = sortedSchedules[0];
    
    if (lastSchedule.date === selectedDate) {
      Alert.alert('Already Loaded', 'The most recent schedule is already loaded for today.');
      return;
    }
    
    // Create a copy of the last schedule for today's date
    const todaySchedule = {
      ...lastSchedule,
      id: `schedule-${selectedDate}`,
      date: selectedDate
    };
    
    try {
      // Save the copied schedule for today
      await updateScheduleImmediately(todaySchedule);
      
      Alert.alert(
        'Schedule Loaded', 
        `Successfully loaded schedule from ${new Date(lastSchedule.date).toLocaleDateString()} for today.`
      );
      
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error loading last schedule:', error);
      Alert.alert('Error', 'Failed to load the last schedule. Please try again.');
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
    <View key={`home-${forceUpdate}`} style={styles.container}>
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
            onLoadLastPress={loadLastSchedule}
            hasSchedules={schedules.length > 0}
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
                {schedules.length > 0 && (
                  <Text style={styles.loadHintText}>Use &quot;Load Last&quot; button to copy your most recent schedule</Text>
                )}
                
                {/* Debug info for development */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <Text style={styles.debugText}>Debug Info:</Text>
                    <Text style={styles.debugText}>Date: {selectedDate}</Text>
                    <Text style={styles.debugText}>Total Schedules: {schedules.length}</Text>
                    <Text style={styles.debugText}>Force Update: {forceUpdate}</Text>
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
});