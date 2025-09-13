import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Plus, Edit, Share, Download } from 'lucide-react-native';

interface ActionButtonsProps {
  onCreatePress: () => void;
  onEditPress: () => void;
  onSharePress: () => void;
  onLoadLastPress: () => void;
  hasSchedules: boolean;
}

export default function ActionButtons({ onCreatePress, onEditPress, onSharePress, onLoadLastPress, hasSchedules }: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.createButton]} onPress={onCreatePress}>
        <Plus size={16} color="white" />
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.editButton]} onPress={onEditPress}>
        <Edit size={16} color="white" />
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={onSharePress}>
        <Share size={16} color="white" />
        <Text style={styles.buttonText}>Share</Text>
      </TouchableOpacity>

      {hasSchedules && (
        <TouchableOpacity style={[styles.button, styles.loadButton]} onPress={onLoadLastPress}>
          <Download size={16} color="white" />
          <Text style={styles.buttonText}>Load</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 75,
    gap: 4,
    flex: 1,
    maxWidth: 85,
  },
  createButton: {
    backgroundColor: '#E91E63',
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  loadButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});