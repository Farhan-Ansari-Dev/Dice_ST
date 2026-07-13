import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useNotificationStore } from '../../store/notificationStore';

interface NotificationBellProps {
  onPress: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity onPress={onPress} style={{ position: 'relative', padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bgDark, paddingHorizontal: 3 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default NotificationBell;
