const ar = {
  app: { name: "بيتنا", subtitle: "بيت منظم" },
  roles: { admin: "مدير", household: "أهل البيت", maid: "عاملة منزلية", driver: "سائق" },
  nav: { dashboard: "الرئيسية", products: "المنتجات", categories: "التصنيفات", orders: "الطلبات", users: "المستخدمين", settings: "الإعدادات", shopping: "التسوق", addItems: "إضافة طلب", stores: "المتاجر", vehicles: "السيارات", trips: "المشاوير", technicians: "دليل الفنيين", logistics: "الخدمات", homeManagement: "إدارة المنزل", shoppingSection: "المشتريات والطلبات", logisticsSection: "السيارات والمشاوير", quickLinks: "روابط سريعة", viewAll: "عرض الكل", locations: "المواقع", groceries: "المشتريات", housekeeping: "المنزل", comingSoon: "قريباً", housekeepingDesc: "سيتم إضافة هذا القسم قريباً", profile: "الملف الشخصي" },
  actions: { add: "إضافة", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء", approve: "اعتماد", reject: "رفض", login: "تسجيل الدخول", logout: "تسجيل الخروج", search: "بحث", confirm: "تأكيد", back: "رجوع", submit: "إرسال", update: "تحديث" },
  status: { pending: "قيد الانتظار", approved: "معتمد", rejected: "مرفوض", in_progress: "قيد التنفيذ", completed: "مكتمل", started: "بدأ", waiting: "في الانتظار", cancelled: "ملغي" },
  fields: { name: "الاسم", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية", price: "السعر", estimatedPrice: "السعر التقديري", actualPrice: "السعر الفعلي", quantity: "الكمية", category: "التصنيف", store: "المتجر", stores: "المتاجر", notes: "ملاحظات", unit: "الوحدة", role: "الصلاحية", email: "البريد الإلكتروني", total: "المجموع", receipt: "الفاتورة", image: "الصورة", uploadImage: "رفع صورة", uploadReceipt: "رفع الفاتورة", websiteUrl: "رابط الموقع", preferredStore: "المتجر المفضل", orderDetails: "تفاصيل الطلب", orderItems: "عناصر الطلب", createdBy: "أنشأه", approvedByField: "اعتمده", noItems: "لا توجد عناصر", purchased: "تم الشراء", notPurchased: "لم يُشترى", items: "عناصر", viewDetails: "عرض التفاصيل" },
  messages: { noOrders: "لا توجد طلبات", noProducts: "لا توجد منتجات", noCategories: "لا توجد تصنيفات", noStores: "لا توجد متاجر", orderCreated: "تم إنشاء الطلب", orderApproved: "تم اعتماد الطلب", orderRejected: "تم رفض الطلب", productAdded: "تمت إضافة المنتج", productUpdated: "تم تحديث المنتج", categoryUpdated: "تم تحديث التصنيف", welcome: "مرحباً بك", loginRequired: "يجب تسجيل الدخول أولاً", confirmDelete: "هل أنت متأكد من الحذف؟", itemAdded: "تمت إضافة العنصر للطلب", receiptUploaded: "تم رفع الفاتورة" },
  stats: { totalOrders: "إجمالي الطلبات", pendingOrders: "طلبات معلقة", completedOrders: "طلبات مكتملة", completedSub: "هذا الأسبوع", totalSpent: "إجمالي الإنفاق", spentSub: "هذا الشهر", thisWeek: "هذا الأسبوع", thisMonth: "هذا الشهر" },
  auth: { username: "اسم المستخدم", password: "كلمة المرور", firstName: "الاسم", lastName: "الاسم بالإنجليزية", nameEn: "الاسم بالإنجليزية", register: "إنشاء حساب", login: "تسجيل الدخول", noAccount: "ليس لديك حساب؟ إنشاء حساب جديد", hasAccount: "لديك حساب؟ تسجيل الدخول", firstUserAdmin: "أول مستخدم يسجل سيحصل على صلاحيات المدير", loading: "جارٍ...", fillFields: "يرجى إدخال اسم المستخدم وكلمة المرور" },
  profile: { changePhoto: "تغيير الصورة", removePhoto: "إزالة الصورة", changePassword: "تغيير كلمة المرور", currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", confirmPassword: "تأكيد كلمة المرور", passwordChanged: "تم تغيير كلمة المرور بنجاح", passwordMismatch: "كلمات المرور غير متطابقة", passwordTooShort: "كلمة المرور قصيرة جداً (6 أحرف على الأقل)", wrongPassword: "كلمة المرور الحالية غير صحيحة", profileUpdated: "تم تحديث الملف الشخصي", notifications: "التنبيهات", enableNotifications: "تفعيل تنبيهات التطبيق", notificationsEnabled: "تم تفعيل التنبيهات", notificationsDisabled: "تم إيقاف التنبيهات", editProfile: "تعديل الملف الشخصي", editName: "تعديل الاسم", cropPhoto: "قص الصورة", uploadFailed: "فشل رفع الصورة", uploading: "جاري الرفع..." },
  driver: { startShopping: "بدء التسوق", completePurchase: "إتمام الشراء", shoppingList: "قائمة المشتريات", yourOrders: "طلباتك الحالية", groupedByStore: "مجمّع حسب المتجر", noStore: "بدون متجر", visitWebsite: "زيارة الموقع", myTrips: "مشاويري", startTrip: "بدء المشوار", waitTrip: "بدء الانتظار", completeTrip: "إنهاء المشوار", waitingTime: "مدة الانتظار", tripStarted: "بدأ المشوار", tripWaiting: "في الانتظار", tripCompleted: "اكتمل المشوار", arrivedAtLocation: "وصلت للموقع" },
  conflict: { driverBusy: "تنبيه: السائق مشغول حالياً", activeTrip: "مشوار نشط", activeShopping: "طلب تسوق قيد التنفيذ", tripTo: "مشوار إلى", orderNum: "طلب رقم", proceedAnyway: "متابعة رغم ذلك", driverAvailable: "السائق متاح", timeConflict: "تعارض موعد", tripLabel: "مشوار", toLocation: "إلى" },
  vehicles: { title: "السيارات", addVehicle: "إضافة سيارة", editVehicle: "تعديل سيارة", name: "اسم السيارة", odometer: "قراءة العداد", lastMaintenance: "آخر صيانة", km: "كم", noVehicles: "لا توجد سيارات", vehicleAdded: "تمت إضافة السيارة", vehicleUpdated: "تم تحديث السيارة", vehicleDeleted: "تم حذف السيارة", privateVehicle: "سيارة خاصة", selectOwner: "اختر المستخدم", private: "خاصة", owner: "المستخدم" },
  trips: { title: "المشاوير", addTrip: "إضافة مشوار", addPersonalTrip: "إضافة مشوار خاص", personal: "خاص", personName: "اسم الشخص", location: "الموقع", departureTime: "موعد التحرك", estimatedDuration: "المدة المتوقعة للعودة", vehicle: "السيارة", noTrips: "لا توجد مشاوير", tripAdded: "تمت إضافة المشوار", tripUpdated: "تم تحديث المشوار", tripCancelled: "تم إلغاء المشوار", saveFailed: "فشل حفظ المشوار", selectVehicle: "اختر السيارة", selectDriver: "اختر السائق", selectLocation: "اختر الموقع", coordination: "تنسيق", coordinateWith: "تنسيق مع فني", coordinationCreated: "تم إنشاء مشوار التنسيق", minutes: "دقيقة", seconds: "ثانية", departureRequired: "يجب تحديد موعد التحرك", approvePermission: "اعتماد المشاوير", noVehicle: "بدون سيارة", editTrip: "تعديل المشوار" },
  locations: { title: "المواقع", addLocation: "إضافة موقع", editLocation: "تعديل موقع", nameAr: "اسم الموقع بالعربية", nameEn: "اسم الموقع بالإنجليزية", address: "العنوان", noLocations: "لا توجد مواقع", locationAdded: "تمت إضافة الموقع", locationUpdated: "تم تحديث الموقع", locationDeleted: "تم حذف الموقع" },
  technicians: { title: "دليل الفنيين", addTechnician: "إضافة فني", editTechnician: "تعديل فني", name: "اسم الفني", specialty: "التخصص", phone: "رقم الهاتف", noTechnicians: "لا يوجد فنيون", technicianAdded: "تمت إضافة الفني", technicianUpdated: "تم تحديث الفني", call: "اتصال", coordinate: "تنسيق سائق", plumber: "سباك", farmer: "مزارع", acTech: "فني تكييف", electrician: "كهربائي", carpenter: "نجار", painter: "دهّان", other: "أخرى" },
  maid: { cart: "سلة المشتريات", emptyCart: "السلة فارغة", sendOrder: "إرسال الطلب", all: "الكل", addToOrder: "إضافة للطلب", updateOrder: "تحديث الطلب", selectOrder: "اختر الطلب" },
  household: { needsApproval: "طلبات بحاجة لاعتماد", pendingLabel: "معلق", activeLabel: "نشط", completedLabel: "مكتمل", activeOrders: "طلبات نشطة", completedOrders: "طلبات مكتملة", pendingOrders: "طلبات معلقة", editOrder: "تعديل الطلب", addItemToOrder: "إضافة منتج للطلب", itemRemoved: "تم حذف العنصر", itemUpdated: "تم تحديث العنصر", itemAddedToOrder: "تمت إضافة المنتج للطلب", confirmRemoveItem: "حذف هذا العنصر؟", orderUpdated: "تم تحديث الطلب" },
  schedule: { deliverySchedule: "موعد التوصيل", today: "اليوم", now: "الآن", tomorrow: "غداً", scheduleUpdated: "تم تحديث الموعد" },
  admin: { approvePermission: "صلاحية الاعتماد", noApproval: "بدون اعتماد", orderStatusUpdated: "تم تحديث حالة الطلب", userRoleUpdated: "تم تحديث صلاحيات المستخدم", categoryAdded: "تمت إضافة التصنيف", storeAdded: "تمت إضافة المتجر", storeUpdated: "تم تحديث المتجر", iconCode: "رمز الأيقونة (مثال: milk)", addProduct: "إضافة منتج", addCategory: "إضافة تصنيف", addStore: "إضافة متجر", editProduct: "تعديل منتج", editCategory: "تعديل تصنيف", editStore: "تعديل متجر", suspendUser: "تعليق", activateUser: "تفعيل", userSuspended: "تم تعليق المستخدم", userActivated: "تم تفعيل المستخدم", suspended: "معلّق", addUser: "إضافة مستخدم", userCreated: "تم إنشاء المستخدم", usernameExists: "اسم المستخدم مستخدم بالفعل", deleteUser: "حذف المستخدم", userDeleted: "تم حذف المستخدم", confirmDeleteUser: "هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.", cancel: "إلغاء", confirm: "تأكيد", editUser: "تعديل المستخدم", userUpdated: "تم تحديث بيانات المستخدم", currentUser: "أنت" },
  rooms: { title: "الغرف", addRoom: "إضافة غرفة", editRoom: "تعديل غرفة", nameAr: "اسم الغرفة بالعربية", nameEn: "اسم الغرفة بالإنجليزية", noRooms: "لا توجد غرف", roomAdded: "تمت إضافة الغرفة", roomUpdated: "تم تحديث الغرفة", roomDeleted: "تم حذف الغرفة", excluded: "مستثناة", includeRoom: "تفعيل الغرفة", excludeRoom: "استثناء الغرفة", assignRooms: "تعيين الغرف", assignedRooms: "الغرف المعيّنة", noAssignedRooms: "لم يتم تعيين غرف", roomsUpdated: "تم تحديث الغرف", allRooms: "كل الغرف", chooseIcon: "اختر الأيقونة", icon_door: "غرفة", icon_sofa: "صالة", icon_kitchen: "مطبخ", icon_garage: "جراج", icon_outdoor: "جلسة خارجية", icon_garden: "حديقة", icon_storage: "مخزن", icon_courtyard: "حوش", icon_home: "منزل", icon_bathroom: "حمام", icon_armchair: "كرسي", icon_stairs: "درج" },
  maidHome: {
    todayTasks: "مهام اليوم",
    completed: "مكتملة",
    laundryAlerts: "طلبات غسيل",
    todayMeals: "وجبات اليوم",
    noLaundryPending: "لا توجد طلبات غسيل حالياً",
  },
  householdHome: {
    myRooms: "الغرف الخاصة بي",
    tasksProgress: "إنجاز المهام",
    noRoomsAssigned: "لم يتم تعيين غرف لك بعد",
    noTasksToday: "لا توجد مهام لهذا اليوم",
    tasksDone: "مكتملة",
    callMaid: "نداء الخادمة",
    maidComing: "قادمة إليك",
    callSent: "تم إرسال النداء",
    calling: "جاري الإرسال...",
    callDriver: "نداء السائق",
    driverComing: "قادم إليك",
    driverCallSent: "تم إرسال النداء",
    driverCalling: "جاري الإرسال...",
    callName: "نداء",
  },
  maidCall: {
    title: "نداءات",
    callFrom: "نداء من",
    dismiss: "تم",
    noCalls: "لا توجد نداءات حالياً",
    dismissed: "تم الرد",
  },
  driverCall: {
    title: "نداءات",
    callFrom: "نداء من",
    dismiss: "تم",
    noCalls: "لا توجد نداءات حالياً",
    dismissed: "تم الرد",
  },
  housekeepingSection: {
    title: "إدارة المنزل",
    tasks: "المهام",
    laundry: "الغسيل",
    kitchen: "المطبخ",
    daily: "يومي",
    weekly: "أسبوعي",
    monthly: "شهري",
    addTask: "إضافة مهمة",
    editTask: "تعديل مهمة",
    taskTitle: "عنوان المهمة",
    frequency: "التكرار",
    room: "الغرفة",
    selectRoom: "اختر الغرفة",
    addRoom: "إضافة غرفة أخرى",
    noTasks: "لا توجد مهام",
    taskDone: "تم",
    taskPending: "لم تنجز",
    taskCompleted: "تم إنجاز المهمة",
    taskUncompleted: "تم إلغاء الإنجاز",
    laundryBasket: "سلة الغسيل",
    sendLaundryRequest: "يوجد غسيل",
    laundryRequestSent: "تم إرسال طلب الغسيل",
    laundryDone: "تم الغسيل",
    laundryCancelled: "تم إلغاء طلب الغسيل",
    laundryAlreadyExists: "يوجد طلب غسيل معلق لهذه الغرفة اليوم",
    noLaundryRequests: "لا توجد طلبات غسيل",
    laundrySchedule: "جدول الغسيل",
    laundryDays: "أيام الغسيل",
    notLaundryDay: "ليس يوم غسيل",
    isLaundryDay: "يوم غسيل",
    pendingLaundry: "غسيل بحاجة لتنفيذ",
    mealPlan: "جدول الوجبات",
    addMeal: "إضافة وجبة",
    addMealItem: "إضافة صنف",
    editMealItem: "تعديل صنف",
    mealCatalog: "الوجبات",
    selectMealItem: "اختر صنف",
    noMealItems: "لا يوجد أصناف",
    deleteMealItem: "حذف الصنف",
    editMeal: "تعديل وجبة",
    breakfast: "فطور",
    lunch: "غداء",
    snack: "سناك",
    dinner: "عشاء",
    mealTitle: "اسم الوجبة",
    peopleCount: "عدد الأشخاص",
    specialNotes: "ملاحظات خاصة",
    noMeals: "لا توجد وجبات",
    persons: "أشخاص",
    saturday: "السبت",
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    today: "اليوم",
    allRooms: "كل الغرف",
    selectFrequency: "اختر التكرار",
    selectDays: "اختر أيام التكرار",
    everyDay: "كل يوم",
    everyWeek: "كل أسبوع",
    everyMonth: "كل شهر",
    specificDate: "تاريخ محدد",
    week1: "الأسبوع الأول",
    week2: "الأسبوع الثاني",
    week3: "الأسبوع الثالث",
    week4: "الأسبوع الرابع",
    selectWeek: "اختر الأسبوع",
    selectDay: "اختر اليوم",
    sat: "سب",
    sun: "أحد",
    mon: "إثن",
    tue: "ثلا",
    wed: "أرب",
    thu: "خمي",
    fri: "جمع",
  },
  driverHome: {
    todaySchedule: "جدول اليوم",
    completed: "مكتملة",
    noSchedule: "لا يوجد جدول لهذا اليوم",
    personalTime: "وقت خاص",
    requestPersonalTime: "طلب وقت خاص",
    requestDate: "التاريخ",
    startTime: "وقت البداية",
    estimatedReturn: "المدة المتوقعة للعودة",
    requestSent: "تم إرسال الطلب",
    requestFailed: "فشل إرسال الطلب",
    pendingRequests: "طلبات وقت خاص",
    tripsToday: "مشاوير اليوم",
    ordersToday: "طلبات اليوم",
    timeRequests: "طلبات الوقت الخاص",
    min: "دقيقة",
  },
  shortages: {
    title: "النواقص",
    addShortage: "إضافة نقص",
    editShortage: "تعديل نقص",
    nameAr: "اسم المنتج بالعربية",
    nameEn: "اسم المنتج بالإنجليزية",
    quantity: "الكمية",
    notes: "ملاحظات",
    noShortages: "لا توجد نواقص",
    shortageAdded: "تمت إضافة النقص",
    shortageDeleted: "تم حذف النقص",
    statusUpdated: "تم تحديث حالة النقص",
    permission: "صلاحية النواقص",
    requestedBy: "طلب بواسطة",
    noPermission: "ليس لديك صلاحية لإضافة نواقص",
  },
  notifications: {
    title: "الإشعارات",
    empty: "لا توجد إشعارات",
    markAllRead: "قراءة الكل",
    newOrder: "طلب جديد",
    orderApproved: "تم اعتماد الطلب",
    orderRejected: "تم رفض الطلب",
    orderCompleted: "اكتمل الطلب",
    newTrip: "مشوار جديد",
    tripApproved: "تم اعتماد المشوار",
    laundryRequest: "طلب غسيل جديد",
    taskReminder: "تذكير بمهمة",
    enableNotifications: "تفعيل التنبيهات",
    notificationsEnabled: "تم تفعيل التنبيهات",
    notificationsBlocked: "التنبيهات محظورة في المتصفح",
  },
};

const en: typeof ar = {
  app: { name: "Baytna", subtitle: "Organized Home" },
  roles: { admin: "Admin", household: "Household", maid: "Maid", driver: "Driver" },
  nav: { dashboard: "Dashboard", products: "Products", categories: "Categories", orders: "Orders", users: "Users", settings: "Settings", shopping: "Shopping", addItems: "Add Items", stores: "Stores", vehicles: "Vehicles", trips: "Trips", technicians: "Technicians", logistics: "Services", homeManagement: "Home Management", shoppingSection: "Shopping & Orders", logisticsSection: "Vehicles & Trips", quickLinks: "Quick Links", viewAll: "View All", locations: "Locations", groceries: "Groceries", housekeeping: "Home", comingSoon: "Coming Soon", housekeepingDesc: "This section will be added soon", profile: "Profile" },
  actions: { add: "Add", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", approve: "Approve", reject: "Reject", login: "Login", logout: "Logout", search: "Search", confirm: "Confirm", back: "Back", submit: "Submit", update: "Update" },
  status: { pending: "Pending", approved: "Approved", rejected: "Rejected", in_progress: "In Progress", completed: "Completed", started: "Started", waiting: "Waiting", cancelled: "Cancelled" },
  fields: { name: "Name", nameAr: "Arabic Name", nameEn: "English Name", price: "Price", estimatedPrice: "Estimated Price", actualPrice: "Actual Price", quantity: "Quantity", category: "Category", store: "Store", stores: "Stores", notes: "Notes", unit: "Unit", role: "Role", email: "Email", total: "Total", receipt: "Receipt", image: "Image", uploadImage: "Upload Image", uploadReceipt: "Upload Receipt", websiteUrl: "Website URL", preferredStore: "Preferred Store", orderDetails: "Order Details", orderItems: "Order Items", createdBy: "Created by", approvedByField: "Approved by", noItems: "No items", purchased: "Purchased", notPurchased: "Not Purchased", items: "items", viewDetails: "View Details" },
  messages: { noOrders: "No orders", noProducts: "No products", noCategories: "No categories", noStores: "No stores", orderCreated: "Order created", orderApproved: "Order approved", orderRejected: "Order rejected", productAdded: "Product added", productUpdated: "Product updated", categoryUpdated: "Category updated", welcome: "Welcome", loginRequired: "Login required", confirmDelete: "Are you sure you want to delete?", itemAdded: "Item added to order", receiptUploaded: "Receipt uploaded" },
  stats: { totalOrders: "Total Orders", pendingOrders: "Pending Orders", completedOrders: "Completed", completedSub: "This Week", totalSpent: "Total Spent", spentSub: "This Month", thisWeek: "This Week", thisMonth: "This Month" },
  auth: { username: "Username", password: "Password", firstName: "Name (Arabic)", lastName: "Name (English)", nameEn: "Name (English)", register: "Create Account", login: "Login", noAccount: "Don't have an account? Create one", hasAccount: "Already have an account? Login", firstUserAdmin: "First user will get admin privileges", loading: "Loading...", fillFields: "Please enter username and password" },
  profile: { changePhoto: "Change Photo", removePhoto: "Remove Photo", changePassword: "Change Password", currentPassword: "Current Password", newPassword: "New Password", confirmPassword: "Confirm Password", passwordChanged: "Password changed successfully", passwordMismatch: "Passwords do not match", passwordTooShort: "Password too short (minimum 6 characters)", wrongPassword: "Current password is incorrect", profileUpdated: "Profile updated", notifications: "Notifications", enableNotifications: "Enable app notifications", notificationsEnabled: "Notifications enabled", notificationsDisabled: "Notifications disabled", editProfile: "Edit Profile", editName: "Edit Name", cropPhoto: "Crop Photo", uploadFailed: "Upload failed", uploading: "Uploading..." },
  driver: { startShopping: "Start Shopping", completePurchase: "Complete Purchase", shoppingList: "Shopping List", yourOrders: "Your Current Orders", groupedByStore: "Grouped by Store", noStore: "No Store", visitWebsite: "Visit Website", myTrips: "My Trips", startTrip: "Start Trip", waitTrip: "Start Waiting", completeTrip: "Complete Trip", waitingTime: "Waiting Time", tripStarted: "Trip Started", tripWaiting: "Waiting", tripCompleted: "Trip Completed", arrivedAtLocation: "Arrived at Location" },
  conflict: { driverBusy: "Warning: Driver is currently busy", activeTrip: "Active Trip", activeShopping: "Shopping order in progress", tripTo: "Trip to", orderNum: "Order #", proceedAnyway: "Proceed Anyway", driverAvailable: "Driver available", timeConflict: "Time conflict", tripLabel: "Trip", toLocation: "to" },
  vehicles: { title: "Vehicles", addVehicle: "Add Vehicle", editVehicle: "Edit Vehicle", name: "Vehicle Name", odometer: "Odometer Reading", lastMaintenance: "Last Maintenance", km: "km", noVehicles: "No vehicles", vehicleAdded: "Vehicle added", vehicleUpdated: "Vehicle updated", vehicleDeleted: "Vehicle deleted", privateVehicle: "Private Vehicle", selectOwner: "Select Owner", private: "Private", owner: "Owner" },
  trips: { title: "Trips", addTrip: "Add Trip", addPersonalTrip: "Add Personal Trip", personal: "Personal", personName: "Person Name", location: "Location", departureTime: "Departure Time", estimatedDuration: "Estimated Return Duration", vehicle: "Vehicle", noTrips: "No trips", tripAdded: "Trip added", tripUpdated: "Trip updated", tripCancelled: "Trip cancelled", saveFailed: "Failed to save trip", selectVehicle: "Select Vehicle", selectDriver: "Select Driver", selectLocation: "Select Location", coordination: "Coordination", coordinateWith: "Coordinate with Technician", coordinationCreated: "Coordination trip created", minutes: "min", seconds: "sec", departureRequired: "Departure time is required", approvePermission: "Approve Trips", noVehicle: "No vehicle", editTrip: "Edit Trip" },
  locations: { title: "Locations", addLocation: "Add Location", editLocation: "Edit Location", nameAr: "Location Name (Arabic)", nameEn: "Location Name (English)", address: "Address", noLocations: "No locations", locationAdded: "Location added", locationUpdated: "Location updated", locationDeleted: "Location deleted" },
  technicians: { title: "Technicians Directory", addTechnician: "Add Technician", editTechnician: "Edit Technician", name: "Technician Name", specialty: "Specialty", phone: "Phone Number", noTechnicians: "No technicians", technicianAdded: "Technician added", technicianUpdated: "Technician updated", call: "Call", coordinate: "Driver Coordination", plumber: "Plumber", farmer: "Farmer", acTech: "AC Technician", electrician: "Electrician", carpenter: "Carpenter", painter: "Painter", other: "Other" },
  maid: { cart: "Shopping Cart", emptyCart: "Cart is empty", sendOrder: "Send Order", all: "All", addToOrder: "Add to Order", updateOrder: "Update Order", selectOrder: "Select Order" },
  household: { needsApproval: "Orders needing approval", pendingLabel: "Pending", activeLabel: "Active", completedLabel: "Completed", activeOrders: "Active Orders", completedOrders: "Completed Orders", pendingOrders: "Pending Orders", editOrder: "Edit Order", addItemToOrder: "Add Item to Order", itemRemoved: "Item removed", itemUpdated: "Item updated", itemAddedToOrder: "Item added to order", confirmRemoveItem: "Remove this item?", orderUpdated: "Order updated" },
  schedule: { deliverySchedule: "Delivery Schedule", today: "Today", now: "Now", tomorrow: "Tomorrow", scheduleUpdated: "Schedule updated" },
  admin: { approvePermission: "Approval Permission", noApproval: "No Approval", orderStatusUpdated: "Order status updated", userRoleUpdated: "User role updated", categoryAdded: "Category added", storeAdded: "Store added", storeUpdated: "Store updated", iconCode: "Icon code (e.g. milk)", addProduct: "Add Product", addCategory: "Add Category", addStore: "Add Store", editProduct: "Edit Product", editCategory: "Edit Category", editStore: "Edit Store", suspendUser: "Suspend", activateUser: "Activate", userSuspended: "User suspended", userActivated: "User activated", suspended: "Suspended", addUser: "Add User", userCreated: "User created", usernameExists: "Username already exists", deleteUser: "Delete User", userDeleted: "User deleted", confirmDeleteUser: "Are you sure you want to delete this user? This action cannot be undone.", cancel: "Cancel", confirm: "Confirm", editUser: "Edit User", userUpdated: "User updated", currentUser: "You" },
  rooms: { title: "Rooms", addRoom: "Add Room", editRoom: "Edit Room", nameAr: "Room Name (Arabic)", nameEn: "Room Name (English)", noRooms: "No rooms", roomAdded: "Room added", roomUpdated: "Room updated", roomDeleted: "Room deleted", excluded: "Excluded", includeRoom: "Include Room", excludeRoom: "Exclude Room", assignRooms: "Assign Rooms", assignedRooms: "Assigned Rooms", noAssignedRooms: "No rooms assigned", roomsUpdated: "Rooms updated", allRooms: "All Rooms", chooseIcon: "Choose Icon", icon_door: "Room", icon_sofa: "Living Room", icon_kitchen: "Kitchen", icon_garage: "Garage", icon_outdoor: "Outdoor Seating", icon_garden: "Garden", icon_storage: "Storage", icon_courtyard: "Courtyard", icon_home: "Home", icon_bathroom: "Bathroom", icon_armchair: "Armchair", icon_stairs: "Stairs" },
  maidHome: {
    todayTasks: "Today's Tasks",
    completed: "completed",
    laundryAlerts: "Laundry Requests",
    todayMeals: "Today's Meals",
    noLaundryPending: "No pending laundry requests",
  },
  householdHome: {
    myRooms: "My Rooms",
    tasksProgress: "Tasks Progress",
    noRoomsAssigned: "No rooms assigned to you yet",
    noTasksToday: "No tasks for today",
    tasksDone: "completed",
    callMaid: "Call Maid",
    maidComing: "Coming to you",
    callSent: "Call sent",
    calling: "Sending...",
    callDriver: "Call Driver",
    driverComing: "Coming to you",
    driverCallSent: "Call sent",
    driverCalling: "Sending...",
    callName: "Call",
  },
  maidCall: {
    title: "Calls",
    callFrom: "Call from",
    dismiss: "Done",
    noCalls: "No active calls",
    dismissed: "Responded",
  },
  driverCall: {
    title: "Calls",
    callFrom: "Call from",
    dismiss: "Done",
    noCalls: "No active calls",
    dismissed: "Responded",
  },
  housekeepingSection: {
    title: "Housekeeping",
    tasks: "Tasks",
    laundry: "Laundry",
    kitchen: "Kitchen",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    addTask: "Add Task",
    editTask: "Edit Task",
    taskTitle: "Task Title",
    frequency: "Frequency",
    room: "Room",
    selectRoom: "Select Room",
    addRoom: "Add Another Room",
    noTasks: "No tasks",
    taskDone: "Done",
    taskPending: "Not done",
    taskCompleted: "Task completed",
    taskUncompleted: "Task uncompleted",
    laundryBasket: "Laundry Basket",
    sendLaundryRequest: "Laundry Available",
    laundryRequestSent: "Laundry request sent",
    laundryDone: "Laundry done",
    laundryCancelled: "Laundry request cancelled",
    laundryAlreadyExists: "A pending laundry request already exists for this room today",
    noLaundryRequests: "No laundry requests",
    laundrySchedule: "Laundry Schedule",
    laundryDays: "Laundry Days",
    notLaundryDay: "Not a laundry day",
    isLaundryDay: "Laundry day",
    pendingLaundry: "Pending laundry",
    mealPlan: "Meal Plan",
    addMeal: "Add Meal",
    addMealItem: "Add Item",
    editMealItem: "Edit Item",
    mealCatalog: "Meals",
    selectMealItem: "Select Item",
    noMealItems: "No items",
    deleteMealItem: "Delete Item",
    editMeal: "Edit Meal",
    breakfast: "Breakfast",
    lunch: "Lunch",
    snack: "Snack",
    dinner: "Dinner",
    mealTitle: "Meal Name",
    peopleCount: "People Count",
    specialNotes: "Special Notes",
    noMeals: "No meals",
    persons: "persons",
    saturday: "Saturday",
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    today: "Today",
    allRooms: "All Rooms",
    selectFrequency: "Select Frequency",
    selectDays: "Select days",
    everyDay: "Every day",
    everyWeek: "Every week",
    everyMonth: "Every month",
    specificDate: "Specific date",
    week1: "1st week",
    week2: "2nd week",
    week3: "3rd week",
    week4: "4th week",
    selectWeek: "Select week",
    selectDay: "Select day",
    sat: "Sat",
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
  },
  driverHome: {
    todaySchedule: "Today's Schedule",
    completed: "completed",
    noSchedule: "No schedule for this day",
    personalTime: "Personal Time",
    requestPersonalTime: "Request Personal Time",
    requestDate: "Date",
    startTime: "Start Time",
    estimatedReturn: "Estimated Return Duration",
    requestSent: "Request sent",
    requestFailed: "Failed to send request",
    pendingRequests: "Personal Time Requests",
    tripsToday: "Today's Trips",
    ordersToday: "Today's Orders",
    timeRequests: "Personal Time Requests",
    min: "min",
  },
  shortages: {
    title: "Shortages",
    addShortage: "Add Shortage",
    editShortage: "Edit Shortage",
    nameAr: "Product Name (Arabic)",
    nameEn: "Product Name (English)",
    quantity: "Quantity",
    notes: "Notes",
    noShortages: "No shortages",
    shortageAdded: "Shortage added",
    shortageDeleted: "Shortage deleted",
    statusUpdated: "Shortage status updated",
    permission: "Shortages Permission",
    requestedBy: "Requested by",
    noPermission: "You don't have permission to add shortages",
  },
  notifications: {
    title: "Notifications",
    empty: "No notifications",
    markAllRead: "Mark all read",
    newOrder: "New Order",
    orderApproved: "Order Approved",
    orderRejected: "Order Rejected",
    orderCompleted: "Order Completed",
    newTrip: "New Trip",
    tripApproved: "Trip Approved",
    laundryRequest: "New Laundry Request",
    taskReminder: "Task Reminder",
    enableNotifications: "Enable Notifications",
    notificationsEnabled: "Notifications enabled",
    notificationsBlocked: "Notifications are blocked in browser",
  },
};

export type Lang = "ar" | "en";
const translations = { ar, en };

function getStoredLang(): Lang {
  try {
    const stored = localStorage.getItem("baytna-lang");
    if (stored === "en" || stored === "ar") return stored;
  } catch {}
  return "ar";
}

let currentLang: Lang = getStoredLang();

function applyLangToDocument(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

applyLangToDocument(currentLang);

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem("baytna-lang", lang);
  applyLangToDocument(lang);
}

export function getLang(): Lang { return currentLang; }

export function t(path: string): string {
  const keys = path.split(".");
  let result: any = translations[currentLang];
  for (const key of keys) {
    result = result?.[key];
  }
  return result || path;
}

export function displayName(user: { firstName?: string | null; firstNameEn?: string | null; lastName?: string | null; username?: string | null }): string {
  const ar = user.firstName?.trim() || null;
  const en = user.firstNameEn?.trim() || null;
  if (currentLang === "ar") {
    return ar || en || user.username || "?";
  }
  return en || ar || user.username || "?";
}

export function formatPrice(amount: number): string {
  return currentLang === "ar" ? `${amount} ر.س` : `${amount} SAR`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(currentLang === "ar" ? "ar-EG" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(currentLang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  return `${formatDate(date)} ${formatTime(date)}`;
}
