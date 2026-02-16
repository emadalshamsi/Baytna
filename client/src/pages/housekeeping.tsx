import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Brush, WashingMachine, ChefHat, Check, Plus, X,
  Users, StickyNote, Clock, CalendarDays,
  Shirt, AlertCircle, ImageIcon, Home,
} from "lucide-react";
import { getRoomIcon } from "@/lib/room-icons";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, getLang, formatTime } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, HousekeepingTask, TaskCompletion, LaundryRequest, LaundryScheduleEntry, Meal } from "@shared/schema";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const dayAbbrevKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const mealTypes = ["breakfast", "lunch", "snack", "dinner"] as const;

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDateRange(centerDate: Date, range: number): Date[] {
  const dates: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function DateStrip({ selectedDate, onSelect, daysWithData }: { selectedDate: Date; onSelect: (d: Date) => void; daysWithData?: Set<number> }) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);
  const today = new Date();
  const dates = getDateRange(today, 30);

  useEffect(() => {
    if (scrollRef.current) {
      const selected = scrollRef.current.querySelector("[data-selected='true']") as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ inline: "center", behavior: "auto", block: "nearest" });
      }
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = x - startX.current;
    if (Math.abs(walk) > 3) hasMoved.current = true;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseLeave = () => { isDragging.current = false; };

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1.5 cursor-grab active:cursor-grabbing select-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      data-testid="date-strip"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {dates.map(d => {
        const isToday = isSameDay(d, today);
        const isSelected = isSameDay(d, selectedDate);
        const dayOfWeek = d.getDay();
        const dayAbbr = t(`housekeepingSection.${dayAbbrevKeys[dayOfWeek]}`);
        const dateNum = d.getDate();
        return (
          <button
            key={formatDateStr(d)}
            data-selected={isSelected ? "true" : "false"}
            className={`flex flex-col items-center justify-center min-w-[3rem] h-[3.5rem] px-1 rounded-md transition-colors flex-shrink-0 ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : isToday
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover-elevate"
            }`}
            onClick={() => { if (!hasMoved.current) onSelect(d); }}
            data-testid={`date-${formatDateStr(d)}`}
          >
            <span className="text-[10px] font-medium leading-none mb-0.5">{dayAbbr}</span>
            <span className="text-base font-bold leading-none">{dateNum}</span>
            <div className="h-1.5 mt-0.5 flex items-center justify-center">
              {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-primary" />}
              {!isToday && !isSelected && daysWithData?.has(dayOfWeek) && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getWeekOfMonth(date: Date): number {
  const d = date.getDate();
  return Math.ceil(d / 7);
}

function DaysOfWeekSelector({
  selectedDays, onChange, frequency, onFrequencyChange,
  weeksOfMonth, onWeeksOfMonthChange,
  specificDate, onSpecificDateChange,
}: {
  selectedDays: number[]; onChange: (days: number[]) => void;
  frequency: string; onFrequencyChange: (f: string) => void;
  weeksOfMonth: number[]; onWeeksOfMonthChange: (w: number[]) => void;
  specificDate: string; onSpecificDateChange: (d: string) => void;
}) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };
  const toggleWeek = (week: number) => {
    if (weeksOfMonth.includes(week)) {
      onWeeksOfMonthChange(weeksOfMonth.filter(w => w !== week));
    } else {
      onWeeksOfMonthChange([...weeksOfMonth, week]);
    }
  };
  const allSelected = selectedDays.length === 7;

  const selectPreset = (preset: string) => {
    onFrequencyChange(preset);
    if (preset === "daily") {
      onChange([0, 1, 2, 3, 4, 5, 6]);
      onWeeksOfMonthChange([]);
      onSpecificDateChange("");
    } else if (preset === "weekly") {
      onWeeksOfMonthChange([]);
      onSpecificDateChange("");
    } else if (preset === "monthly") {
      onSpecificDateChange("");
      if (weeksOfMonth.length === 0) onWeeksOfMonthChange([1]);
      if (selectedDays.length === 7 || selectedDays.length === 0) onChange([6]);
    } else if (preset === "once") {
      onChange([]);
      onWeeksOfMonthChange([]);
      if (!specificDate) onSpecificDateChange(formatDateStr(new Date()));
    }
  };

  const weekKeys = ["week1", "week2", "week3", "week4"] as const;

  return (
    <div className="space-y-2" data-testid="days-of-week-selector">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant={frequency === "daily" && allSelected ? "default" : "outline"} size="sm" className="text-xs" onClick={() => selectPreset("daily")} data-testid="button-toggle-all-days">
          {t("housekeepingSection.everyDay")}
        </Button>
        <Button type="button" variant={frequency === "weekly" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => selectPreset("weekly")} data-testid="button-every-week">
          {t("housekeepingSection.everyWeek")}
        </Button>
        <Button type="button" variant={frequency === "monthly" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => selectPreset("monthly")} data-testid="button-every-month">
          {t("housekeepingSection.everyMonth")}
        </Button>
        <Button type="button" variant={frequency === "once" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => selectPreset("once")} data-testid="button-specific-date">
          {t("housekeepingSection.specificDate")}
        </Button>
      </div>

      {frequency === "weekly" && (
        <div className="grid grid-cols-7 gap-1">
          {dayAbbrevKeys.map((key, i) => (
            <Button key={i} type="button" variant={selectedDays.includes(i) ? "default" : "outline"} size="sm" className="text-xs p-1" onClick={() => toggleDay(i)} data-testid={`button-day-${i}`}>
              {t(`housekeepingSection.${key}`)}
            </Button>
          ))}
        </div>
      )}

      {frequency === "monthly" && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1">
            {weekKeys.map((key, i) => (
              <Button key={i} type="button" variant={weeksOfMonth.includes(i + 1) ? "default" : "outline"} size="sm" className="text-xs" onClick={() => toggleWeek(i + 1)} data-testid={`button-week-${i + 1}`}>
                {t(`housekeepingSection.${key}`)}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dayAbbrevKeys.map((key, i) => (
              <Button key={i} type="button" variant={selectedDays.includes(i) ? "default" : "outline"} size="sm" className="text-xs p-1" onClick={() => toggleDay(i)} data-testid={`button-day-${i}`}>
                {t(`housekeepingSection.${key}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {frequency === "once" && (
        <Input
          type="date"
          value={specificDate}
          onChange={e => onSpecificDateChange(e.target.value)}
          data-testid="input-specific-date"
        />
      )}
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick, testId }: { active: boolean; icon: any; label: string; onClick: () => void; testId: string }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      className="flex-1 gap-2 min-h-[4.5rem]"
      onClick={onClick}
      data-testid={testId}
    >
      <Icon className="w-6 h-6" />
      <span className="text-sm">{label}</span>
    </Button>
  );
}

function MultiRoomSelect({ rooms, selectedIds, onChange, lang, showAllRooms }: { rooms: Room[]; selectedIds: number[]; onChange: (ids: number[]) => void; lang: string; showAllRooms?: boolean }) {
  const [open, setOpen] = useState(false);
  const isAllSelected = selectedIds.includes(-1);
  const unselected = isAllSelected ? [] : rooms.filter(r => !selectedIds.includes(r.id));

  return (
    <div className="space-y-1.5" data-testid="multi-select-rooms">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map(id => {
            if (id === -1) {
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => onChange(selectedIds.filter(rid => rid !== id))}
                  data-testid="chip-room-all"
                >
                  <Home className="w-3 h-3" />
                  {t("housekeepingSection.allRooms")}
                  <X className="w-3 h-3" />
                </Badge>
              );
            }
            const room = rooms.find(r => r.id === id);
            if (!room) return null;
            const ChipIcon = getRoomIcon(room.icon);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => onChange(selectedIds.filter(rid => rid !== id))}
                data-testid={`chip-room-${id}`}
              >
                <ChipIcon className="w-3 h-3" />
                {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
        </div>
      )}
      {!isAllSelected && (unselected.length > 0 || showAllRooms) && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setOpen(!open)}
            data-testid="button-open-room-picker"
          >
            <Plus className="w-3.5 h-3.5" />
            {selectedIds.length === 0 ? t("housekeepingSection.selectRoom") : t("housekeepingSection.addRoom")}
          </Button>
          {open && (
            <Card className="absolute z-50 mt-1 w-full shadow-md" data-testid="room-picker-dropdown">
              <CardContent className="p-1">
                {showAllRooms && !isAllSelected && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover-elevate"
                    onClick={() => {
                      onChange([-1]);
                      setOpen(false);
                    }}
                    data-testid="option-room-all"
                  >
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("housekeepingSection.allRooms")}</span>
                  </div>
                )}
                {unselected.map(room => (
                  <div
                    key={room.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover-elevate"
                    onClick={() => {
                      onChange([...selectedIds, room.id]);
                      setOpen(false);
                    }}
                    data-testid={`option-room-${room.id}`}
                  >
                    {(() => { const OptIcon = getRoomIcon(room.icon); return <OptIcon className="w-4 h-4 text-muted-foreground" />; })()}
                    <span className="text-sm">{lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function TasksTab({ isAdmin }: { isAdmin: boolean }) {
  const { lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ titleAr: "", titleEn: "", frequency: "daily", icon: "" });
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [selectedWeeksOfMonth, setSelectedWeeksOfMonth] = useState<number[]>([]);
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = formatDateStr(selectedDate);
  const selectedDayOfWeek = selectedDate.getDay();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<HousekeepingTask[]>({ queryKey: ["/api/housekeeping-tasks"] });
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: completions = [] } = useQuery<TaskCompletion[]>({
    queryKey: ["/api/task-completions", dateStr],
    refetchInterval: 10000,
  });
  const { data: myRoomIds = [] } = useQuery<number[]>({
    queryKey: ["/api/user-rooms", user?.id],
    enabled: !!user && user.role === "household",
  });

  const isHousehold = user?.role === "household";
  const hasRoomFilter = isHousehold && myRoomIds.length > 0;
  const allActiveRooms = rooms.filter(r => !r.isExcluded);
  const activeRooms = hasRoomFilter ? allActiveRooms.filter(r => myRoomIds.includes(r.id)) : allActiveRooms;

  const selectedWeekNum = getWeekOfMonth(selectedDate);

  const filteredTasks = tasks.filter(task => {
    if (!task.isActive) return false;
    const room = task.roomId ? rooms.find(r => r.id === task.roomId) : null;
    if (room?.isExcluded) return false;
    if (hasRoomFilter && task.roomId && !myRoomIds.includes(task.roomId)) return false;
    if (roomFilter !== "all" && task.roomId !== parseInt(roomFilter)) return false;

    if (task.frequency === "once") {
      return task.specificDate === dateStr;
    }

    if (task.frequency === "monthly") {
      const taskWeeks = task.weeksOfMonth as number[] | null;
      const taskDays = task.daysOfWeek as number[] | null;
      if (taskWeeks && taskWeeks.length > 0 && !taskWeeks.includes(selectedWeekNum)) return false;
      if (taskDays && taskDays.length > 0 && !taskDays.includes(selectedDayOfWeek)) return false;
      return true;
    }

    const taskDays = task.daysOfWeek as number[] | null;
    if (taskDays && taskDays.length > 0) {
      if (!taskDays.includes(selectedDayOfWeek)) return false;
    }
    return true;
  });

  const completedTaskIds = new Set(completions.map(c => c.taskId));

  const isAllRoomsSelected = selectedRoomIds.includes(-1);

  const canSave = () => {
    if (!newTask.titleAr || selectedRoomIds.length === 0) return false;
    if (newTask.frequency === "once") return !!selectedSpecificDate;
    if (newTask.frequency === "monthly") return selectedDaysOfWeek.length > 0 && selectedWeeksOfMonth.length > 0;
    if (newTask.frequency === "weekly") return selectedDaysOfWeek.length > 0;
    return true;
  };

  const saveTasks = async () => {
    if (!canSave()) return;
    setIsSaving(true);
    try {
      const taskPayload = {
        titleAr: newTask.titleAr,
        titleEn: newTask.titleEn,
        frequency: newTask.frequency,
        daysOfWeek: newTask.frequency === "once" ? [] : selectedDaysOfWeek,
        weeksOfMonth: newTask.frequency === "monthly" ? selectedWeeksOfMonth : null,
        specificDate: newTask.frequency === "once" ? selectedSpecificDate : null,
      };

      const roomsToCreate = isAllRoomsSelected ? activeRooms.map(r => r.id) : selectedRoomIds;
      for (const roomId of roomsToCreate) {
        await apiRequest("POST", "/api/housekeeping-tasks", { ...taskPayload, roomId });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
      toast({ title: t("housekeepingSection.taskCompleted") });
      setShowAdd(false);
      setNewTask({ titleAr: "", titleEn: "", frequency: "daily", icon: "" });
      setSelectedRoomIds([]);
      setSelectedDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
      setSelectedWeeksOfMonth([]);
      setSelectedSpecificDate("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCompletion = useMutation({
    mutationFn: async ({ taskId, isDone }: { taskId: number; isDone: boolean }) => {
      if (isDone) {
        await apiRequest("DELETE", `/api/task-completions/${taskId}/${dateStr}`);
      } else {
        await apiRequest("POST", "/api/task-completions", { taskId, completionDate: dateStr });
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-completions"] });
      toast({ title: vars.isDone ? t("housekeepingSection.taskUncompleted") : t("housekeepingSection.taskCompleted") });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/housekeeping-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
    },
  });

  if (tasksLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      {activeRooms.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Button
            variant={roomFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setRoomFilter("all")}
            data-testid="button-filter-all-rooms"
          >
            {t("housekeepingSection.allRooms")}
          </Button>
          {activeRooms.map(room => (
            <Button
              key={room.id}
              variant={roomFilter === String(room.id) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRoomFilter(String(room.id))}
              data-testid={`button-filter-room-${room.id}`}
            >
              {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
            </Button>
          ))}
        </div>
      )}

      {isAdmin && (
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="w-full gap-2" data-testid="button-add-task">
          <Plus className="w-4 h-4" />
          {t("housekeepingSection.addTask")}
        </Button>
      )}

      {showAdd && isAdmin && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <Input placeholder={t("housekeepingSection.taskTitle") + " (عربي)"} value={newTask.titleAr} onChange={e => setNewTask(p => ({ ...p, titleAr: e.target.value }))} data-testid="input-task-title-ar" />
            <Input placeholder={t("housekeepingSection.taskTitle") + " (EN)"} value={newTask.titleEn} onChange={e => setNewTask(p => ({ ...p, titleEn: e.target.value }))} data-testid="input-task-title-en" />
            <DaysOfWeekSelector
              selectedDays={selectedDaysOfWeek} onChange={setSelectedDaysOfWeek}
              frequency={newTask.frequency} onFrequencyChange={f => setNewTask(p => ({ ...p, frequency: f }))}
              weeksOfMonth={selectedWeeksOfMonth} onWeeksOfMonthChange={setSelectedWeeksOfMonth}
              specificDate={selectedSpecificDate} onSpecificDateChange={setSelectedSpecificDate}
            />
            <MultiRoomSelect
              rooms={activeRooms}
              selectedIds={selectedRoomIds}
              onChange={setSelectedRoomIds}
              lang={lang}
              showAllRooms
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={!canSave() || isSaving} onClick={saveTasks} data-testid="button-save-task">
                {isSaving ? "..." : t("actions.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setSelectedRoomIds([]); }}>{t("actions.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Brush className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("housekeepingSection.noTasks")}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredTasks.map(task => {
            const isDone = completedTaskIds.has(task.id);
            const room = rooms.find(r => r.id === task.roomId);
            return (
              <Card
                key={task.id}
                className={`hover-elevate active-elevate-2 cursor-pointer transition-all ${isDone ? "opacity-60" : ""}`}
                onClick={() => {
                  if (user?.role === "maid" || user?.role === "admin") {
                    toggleCompletion.mutate({ taskId: task.id, isDone });
                  }
                }}
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isDone ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="w-6 h-6" strokeWidth={3} /> : <Brush className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isDone ? "line-through" : ""}`}>
                      {lang === "ar" ? task.titleAr : (task.titleEn || task.titleAr)}
                    </p>
                    {room && (() => { const TaskRoomIcon = getRoomIcon(room.icon); return (
                      <div className="flex items-center gap-1 mt-0.5">
                        <TaskRoomIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}</span>
                      </div>
                    ); })()}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isDone ? (
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                        {t("housekeepingSection.taskDone")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">
                        {t("housekeepingSection.taskPending")}
                      </Badge>
                    )}
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); deleteTask.mutate(task.id); }} data-testid={`button-delete-task-${task.id}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LaundryTab({ isAdmin, isMaid, isHousehold }: { isAdmin: boolean; isMaid: boolean; isHousehold: boolean }) {
  const { lang } = useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: requests = [] } = useQuery<LaundryRequest[]>({
    queryKey: ["/api/laundry-requests"],
    refetchInterval: 10000,
  });
  const { data: schedule = [] } = useQuery<LaundryScheduleEntry[]>({ queryKey: ["/api/laundry-schedule"] });
  const { data: myRoomIds = [] } = useQuery<number[]>({
    queryKey: ["/api/user-rooms", user?.id],
    enabled: !!user && isHousehold,
  });

  const hasRoomFilter = isHousehold && myRoomIds.length > 0;
  const allActiveRooms = rooms.filter(r => !r.isExcluded);
  const activeRooms = hasRoomFilter ? allActiveRooms.filter(r => myRoomIds.includes(r.id)) : allActiveRooms;
  const pendingRequests = requests.filter(r => {
    if (r.status !== "pending") return false;
    if (hasRoomFilter && !myRoomIds.includes(r.roomId)) return false;
    return true;
  });
  const today = new Date().getDay();
  const scheduledDays = schedule.map(s => s.dayOfWeek);
  const isLaundryDay = scheduledDays.includes(today);

  const createRequest = useMutation({
    mutationFn: (roomId: number) => apiRequest("POST", "/api/laundry-requests", { roomId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry-requests"] });
      toast({ title: t("housekeepingSection.laundryRequestSent") });
      setSelectedRoom("");
    },
  });

  const completeRequest = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/laundry-requests/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry-requests"] });
      toast({ title: t("housekeepingSection.laundryDone") });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/laundry-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry-requests"] });
      toast({ title: t("housekeepingSection.laundryCancelled") });
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const roomsWithPendingToday = new Set(
    requests.filter(r => r.status === "pending" && r.createdAt && new Date(r.createdAt).toISOString().split("T")[0] === todayStr).map(r => r.roomId)
  );
  const availableRooms = activeRooms.filter(r => !roomsWithPendingToday.has(r.id));

  const updateSchedule = useMutation({
    mutationFn: (days: number[]) => apiRequest("PUT", "/api/laundry-schedule", { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry-schedule"] });
    },
  });

  const toggleDay = (day: number) => {
    const newDays = scheduledDays.includes(day) ? scheduledDays.filter(d => d !== day) : [...scheduledDays, day];
    updateSchedule.mutate(newDays);
  };

  return (
    <div className="space-y-4">
      {isLaundryDay ? (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t("housekeepingSection.isLaundryDay")}</span>
          </CardContent>
        </Card>
      ) : scheduledDays.length > 0 ? (
        <Card className="border-muted">
          <CardContent className="p-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("housekeepingSection.notLaundryDay")}</span>
          </CardContent>
        </Card>
      ) : null}

      {(isHousehold || isAdmin) && (
        <Card data-testid="card-laundry-request">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-sm font-bold">{t("housekeepingSection.laundryBasket")}</h3>
            </div>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger data-testid="select-laundry-room"><SelectValue placeholder={t("housekeepingSection.selectRoom")} /></SelectTrigger>
              <SelectContent>
                {availableRooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{lang === "ar" ? r.nameAr : (r.nameEn || r.nameAr)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              className="w-full gap-2"
              disabled={!selectedRoom || createRequest.isPending}
              onClick={() => createRequest.mutate(parseInt(selectedRoom))}
              data-testid="button-send-laundry"
            >
              <WashingMachine className="w-5 h-5" />
              {t("housekeepingSection.sendLaundryRequest")}
            </Button>
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            {t("housekeepingSection.pendingLaundry")} ({pendingRequests.length})
          </h3>
          {pendingRequests.map(req => {
            const room = rooms.find(r => r.id === req.roomId);
            return (
              <Card key={req.id} className="border-orange-500/20" data-testid={`card-laundry-${req.id}`}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <WashingMachine className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{room ? (lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)) : "?"}</p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 inline" /> {req.createdAt ? formatTime(req.createdAt) : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(req.requestedBy === user?.id || isAdmin) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cancelRequest.mutate(req.id)}
                        data-testid={`button-cancel-laundry-${req.id}`}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    {(isMaid || isAdmin) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => completeRequest.mutate(req.id)}
                        data-testid={`button-complete-laundry-${req.id}`}
                      >
                        <Check className="w-4 h-4" />
                        {t("housekeepingSection.laundryDone")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pendingRequests.length === 0 && !isHousehold && (
        <div className="text-center py-6 text-muted-foreground">
          <WashingMachine className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("housekeepingSection.noLaundryRequests")}</p>
        </div>
      )}

      {isAdmin && (
        <Card data-testid="card-laundry-schedule">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {t("housekeepingSection.laundryDays")}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((name, i) => (
                <Button
                  key={i}
                  variant={scheduledDays.includes(i) ? "default" : "outline"}
                  size="sm"
                  className="text-xs p-1"
                  onClick={() => toggleDay(i)}
                  data-testid={`button-laundry-day-${i}`}
                >
                  {t(`housekeepingSection.${name}`).slice(0, 3)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MealCardsGrid({ meals, lang, isAdmin, onEdit, onDelete }: {
  meals: Meal[];
  lang: string;
  isAdmin?: boolean;
  onEdit?: (meal: Meal) => void;
  onDelete?: (id: number) => void;
}) {
  const mealOrder: Record<string, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };
  const sorted = [...meals].sort((a, b) => (mealOrder[a.mealType] ?? 9) - (mealOrder[b.mealType] ?? 9));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t("housekeepingSection.noMeals")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="meal-cards-grid">
      {sorted.map(meal => (
        <Card key={meal.id} className="overflow-hidden" data-testid={`card-meal-${meal.id}`}>
          <CardContent className="p-0">
            <div className="aspect-square relative bg-muted">
              {meal.imageUrl ? (
                <img src={meal.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ChefHat className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate absolute top-1.5 start-1.5 text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
                {t(`housekeepingSection.${meal.mealType}`)}
              </Badge>
              {isAdmin && onEdit && onDelete && (
                <div className="absolute top-1 end-1 flex gap-0.5">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(meal)} data-testid={`button-edit-meal-${meal.id}`}>
                    <StickyNote className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(meal.id)} data-testid={`button-delete-meal-${meal.id}`}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-bold truncate">{lang === "ar" ? meal.titleAr : (meal.titleEn || meal.titleAr)}</p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                <Users className="w-2.5 h-2.5" />
                <span>{meal.peopleCount} {t("housekeepingSection.persons")}</span>
              </div>
              {meal.notes && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{meal.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KitchenTab({ isAdmin }: { isAdmin: boolean }) {
  const { lang } = useLang();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ dayOfWeek: "0", mealType: "breakfast", titleAr: "", titleEn: "", peopleCount: "4", notes: "", imageUrl: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const { compressImage } = await import("@/lib/image-compress");
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(p => ({ ...p, imageUrl: data.imageUrl }));
    } catch {
      toast({ title: t("profile.uploadFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const selectedDayOfWeek = selectedDate.getDay();
  const { data: allMeals = [], isLoading } = useQuery<Meal[]>({ queryKey: ["/api/meals"] });
  const selectedMeals = allMeals.filter(m => m.dayOfWeek === selectedDayOfWeek);

  const daysWithMeals = new Set(allMeals.map(m => m.dayOfWeek));

  const createMeal = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      toast({ title: t("housekeepingSection.addMeal") });
      setShowAdd(false);
      resetForm();
    },
  });

  const updateMeal = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/meals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMeal = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
    },
  });

  function resetForm() {
    setForm({ dayOfWeek: String(selectedDayOfWeek), mealType: "breakfast", titleAr: "", titleEn: "", peopleCount: "4", notes: "", imageUrl: "" });
  }

  function startEdit(meal: Meal) {
    setEditingId(meal.id);
    setShowAdd(true);
    setForm({
      dayOfWeek: String(meal.dayOfWeek),
      mealType: meal.mealType,
      titleAr: meal.titleAr,
      titleEn: meal.titleEn || "",
      peopleCount: String(meal.peopleCount),
      notes: meal.notes || "",
      imageUrl: meal.imageUrl || "",
    });
  }

  function submitForm() {
    const data = {
      ...form,
      dayOfWeek: parseInt(form.dayOfWeek),
      peopleCount: parseInt(form.peopleCount) || 4,
    };
    if (editingId) {
      updateMeal.mutate({ id: editingId, data });
    } else {
      createMeal.mutate(data);
    }
  }

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} daysWithData={daysWithMeals} />

      <MealCardsGrid
        meals={selectedMeals}
        lang={lang}
        isAdmin={isAdmin}
        onEdit={startEdit}
        onDelete={(id) => deleteMeal.mutate(id)}
      />

      {isAdmin && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              if (!showAdd) {
                setEditingId(null);
                setForm({ dayOfWeek: String(selectedDayOfWeek), mealType: "breakfast", titleAr: "", titleEn: "", peopleCount: "4", notes: "", imageUrl: "" });
              }
              setShowAdd(!showAdd);
            }}
            data-testid="button-add-meal"
          >
            <Plus className="w-4 h-4" />
            {t("housekeepingSection.addMeal")}
          </Button>

          {(showAdd || editingId) && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <Select value={form.dayOfWeek} onValueChange={v => setForm(p => ({ ...p, dayOfWeek: v }))}>
                  <SelectTrigger data-testid="select-meal-day"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayNames.map((name, i) => <SelectItem key={i} value={String(i)}>{t(`housekeepingSection.${name}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.mealType} onValueChange={v => setForm(p => ({ ...p, mealType: v }))}>
                  <SelectTrigger data-testid="select-meal-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mealTypes.map(mt => <SelectItem key={mt} value={mt}>{t(`housekeepingSection.${mt}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder={t("housekeepingSection.mealTitle") + " (عربي)"} value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} data-testid="input-meal-title-ar" />
                <Input placeholder={t("housekeepingSection.mealTitle") + " (EN)"} value={form.titleEn} onChange={e => setForm(p => ({ ...p, titleEn: e.target.value }))} data-testid="input-meal-title-en" />
                <Input placeholder={t("housekeepingSection.peopleCount")} type="number" value={form.peopleCount} onChange={e => setForm(p => ({ ...p, peopleCount: e.target.value }))} data-testid="input-meal-people" />
                <Input placeholder={t("housekeepingSection.specialNotes")} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-meal-notes" />
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
                <div className="flex items-center gap-2">
                  {form.imageUrl ? (
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                      <Button size="icon" variant="ghost" className="absolute top-0 end-0 w-6 h-6 bg-black/50 text-white rounded-full" onClick={() => setForm(p => ({ ...p, imageUrl: "" }))} data-testid="button-remove-meal-image">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : null}
                  <Button size="sm" variant="outline" className="gap-2 flex-1" disabled={uploading} onClick={() => fileInputRef.current?.click()} data-testid="button-upload-meal-image">
                    <ImageIcon className="w-4 h-4" />
                    {uploading ? t("profile.uploading") : form.imageUrl ? (lang === "ar" ? "تغيير الصورة" : "Change Image") : (lang === "ar" ? "رفع صورة" : "Upload Image")}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!form.titleAr || createMeal.isPending || updateMeal.isPending} onClick={submitForm} data-testid="button-save-meal">
                    {editingId ? t("actions.update") : t("actions.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); resetForm(); }}>
                    {t("actions.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function HousekeepingPage() {
  useLang();
  const { user } = useAuth();
  const [tab, setTab] = useState<"tasks" | "laundry" | "kitchen">("tasks");

  if (!user) return null;
  const isAdmin = user.role === "admin";
  const isMaid = user.role === "maid";
  const isHousehold = user.role === "household";

  return (
    <div className="space-y-4" data-testid="page-housekeeping">
      <div className="flex gap-1.5">
        <TabButton active={tab === "tasks"} icon={Brush} label={t("housekeepingSection.tasks")} onClick={() => setTab("tasks")} testId="tab-tasks" />
        <TabButton active={tab === "laundry"} icon={WashingMachine} label={t("housekeepingSection.laundry")} onClick={() => setTab("laundry")} testId="tab-laundry" />
        <TabButton active={tab === "kitchen"} icon={ChefHat} label={t("housekeepingSection.kitchen")} onClick={() => setTab("kitchen")} testId="tab-kitchen" />
      </div>

      {tab === "tasks" && <TasksTab isAdmin={isAdmin} />}
      {tab === "laundry" && <LaundryTab isAdmin={isAdmin} isMaid={isMaid} isHousehold={isHousehold} />}
      {tab === "kitchen" && <KitchenTab isAdmin={isAdmin} />}
    </div>
  );
}
