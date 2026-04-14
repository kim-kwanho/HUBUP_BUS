import React, { useRef, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

interface DialColumnProps {
  items: string[];
  value: string;
  onChange: (val: string) => void;
}

function DialColumn({ items, value, onChange }: DialColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = items.indexOf(value);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      listRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const index = Math.round(listRef.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (items[clamped] !== value) onChange(items[clamped]);
  }, [items, value, onChange]);

  const snapToNearest = useCallback(() => {
    if (!listRef.current) return;
    const index = Math.round(listRef.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    listRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
    onChange(items[clamped]);
  }, [items, onChange]);

  return (
    <ColumnWrap>
      <DialList
        ref={listRef}
        onScroll={handleScroll}
        onTouchEnd={snapToNearest}
        onMouseUp={snapToNearest}
      >
        <Padding />
        {items.map((item) => (
          <DialItem
            key={item}
            selected={item === value}
            onClick={() => {
              onChange(item);
              const idx = items.indexOf(item);
              listRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
            }}
          >
            {item}
          </DialItem>
        ))}
        <Padding />
      </DialList>
    </ColumnWrap>
  );
}

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  minHour?: number;
  maxHour?: number;
  dates?: string[];
  dateMinHours?: Record<string, number>;
}

export default function TimePicker({
  label,
  value,
  onChange,
  minHour = 0,
  maxHour = 23,
  dates,
  dateMinHours,
}: TimePickerProps) {
  let dateVal = dates?.[0] || '';
  let h = String(minHour).padStart(2, '0');
  let m = '00';

  if (dates && value && value.includes(' ')) {
    const [d, time] = value.split(' ');
    dateVal = d;
    [h, m] = time.split(':');
  } else if (!dates && value && value.includes(':')) {
    [h, m] = value.split(':');
  }

  const effectiveMinHour =
    dateMinHours && dateVal && dateMinHours[dateVal] !== undefined
      ? dateMinHours[dateVal]
      : minHour;

  const hours = Array.from({ length: maxHour - effectiveMinHour + 1 }, (_, i) =>
    String(effectiveMinHour + i).padStart(2, '0')
  );
  const minutes = ['00', '10', '20', '30', '40', '50'];

  const handleDateChange = (newD: string) => {
    const newMin =
      dateMinHours && dateMinHours[newD] !== undefined ? dateMinHours[newD] : minHour;
    const currentH = parseInt(h, 10);
    const correctedH =
      currentH < newMin ? String(newMin).padStart(2, '0') : h.padStart(2, '0');
    onChange(buildValue(newD, correctedH, m.padStart(2, '0')));
  };

  const buildValue = (d: string, hh: string, mm: string) =>
    dates ? `${d} ${hh}:${mm}` : `${hh}:${mm}`;

  return (
    <Wrap>
      <PickerLabel>{label}</PickerLabel>
      <PickerBox>
        <SelectionBar />
        {dates && (
          <>
            <DialColumn items={dates} value={dateVal} onChange={handleDateChange} />
            <Separator />
          </>
        )}
        <DialColumn
          items={hours}
          value={h.padStart(2, '0')}
          onChange={(newH) => onChange(buildValue(dateVal, newH, m.padStart(2, '0')))}
        />
        <Colon>:</Colon>
        <DialColumn
          items={minutes}
          value={m.padStart(2, '0')}
          onChange={(newM) => onChange(buildValue(dateVal, h.padStart(2, '0'), newM))}
        />
      </PickerBox>
      {value && <SelectedDisplay>{value}</SelectedDisplay>}
    </Wrap>
  );
}

const Wrap = styled.div`
  margin-bottom: 8px;
`;
const PickerLabel = styled.div`
  font-size: 13px;
  color: #888;
  margin-bottom: 12px;
  font-weight: 500;
`;
const PickerBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${ITEM_HEIGHT * VISIBLE_ITEMS}px;
  background: #f5f5f5;
  border-radius: 16px;
  overflow: hidden;
`;
const SelectionBar = styled.div`
  position: absolute;
  top: 50%;
  left: 16px;
  right: 16px;
  height: ${ITEM_HEIGHT}px;
  transform: translateY(-50%);
  background: #e0e0e0;
  border-radius: 10px;
  pointer-events: none;
  z-index: 1;
`;
const ColumnWrap = styled.div`
  flex: 1;
  height: 100%;
  position: relative;
  z-index: 2;
`;
const DialList = styled.div`
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const Padding = styled.div`
  height: ${ITEM_HEIGHT * 2}px;
  flex-shrink: 0;
`;
const DialItem = styled.div<{ selected: boolean }>`
  height: ${ITEM_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(p) => (p.selected ? '22px' : '17px')};
  font-weight: ${(p) => (p.selected ? '700' : '400')};
  color: ${(p) => (p.selected ? '#111' : '#aaaaaa')};
  scroll-snap-align: center;
  cursor: pointer;
  transition: font-size 0.15s, color 0.15s;
  user-select: none;
`;
const Colon = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #111;
  z-index: 2;
  padding: 0 4px;
`;
const Separator = styled.div`
  width: 1px;
  height: 40px;
  background: #d0d0d0;
  z-index: 2;
  margin: 0 4px;
`;
const SelectedDisplay = styled.div`
  text-align: center;
  font-size: 14px;
  color: #888;
  margin-top: 8px;
`;
