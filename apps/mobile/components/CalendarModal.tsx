import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarModal({ visible, initialDate, onClose, onSelect }: Props) {
  const [monthCursor, setMonthCursor] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [isYearMode, setIsYearMode] = useState(false);
  const [yearPageStart, setYearPageStart] = useState(Math.floor(initialDate.getFullYear() / 12) * 12);

  // When initialDate changes (reopen), sync month view
  React.useEffect(() => {
    if (visible) {
      setMonthCursor(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
      setIsYearMode(false);
      setYearPageStart(Math.floor(initialDate.getFullYear() / 12) * 12);
    }
  }, [visible, initialDate]);

  const gridDates = useMemo(() => {
    const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startOffset = firstOfMonth.getDay(); // 0(Sun) - 6(Sat)
    const startDate = new Date(firstOfMonth);
    startDate.setDate(firstOfMonth.getDate() - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [monthCursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isCurrentMonth = (d: Date) => d.getMonth() === monthCursor.getMonth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (isYearMode) {
                setYearPageStart((y) => y - 12);
              } else {
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsYearMode((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle}>
              {isYearMode
                ? `${yearPageStart} - ${yearPageStart + 11}`
                : `${monthCursor.getFullYear()}년 ${monthCursor.getMonth() + 1}월`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isYearMode) {
                setYearPageStart((y) => y + 12);
              } else {
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1));
              }
            }}
          >
            <Ionicons name="chevron-forward" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {isYearMode ? (
          <View style={styles.yearGrid}>
            {Array.from({ length: 12 }).map((_, i) => {
              const y = yearPageStart + i;
              const selected = y === monthCursor.getFullYear();
              const isThisYear = y === new Date().getFullYear();
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearCell, selected && styles.selectedYearCell]}
                  onPress={() => {
                    setMonthCursor(new Date(y, monthCursor.getMonth(), 1));
                    setIsYearMode(false);
                  }}
                >
                  <Text style={[styles.yearText, isThisYear && styles.todayYearText]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekday}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {gridDates.map((d, idx) => {
                const inMonth = isCurrentMonth(d);
                const isToday = isSameDay(d, new Date());
                const isSelected = isSameDay(d, initialDate);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.cell, isSelected && styles.selectedCell]}
                    onPress={() => {
                      onSelect(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                      onClose();
                    }}
                  >
                    <View style={[styles.dayDotWrap, isToday && styles.todayWrap]}>
                      <Text style={[styles.dayText, !inMonth && styles.outMonth]}>{d.getDate()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');
const CELL = Math.floor((width - 40) / 7);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  weekday: {
    width: CELL,
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  cell: {
    width: CELL,
    height: CELL,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  yearCell: {
    width: '33.333%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: '#EAF2FF',
  },
  selectedYearCell: {
    backgroundColor: '#EAF2FF',
  },
  dayDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayWrap: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dayText: {
    color: '#000',
    fontSize: 14,
  },
  yearText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  outMonth: {
    color: '#C7C7CC',
  },
  todayYearText: {
    color: '#007AFF',
  },
});
