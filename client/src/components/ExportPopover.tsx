import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/axios';
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isAfter,
  isBefore,
  parseISO,
  getDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface ExportPopoverProps {
  uid: string;
}

type DatePreset = 'today' | 'thisWeek' | 'lastWeek';
const getPresetRange = (preset: DatePreset): { start: string; end: string } => {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  switch (preset) {
    case 'today':
      return { start: fmt(today), end: fmt(today) };
    case 'thisWeek': {
      const s = startOfWeek(today, { weekStartsOn: 1 });
      const e = endOfWeek(today, { weekStartsOn: 1 });
      return { start: fmt(s), end: fmt(e) };
    }
    case 'lastWeek': {
      const lastWeekDate = subWeeks(today, 1);
      const s = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
      const e = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
      return { start: fmt(s), end: fmt(e) };
    }
  }
};

const isSingleDayRange = (start: string, end: string): boolean => {
  if (!start || !end) return true;
  return isSameDay(parseISO(start), parseISO(end));
};

// Inline mini calendar for range selection
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

interface InlineCalendarProps {
  startDate: string;
  endDate: string;
  onSelect: (start: string, end: string) => void;
}

type SelectingField = 'start' | 'end';

const InlineCalendar = ({ startDate, endDate, onSelect }: InlineCalendarProps) => {
  const [viewMonth, setViewMonth] = useState(() => {
    if (startDate) return startOfMonth(parseISO(startDate));
    return startOfMonth(new Date());
  });
  const [activeField, setActiveField] = useState<SelectingField>('start');

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start: Monday=0 ... Sunday=6
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7;
  const padBefore = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (firstDayOfWeek - i));
    return d;
  });

  const parsedStart = startDate ? parseISO(startDate) : null;
  const parsedEnd = endDate ? parseISO(endDate) : null;

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (activeField === 'start') {
      // Set start date; if it's after current end, also update end
      if (endDate && isAfter(day, parseISO(endDate))) {
        onSelect(dateStr, dateStr);
      } else {
        onSelect(dateStr, endDate || dateStr);
      }
      setActiveField('end');
    } else {
      // Set end date; if it's before current start, swap
      if (startDate && isBefore(day, parseISO(startDate))) {
        onSelect(dateStr, startDate);
      } else {
        onSelect(startDate || dateStr, dateStr);
      }
      setActiveField('start');
    }
  };

  const isInRange = (day: Date) => {
    if (!parsedStart || !parsedEnd) return false;
    return (isAfter(day, parsedStart) || isSameDay(day, parsedStart)) &&
           (isBefore(day, parsedEnd) || isSameDay(day, parsedEnd));
  };

  const isStartDay = (day: Date) => parsedStart && isSameDay(day, parsedStart);
  const isEndDay = (day: Date) => parsedEnd && isSameDay(day, parsedEnd);

  // Sync viewMonth when startDate changes externally (from presets)
  useEffect(() => {
    if (startDate) {
      setViewMonth(startOfMonth(parseISO(startDate)));
    }
  }, [startDate]);

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '----/--/--';
    return dateStr.replace(/-/g, '/');
  };

  return (
    <div>
      {/* Start / End date fields */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setActiveField('start')}
          className={`flex-1 px-2 py-1.5 rounded border text-xs text-center transition-colors ${
            activeField === 'start'
              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-300'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] text-gray-400 mb-0.5">開始日</div>
          <div className="font-medium">{formatDisplay(startDate)}</div>
        </button>
        <span className="text-gray-400 text-sm">~</span>
        <button
          onClick={() => setActiveField('end')}
          className={`flex-1 px-2 py-1.5 rounded border text-xs text-center transition-colors ${
            activeField === 'end'
              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-300'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] text-gray-400 mb-0.5">終了日</div>
          <div className="font-medium">{formatDisplay(endDate)}</div>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(viewMonth, 'yyyy年M月', { locale: ja })}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-medium text-gray-400 py-0.5">{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {padBefore.map((d, i) => (
          <div key={`pad-${i}`} className="text-center text-[11px] text-gray-300 py-1">
            {d.getDate()}
          </div>
        ))}
        {days.map(day => {
          const inRange = isInRange(day);
          const start = isStartDay(day);
          const end = isEndDay(day);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, viewMonth);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`
                text-center text-[11px] py-1 rounded transition-colors
                ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                ${inRange && !start && !end ? 'bg-blue-50 text-blue-700' : ''}
                ${start || end ? 'bg-blue-600 text-white font-bold' : ''}
                ${!inRange && !start && !end ? 'hover:bg-gray-100' : ''}
                ${isToday && !start && !end ? 'font-bold text-blue-600' : ''}
                cursor-pointer
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Shared export panel content
interface ExportPanelProps {
  uid: string;
  onDone?: () => void;
  compact?: boolean;
}

const ExportPanel = ({ uid, onDone, compact = false }: ExportPanelProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wantDetail, setWantDetail] = useState(true);
  const [wantSummary, setWantSummary] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const singleDay = isSingleDayRange(startDate, endDate);

  // Single day: force detail only
  useEffect(() => {
    if (singleDay) {
      setWantDetail(true);
      setWantSummary(false);
    }
  }, [singleDay]);

  // Check data availability
  useEffect(() => {
    if (!startDate || !endDate) {
      setHasData(null);
      return;
    }
    setChecking(true);
    const timer = setTimeout(() => {
      api.get('/export/csv/check', { params: { start: startDate, end: endDate } })
        .then(res => setHasData(res.data.hasData))
        .catch(() => setHasData(null))
        .finally(() => setChecking(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  const applyPreset = (preset: DatePreset) => {
    const { start, end } = getPresetRange(preset);
    setStartDate(start);
    setEndDate(end);
  };

  const handleDownload = () => {
    const base = `${api.defaults.baseURL}/export/csv?uid=${uid}&start=${startDate}&end=${endDate}`;
    if (wantDetail) window.open(`${base}&mode=detail`, '_blank');
    if (wantSummary && !singleDay) window.open(`${base}&mode=summary`, '_blank');
    onDone?.();
  };

  const hasSelection = wantDetail || wantSummary;
  const canDownload = !!(startDate && endDate && hasSelection && hasData && !checking);

  const btnSize = compact ? 'text-xs' : 'text-sm';
  const py = compact ? 'py-1' : 'py-1.5';

  return (
    <>
      {/* Presets */}
      <div className="flex gap-2 mb-3">
        {([['today', '今日'], ['thisWeek', '今週'], ['lastWeek', '先週']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={`flex-1 px-2 ${py} ${btnSize} font-medium rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Inline calendar */}
      <div className="mb-3">
        <InlineCalendar
          startDate={startDate}
          endDate={endDate}
          onSelect={(s, e) => { setStartDate(s); setEndDate(e); }}
        />
      </div>

      {/* Mode selection: checkbox for multi-day, forced detail for single day */}
      <div className="flex gap-4 mb-3">
        {singleDay ? (
          <label className={`flex items-center gap-1.5 ${btnSize}`}>
            <input type="checkbox" checked readOnly className="accent-blue-600" />
            <span className="text-blue-700 font-medium">明細</span>
          </label>
        ) : (
          <>
            <label className={`flex items-center gap-1.5 ${btnSize} cursor-pointer`}>
              <input
                type="checkbox"
                checked={wantDetail}
                onChange={() => setWantDetail(!wantDetail)}
                className="accent-blue-600"
              />
              <span className="text-gray-700">明細</span>
            </label>
            <label className={`flex items-center gap-1.5 ${btnSize} cursor-pointer`}>
              <input
                type="checkbox"
                checked={wantSummary}
                onChange={() => setWantSummary(!wantSummary)}
                className="accent-blue-600"
              />
              <span className="text-gray-700">集計</span>
            </label>
          </>
        )}
      </div>

      {/* Status message */}
      {startDate && endDate && hasData === false && !checking && (
        <p className={`${compact ? 'text-sm' : 'text-xs'} text-orange-500 mb-2`}>データがありません</p>
      )}

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={!canDownload}
        className={`w-full flex items-center justify-center gap-2 px-3 ${compact ? 'py-3' : 'py-2'} rounded${compact ? '-lg' : ''} ${btnSize} font-medium transition-colors ${
          canDownload
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Download size={compact ? 18 : 16} />
        ダウンロード{wantDetail && wantSummary && !singleDay ? ' (2件)' : ''}
      </button>
    </>
  );
};

// Desktop Popover
const DesktopExportPopover = ({ uid }: ExportPopoverProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 p-2 rounded-md transition-colors ${open ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
        title="データ出力"
      >
        <Download size={20} />
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 w-[300px] z-50 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-gray-700">データ出力</h4>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <ExportPanel uid={uid} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};

// Mobile BottomSheet
const MobileExportSheet = ({ uid, onClose }: ExportPopoverProps & { onClose: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-5 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-bold text-gray-800">データ出力</h4>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <ExportPanel uid={uid} onDone={handleClose} compact />
        </div>
      </div>
    </div>
  );
};

export { DesktopExportPopover, MobileExportSheet };
