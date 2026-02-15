import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brush, WashingMachine, ChefHat, Check, DoorOpen,
  AlertCircle, Clock, Users,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { t, formatTime } from "@/lib/i18n";
import { useLang } from "@/App";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, HousekeepingTask, TaskCompletion, LaundryRequest, LaundryScheduleEntry, Meal } from "@shared/schema";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

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

export default function MaidHomePage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date().getDay();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<HousekeepingTask[]>({ queryKey: ["/api/housekeeping-tasks"] });
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const { data: dailyCompletions = [] } = useQuery<TaskCompletion[]>({
    queryKey: ["/api/task-completions", getTodayDateStr()],
    refetchInterval: 10000,
  });
  const { data: laundryRequests = [] } = useQuery<LaundryRequest[]>({
    queryKey: ["/api/laundry-requests"],
    refetchInterval: 10000,
  });
  const { data: schedule = [] } = useQuery<LaundryScheduleEntry[]>({ queryKey: ["/api/laundry-schedule"] });
  const { data: allMeals = [] } = useQuery<Meal[]>({ queryKey: ["/api/meals"] });

  const activeRooms = rooms.filter(r => !r.isExcluded);
  const dailyTasks = tasks.filter(task => {
    if (task.frequency !== "daily") return false;
    const room = rooms.find(r => r.id === task.roomId);
    return room && !room.isExcluded;
  });
  const completedTaskIds = new Set(dailyCompletions.map(c => c.taskId));
  const pendingLaundry = laundryRequests.filter(r => r.status === "pending");
  const mealOrder: Record<string, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };
  const todayMeals = allMeals.filter(m => m.dayOfWeek === today).sort((a, b) => (mealOrder[a.mealType] ?? 9) - (mealOrder[b.mealType] ?? 9));
  const isLaundryDay = schedule.some(s => s.dayOfWeek === today);

  const doneCount = dailyTasks.filter(t => completedTaskIds.has(t.id)).length;
  const totalCount = dailyTasks.length;

  const toggleCompletion = useMutation({
    mutationFn: async ({ taskId, isDone }: { taskId: number; isDone: boolean }) => {
      const dateStr = getTodayDateStr();
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

  const completeLaundry = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/laundry-requests/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry-requests"] });
      toast({ title: t("housekeepingSection.laundryDone") });
    },
  });

  if (tasksLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const tasksByRoom: Record<number, HousekeepingTask[]> = {};
  for (const task of dailyTasks) {
    if (!tasksByRoom[task.roomId]) tasksByRoom[task.roomId] = [];
    tasksByRoom[task.roomId].push(task);
  }

  return (
    <div className="space-y-5" data-testid="page-maid-home">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brush className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" data-testid="text-maid-greeting">{t("maidHome.todayTasks")}</h2>
            <p className="text-sm text-muted-foreground">
              {doneCount}/{totalCount} {t("maidHome.completed")}
            </p>
          </div>
          {totalCount > 0 && (
            <div className="flex-shrink-0">
              <div className="w-14 h-14 relative flex items-center justify-center">
                <svg className="absolute inset-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                    strokeDasharray={`${(doneCount / totalCount) * 150.8} 150.8`}
                    strokeLinecap="round" />
                </svg>
                <span className="text-sm font-bold relative">{Math.round((doneCount / totalCount) * 100)}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {todayMeals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-bold">{t("maidHome.todayMeals")}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2" data-testid="meal-cards-grid-maid">
            {todayMeals.map(meal => (
              <Card key={meal.id} className="overflow-hidden" data-testid={`card-maid-meal-${meal.id}`}>
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
        </div>
      )}

      {pendingLaundry.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold">{t("maidHome.laundryAlerts")}</h3>
            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">
              {pendingLaundry.length}
            </Badge>
          </div>
          {pendingLaundry.map(req => {
            const room = rooms.find(r => r.id === req.roomId);
            return (
              <Card key={req.id} className="border-orange-500/20" data-testid={`card-maid-laundry-${req.id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <WashingMachine className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{room ? (lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)) : "?"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.createdAt ? formatTime(req.createdAt) : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => completeLaundry.mutate(req.id)}
                    data-testid={`button-maid-complete-laundry-${req.id}`}
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-bold">{t("housekeepingSection.laundryDone")}</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isLaundryDay && pendingLaundry.length === 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <WashingMachine className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{t("housekeepingSection.isLaundryDay")}</p>
              <p className="text-xs text-muted-foreground">{t("maidHome.noLaundryPending")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(tasksByRoom).length > 0 ? (
        Object.entries(tasksByRoom).map(([roomIdStr, roomTasks]) => {
          const roomId = parseInt(roomIdStr);
          const room = rooms.find(r => r.id === roomId);
          if (!room) return null;
          const roomDone = roomTasks.filter(t => completedTaskIds.has(t.id)).length;
          return (
            <div key={roomId} className="space-y-2">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-base font-bold">{lang === "ar" ? room.nameAr : (room.nameEn || room.nameAr)}</h3>
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs">
                  {roomDone}/{roomTasks.length}
                </Badge>
              </div>
              {roomTasks.map(task => {
                const isDone = completedTaskIds.has(task.id);
                return (
                  <Card
                    key={task.id}
                    className={`hover-elevate active-elevate-2 cursor-pointer transition-all ${isDone ? "opacity-50" : ""}`}
                    onClick={() => toggleCompletion.mutate({ taskId: task.id, isDone })}
                    data-testid={`card-maid-task-${task.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isDone ? "bg-green-500/20" : "bg-muted"
                      }`}>
                        {isDone ? (
                          <Check className="w-7 h-7 text-green-600 dark:text-green-400" strokeWidth={3} />
                        ) : (
                          <Brush className="w-7 h-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-bold ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {lang === "ar" ? task.titleAr : (task.titleEn || task.titleAr)}
                        </p>
                      </div>
                      {isDone ? (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-green-500/20 text-green-700 dark:text-green-300 text-sm">
                          {t("housekeepingSection.taskDone")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-sm">
                          {t("housekeepingSection.taskPending")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Brush className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <p className="text-base font-medium">{t("housekeepingSection.noTasks")}</p>
        </div>
      )}

    </div>
  );
}
