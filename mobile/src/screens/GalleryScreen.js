import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '../theme/scale';
import { colors } from '../theme/tokens';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ 
        paddingTop: mu(20) + insets.top,
        paddingHorizontal: mu(16),
        paddingBottom: mu(40) + insets.bottom,
      }}
    >
      <Text variant="title" style={{ marginBottom: mu(24) }}>
        BridgePulse Design System
      </Text>

      <Section title="Text">
        <Text variant="title">Title (24px)</Text>
        <Text variant="titleS">Title Small (20px)</Text>
        <Text variant="body">Body (16px) - The quick brown fox jumps.</Text>
        <Text variant="bodyS">Body Small (14px) - Secondary text info.</Text>
        <Text variant="caption">Caption (12px) - Used for labels and fine print.</Text>
        <Text variant="small">Small (11px) - Very small legal text.</Text>
        <Text variant="metric">4.1 Hz</Text>
      </Section>

      <Section title="Button">
        <Button label="Primary button" onPress={() => {}} />
        <Button label="Loading..." loading onPress={() => {}} />
      </Section>

      <Section title="Card">
        <Card style={{ padding: mu(16) }}>
          <Text variant="body">Standard card content</Text>
          <Text variant="caption" style={{ color: colors.textSecondary, marginTop: mu(4) }}>
            Elevated surface
          </Text>
        </Card>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }) {
  const { mu } = useScale();
  return (
    <View style={[styles.section, { marginBottom: mu(32) }]}>
      <Text variant="caption" style={[styles.sectionTitle, { marginBottom: mu(12) }]}>
        {title.toUpperCase()}
      </Text>
      <View style={{ gap: mu(12) }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  section: {},
  sectionTitle: {
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
