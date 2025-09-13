import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function ShareScheduleScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Share Schedule', presentation: 'modal' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Share Schedule</Text>
        <Text style={styles.subtitle}>Advanced sharing functionality coming soon...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});