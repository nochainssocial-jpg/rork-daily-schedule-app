import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Plus, Edit, Share, Download, RefreshCw } from 'lucide-react-native';

interface ActionButtonsProps {
  onCreatePress: () => void;
  onEditPress: () => void;
  onSharePress: () => void;
  onLoadLastPress: () => void;
  onRefreshPress: () => void;
  hasSchedules: boolean;
  isRefreshing?: boolean;
  showLoadButton?: boolean;
}

export default function ActionButtons({ onCreatePress, onEditPress, onSharePress, onLoadLastPress, onRefreshPress, hasSchedules, isRefreshing = false, showLoadButton = true }: ActionButtonsProps) {
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

      <TouchableOpacity 
        style={[styles.button, styles.refreshButton, isRefreshing && styles.refreshingButton]} 
        onPress={onRefreshPress}
        disabled={isRefreshing}
      >
        <RefreshCw size={16} color="white" />
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>

      {showLoadButton && (
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
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 70,
    gap: 3,
    flex: 1,
    maxWidth: 80,
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
  refreshButton: {
    backgroundColor: '#9C27B0',
  },
  refreshingButton: {
    backgroundColor: '#7B1FA2',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});