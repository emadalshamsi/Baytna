import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Brush, WashingMachine, ChefHat, Check, Plus, X,
  Users, StickyNote, Clock, DoorOpen, CalendarDays,
  Shirt, AlertCircle, ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, getLang } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, HousekeepingTask, TaskCompletion, LaundryRequest, LaundryScheduleEntry, Meal } from "@shared/schema";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const mealTypes = ["breakfast", "lunch", "dinner"] as const;

function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDateStr(frequency: string): string {
  const d = new Date();
  if (frequency === "weekly") {
    const day = d.getDay();
    const diff = day === 6 ? 0 : -(day + 1);
    const sat = new Date(d);
    sat.setDate(d.getDate() + diff);
    return `W-${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, "0")}-${String(sat.getDate()).padStart(2, "0")}`;
  }
  if (frequency === "monthly") {
    return `M-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return getTodayDateStr();
}

function getCompletionKey(taskId: number, frequency: string): string {
  return `${taskId}-${getWeekDateStr(frequency)}`;
}

function TabButton({ active, icon: Icon, label, onClick, testId }: { active: boolean; icon: any; label: string; onClick: () => void; testId: string }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      className="flex-1 gap-2"
      onClick={onClick}
      data-testid={testId}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </Button>
  );
}

function MultiRoomSelect({ rooms, selectedIds, onChange, lang }: { rooms: Room[]; selectedIds: number[]; onChange: (ids: number[]) => void; lang: string }) {
  const [open, setOpen] = useState(false);
  const unselected = rooms.filter(r => !selectedIds.includes(r.id));

  return (
    <div className="space-y-1.5" data-testid="multi-select-rooms">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map(id => {
            const room = rooms.find(r => r.id === id);
            if (!room) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => onChange(selectedIds.filter(rid => rid !== id))}
                data-testid={`chip-room-${id}`}
              >
                <DoorOpen className="w-3 h-3" />
                {lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
        </div>
      )}
      {unselected.length > 0 && (
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
                {unselected.map(room => (
                  <div
                    key={room.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover-elevate"
                    onClick={() => {
                      onChange([...selectedIds, room.id]);
                      if (unselected.length <= 1) setOpen(false);
                    }}
                    data-testid={`option-room-${room.id}`}
                  >
                    <DoorOpen className="w-4 h-4 text-muted-foreground" />
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
  const [filter, setFilter] = useState<string>("daily");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ titleAr: "", titleEn: "", frequency: "daily", icon: "" });
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<HousekeepingTask[]>({ queryKey: ["/api/housekeeping-tasks"] });
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: completions = [] } = useQuery<TaskCompletion[]>({
    queryKey: ["/api/task-completions", getWeekDateStr(filter)],
    refetchInterval: 10000,
  });

  const todayCompletions = completions;

  const activeRooms = rooms.filter(r => !r.isExcluded);

  const filteredTasks = tasks.filter(task => {
    if (task.frequency !== filter) return false;
    const room = rooms.find(r => r.id === task.roomId);
    if (room?.isExcluded) return false;
    if (roomFilter !== "all" && task.roomId !== parseInt(roomFilter)) return false;
    return true;
  });

  const completedTaskIds = new Set(
    todayCompletions.map(c => c.taskId)
  );

  const saveTasks = async () => {
    if (!newTask.titleAr || selectedRoomIds.length === 0) return;
    setIsSaving(true);
    try {
      for (const roomId of selectedRoomIds) {
        await apiRequest("POST", "/api/housekeeping-tasks", {
          titleAr: newTask.titleAr,
          titleEn: newTask.titleEn,
          frequency: newTask.frequency,
          roomId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/housekeeping-tasks"] });
      toast({ title: t("housekeepingSection.taskCompleted") });
      setShowAdd(false);
      setNewTask({ titleAr: "", titleEn: "", frequency: "daily", icon: "" });
      setSelectedRoomIds([]);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCompletion = useMutation({
    mutationFn: async ({ taskId, isDone, frequency }: { taskId: number; isDone: boolean; frequency: string }) => {
      const dateStr = getWeekDateStr(frequency);
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
      <div className="flex gap-1.5">
        {(["daily", "weekly", "monthly"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setFilter(f)}
            data-testid={`button-filter-${f}`}
          >
            {t(`housekeepingSection.${f}`)}
          </Button>
        ))}
      </div>

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
            <Select value={newTask.frequency} onValueChange={v => setNewTask(p => ({ ...p, frequency: v }))}>
              <SelectTrigger data-testid="select-task-frequency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("housekeepingSection.daily")}</SelectItem>
                <SelectItem value="weekly">{t("housekeepingSection.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("housekeepingSection.monthly")}</SelectItem>
              </SelectContent>
            </Select>
            <MultiRoomSelect
              rooms={activeRooms}
              selectedIds={selectedRoomIds}
              onChange={setSelectedRoomIds}
              lang={lang}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={!newTask.titleAr || selectedRoomIds.length === 0 || isSaving} onClick={saveTasks} data-testid="button-save-task">
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
                    toggleCompletion.mutate({ taskId: task.id, isDone, frequency: task.frequency });
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
                    {room && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <DoorOpen className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}</span>
                      </div>
                    )}
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
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: requests = [] } = useQuery<LaundryRequest[]>({
    queryKey: ["/api/laundry-requests"],
    refetchInterval: 10000,
  });
  const { data: schedule = [] } = useQuery<LaundryScheduleEntry[]>({ queryKey: ["/api/laundry-schedule"] });

  const activeRooms = rooms.filter(r => !r.isExcluded);
  const pendingRequests = requests.filter(r => r.status === "pending");
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
                {activeRooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{lang === "ar" ? r.nameAr : (r.nameEn || r.nameAr)}</SelectItem>)}
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
                        <Clock className="w-3 h-3 inline" /> {req.createdAt ? new Date(req.createdAt).toLocaleTimeString(lang === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
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

function KitchenTab({ isAdmin }: { isAdmin: boolean }) {
  const { lang } = useLang();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ dayOfWeek: "0", mealType: "breakfast", titleAr: "", titleEn: "", peopleCount: "4", notes: "", imageUrl: "" });

  const today = new Date().getDay();

  const { data: allMeals = [], isLoading } = useQuery<Meal[]>({ queryKey: ["/api/meals"] });

  const todayMeals = allMeals.filter(m => m.dayOfWeek === today);

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
    setForm({ dayOfWeek: "0", mealType: "breakfast", titleAr: "", titleEn: "", peopleCount: "4", notes: "", imageUrl: "" });
  }

  function startEdit(meal: Meal) {
    setEditingId(meal.id);
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

  const getMealIcon = (type: string) => {
    return <ChefHat className="w-5 h-5" />;
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold">{t("housekeepingSection.today")} - {t(`housekeepingSection.${dayNames[today]}`)}</span>
        </CardContent>
      </Card>

      {todayMeals.length > 0 ? (
        <div className="space-y-2">
          {todayMeals.map(meal => (
            <Card key={meal.id} data-testid={`card-meal-${meal.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {meal.imageUrl ? (
                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <img src={meal.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ChefHat className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                        {t(`housekeepingSection.${meal.mealType}`)}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold mt-1">{lang === "ar" ? meal.titleAr : (meal.titleEn || meal.titleAr)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {meal.peopleCount} {t("housekeepingSection.persons")}</span>
                      {meal.notes && <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> {meal.notes}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(meal)} data-testid={`button-edit-meal-${meal.id}`}>
                        <StickyNote className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMeal.mutate(meal.id)} data-testid={`button-delete-meal-${meal.id}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("housekeepingSection.noMeals")}</p>
        </div>
      )}

      {isAdmin && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => { setShowAdd(!showAdd); setEditingId(null); resetForm(); }}
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
                <Input placeholder={lang === "ar" ? "رابط صورة الوجبة" : "Meal image URL"} value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} data-testid="input-meal-image" />
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

          {allMeals.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-muted-foreground mt-4">{t("housekeepingSection.mealPlan")}</h3>
              {dayNames.map((name, dayIdx) => {
                const dayMeals = allMeals.filter(m => m.dayOfWeek === dayIdx);
                if (dayMeals.length === 0) return null;
                return (
                  <div key={dayIdx}>
                    <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{t(`housekeepingSection.${name}`)}</p>
                    {dayMeals.map(m => (
                      <div key={m.id} className="flex items-center gap-2 py-1 text-xs">
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-[10px]">{t(`housekeepingSection.${m.mealType}`)}</Badge>
                        <span className="truncate">{lang === "ar" ? m.titleAr : (m.titleEn || m.titleAr)}</span>
                        <span className="text-muted-foreground flex-shrink-0">{m.peopleCount}p</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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
