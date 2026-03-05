import React from 'react';
import { View, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const toastConfig = {
  successGradient: ({ text1, text2 }) => (
    <LinearGradient
      colors={['#7b5ce6', '#a78bfa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 10,
        marginHorizontal: 20,
        marginTop: 15,
        paddingVertical: 12,
        paddingHorizontal: 16,
        elevation: 5,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{text1}</Text>
      {text2 ? (
        <Text style={{ color: '#f0f0f0', marginTop: 3, fontSize: 13 }}>{text2}</Text>
      ) : null}
    </LinearGradient>
  ),

  errorGradient: ({ text1, text2 }) => (
    <LinearGradient
      colors={['#e53935', '#b71c1c']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 10,
        marginHorizontal: 20,
        marginTop: 15,
        paddingVertical: 12,
        paddingHorizontal: 16,
        elevation: 5,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{text1}</Text>
      {text2 ? (
        <Text style={{ color: '#f0f0f0', marginTop: 3, fontSize: 13 }}>{text2}</Text>
      ) : null}
    </LinearGradient>
  ),
};
