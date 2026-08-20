import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Utensils, Plus } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../common/Card';

interface MealNotesEditorProps {
  value: string;
  onChange: (text: string) => void;
}

export const MealNotesEditor: React.FC<MealNotesEditorProps> = ({ value, onChange }) => {
  const quickTags = ['M1: ', 'M2: ', 'M3: ', 'M4: ', 'Snack: ', 'Whey (30g) + Oats: '];

  const handleAddTag = (tag: string) => {
    const nextVal = value ? `${value.trim()}\n${tag}` : tag;
    onChange(nextVal);
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Utensils size={16} color={colors.secondary} />
          <Text style={styles.title}>Meal Breakdown ("Actual Food")</Text>
        </View>
      </View>

      {/* Quick Meal Snippets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickTagsScroll}
      >
        {quickTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.tagChip}
            onPress={() => handleAddTag(tag)}
            activeOpacity={0.7}
          >
            <Plus size={11} color={colors.secondary} />
            <Text style={styles.tagText}>{tag.replace(': ', '')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Multiline Notes Input */}
      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={6}
        value={value}
        onChangeText={onChange}
        placeholder="M1: 4 Eggs, 2 Toast, 1 Banana&#10;M2: 200g Chicken Breast, Rice, Veggies&#10;M3: Whey protein + 50g oats&#10;M4: Salmon, Sweet Potato..."
        placeholderTextColor={colors.textDisabled}
        textAlignVertical="top"
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleSmall,
    color: colors.text,
  },
  quickTagsScroll: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    ...typography.bodySecondary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 20,
  },
});
