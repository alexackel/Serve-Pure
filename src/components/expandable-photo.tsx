import { useState } from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { Modal, Pressable, StyleSheet, type StyleProp } from 'react-native';

// A square post photo that opens full-screen on tap — same conditionally-
// mounted Modal convention as the rest of the codebase's sheets (see
// date-picker-field.tsx), dismissed by tapping anywhere on the backdrop.
export function ExpandablePhoto({ uri, style }: { uri: string; style?: StyleProp<ImageStyle> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Pressable onPress={() => setExpanded(true)} accessibilityRole="imagebutton" accessibilityLabel="View photo">
        <Image source={{ uri }} style={style} contentFit="cover" />
      </Pressable>

      {expanded && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setExpanded(false)}>
          <Pressable style={styles.backdrop} onPress={() => setExpanded(false)}>
            <Image source={{ uri }} style={styles.fullImage} contentFit="contain" />
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
