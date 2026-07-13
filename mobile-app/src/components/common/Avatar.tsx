import React, { useState, useEffect } from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BorderRadius } from '../../theme';
import { getInitials } from '../../utils/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const SIZE_MAP: Record<AvatarSize, number> = { xs: 28, sm: 36, md: 44, lg: 56, xl: 72 };

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  online?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ name = 'U', uri, size = 'md', style, online }) => {
  const { colors } = useTheme();
  const dimension = SIZE_MAP[size];
  const fontSize = dimension * 0.38;
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [uri]);

  const showImage = uri && !imgError;

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2, resizeMode: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2, alignItems: 'center', justifyContent: 'center' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize, letterSpacing: 0.5 }}>{getInitials(name)}</Text>
        </LinearGradient>
      )}
      {online !== undefined && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dimension * 0.28,
            height: dimension * 0.28,
            borderRadius: (dimension * 0.28) / 2,
            backgroundColor: online ? colors.success : colors.textTertiary,
            borderWidth: 2,
            borderColor: colors.bgDark,
          }}
        />
      )}
    </View>
  );
};

export default Avatar;
