import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Edit, Trash2, Save } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '@/hooks/schedule-store';

type SettingsSection = 'staff' | 'participants' | 'chores' | 'checklist';

export default function SettingsScreen() {
  const { staff, participants, chores, checklist, saveStaff, saveParticipants, saveChores, saveChecklist } = useSchedule();
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<SettingsSection>('staff');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [newItemText, setNewItemText] = useState<string>('');

  const getCurrentData = () => {
    switch (activeSection) {
      case 'staff': return staff;
      case 'participants': return participants;
      case 'chores': return chores;
      case 'checklist': return checklist;
      default: return [];
    }
  };

  const getSaveFunction = () => {
    switch (activeSection) {
      case 'staff': return saveStaff;
      case 'participants': return saveParticipants;
      case 'chores': return saveChores;
      case 'checklist': return saveChecklist;
      default: return () => {};
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item.id);
    setEditText(item.name);
  };

  const handleSave = () => {
    if (!editText.trim()) return;

    const currentData = getCurrentData();
    const updatedData = currentData.map((item: any) =>
      item.id === editingItem ? { ...item, name: editText.trim() } : item
    );

    getSaveFunction()(updatedData);
    setEditingItem(null);
    setEditText('');
  };

  const handleDelete = (itemId: string) => {
    const currentData = getCurrentData();
    const updatedData = currentData.filter((item: any) => item.id !== itemId);
    getSaveFunction()(updatedData);
  };

  const handleAddNew = () => {
    if (!newItemText.trim()) return;

    const currentData = getCurrentData();
    const newId = String(Math.max(...currentData.map((item: any) => parseInt(item.id) || 0)) + 1);
    
    let newItem: any = {
      id: newId,
      name: newItemText.trim()
    };

    // Add color for staff
    if (activeSection === 'staff') {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
      newItem.color = colors[Math.floor(Math.random() * colors.length)];
    }

    const updatedData = [...currentData, newItem];
    getSaveFunction()(updatedData);
    setNewItemText('');
  };

  const renderSectionButtons = () => (
    <View style={styles.sectionButtons}>
      {[
        { key: 'staff', label: 'Staff' },
        { key: 'participants', label: 'Participants' },
        { key: 'chores', label: 'Chores' },
        { key: 'checklist', label: 'Final List' }
      ].map(section => (
        <TouchableOpacity
          key={section.key}
          style={[
            styles.sectionButton,
            activeSection === section.key && styles.activeSectionButton
          ]}
          onPress={() => setActiveSection(section.key as SettingsSection)}
        >
          <Text style={[
            styles.sectionButtonText,
            activeSection === section.key && styles.activeSectionButtonText
          ]}>
            {section.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItems = () => {
    const currentData = getCurrentData();
    
    return (
      <View style={styles.itemsList}>
        {currentData.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            {editingItem === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline={activeSection === 'chores' || activeSection === 'checklist'}
                  numberOfLines={activeSection === 'chores' || activeSection === 'checklist' ? 3 : 1}
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Save size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.itemContent}>
                  {activeSection === 'staff' && (
                    <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                  )}
                  <Text style={styles.itemText}>{item.name}</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
                    <Edit size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderAddNew = () => (
    <View style={styles.addNewSection}>
      <TextInput
        style={styles.newItemInput}
        placeholder={`Add new ${activeSection.slice(0, -1)}...`}
        value={newItemText}
        onChangeText={setNewItemText}
        multiline={activeSection === 'chores' || activeSection === 'checklist'}
        numberOfLines={activeSection === 'chores' || activeSection === 'checklist' ? 3 : 1}
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
        <Plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your lists and preferences</Text>
      </View>

      {renderSectionButtons()}
      {renderAddNew()}
      {renderItems()}
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
  sectionButtons: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 0,
    justifyContent: 'center',
  },
  sectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#B0B0B0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginHorizontal: 2,
  },
  activeSectionButton: {
    backgroundColor: '#FF69B4',
  },
  sectionButtonText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  activeSectionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  itemsList: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 80,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  addNewSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});