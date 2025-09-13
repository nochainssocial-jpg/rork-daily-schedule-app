import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Plus, Edit, Share } from 'lucide-react-native';

interface ActionButtonsProps {
  onCreatePress: () => void;
  onEditPress: () => void;
  onSharePress: () => void;
}

export default function ActionButtons({ onCreatePress, onEditPress, onSharePress }: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.createButton]} onPress={onCreatePress}>
        <Plus size={18} color="white" />
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.editButton]} onPress={onEditPress}>
        <Edit size={18} color="white" />
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={onSharePress}>
        <Share size={18} color="white" />
        <Text style={styles.buttonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
    gap: 6,
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
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});