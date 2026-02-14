const ar = {
  app: { name: "بيتكم", subtitle: "إدارة المنزل" },
  roles: { admin: "مدير", household: "أهل البيت", maid: "عاملة منزلية", driver: "سائق" },
  nav: { dashboard: "الرئيسية", products: "المنتجات", categories: "التصنيفات", orders: "الطلبات", users: "المستخدمين", settings: "الإعدادات", shopping: "التسوق", addItems: "إضافة نواقص", stores: "المتاجر", vehicles: "السيارات", trips: "المشاوير", technicians: "دليل الفنيين" },
  actions: { add: "إضافة", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء", approve: "اعتماد", reject: "رفض", login: "تسجيل الدخول", logout: "تسجيل الخروج", search: "بحث", confirm: "تأكيد", back: "رجوع", submit: "إرسال", update: "تحديث" },
  status: { pending: "قيد الانتظار", approved: "معتمد", rejected: "مرفوض", in_progress: "قيد التنفيذ", completed: "مكتمل", started: "بدأ", waiting: "في الانتظار" },
  fields: { name: "الاسم", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية", price: "السعر", estimatedPrice: "السعر التقديري", actualPrice: "السعر الفعلي", quantity: "الكمية", category: "التصنيف", store: "المتجر", stores: "المتاجر", notes: "ملاحظات", unit: "الوحدة", role: "الصلاحية", email: "البريد الإلكتروني", total: "المجموع", receipt: "الفاتورة", image: "الصورة", uploadImage: "رفع صورة", uploadReceipt: "رفع الفاتورة", websiteUrl: "رابط الموقع", preferredStore: "المتجر المفضل" },
  messages: { noOrders: "لا توجد طلبات", noProducts: "لا توجد منتجات", noCategories: "لا توجد تصنيفات", noStores: "لا توجد متاجر", orderCreated: "تم إنشاء الطلب", orderApproved: "تم اعتماد الطلب", orderRejected: "تم رفض الطلب", productAdded: "تمت إضافة المنتج", productUpdated: "تم تحديث المنتج", categoryUpdated: "تم تحديث التصنيف", welcome: "مرحباً بك", loginRequired: "يجب تسجيل الدخول أولاً", confirmDelete: "هل أنت متأكد من الحذف؟", itemAdded: "تمت إضافة العنصر للطلب", receiptUploaded: "تم رفع الفاتورة" },
  stats: { totalOrders: "إجمالي الطلبات", pendingOrders: "طلبات معلقة", completedOrders: "طلبات مكتملة", completedSub: "هذا الأسبوع", totalSpent: "إجمالي الإنفاق", spentSub: "هذا الشهر", thisWeek: "هذا الأسبوع", thisMonth: "هذا الشهر" },
  auth: { username: "اسم المستخدم", password: "كلمة المرور", firstName: "الاسم الأول", lastName: "الاسم الأخير", register: "إنشاء حساب", login: "تسجيل الدخول", noAccount: "ليس لديك حساب؟ إنشاء حساب جديد", hasAccount: "لديك حساب؟ تسجيل الدخول", firstUserAdmin: "أول مستخدم يسجل سيحصل على صلاحيات المدير", loading: "جارٍ...", fillFields: "يرجى إدخال اسم المستخدم وكلمة المرور" },
  driver: { startShopping: "بدء التسوق", completePurchase: "إتمام الشراء", shoppingList: "قائمة المشتريات", yourOrders: "طلباتك الحالية", groupedByStore: "مجمّع حسب المتجر", noStore: "بدون متجر", visitWebsite: "زيارة الموقع", myTrips: "مشاويري", startTrip: "بدء المشوار", waitTrip: "بدء الانتظار", completeTrip: "إنهاء المشوار", waitingTime: "مدة الانتظار", tripStarted: "بدأ المشوار", tripWaiting: "في الانتظار", tripCompleted: "اكتمل المشوار" },
  vehicles: { title: "السيارات", addVehicle: "إضافة سيارة", editVehicle: "تعديل سيارة", name: "اسم السيارة", odometer: "قراءة العداد", lastMaintenance: "آخر صيانة", km: "كم", noVehicles: "لا توجد سيارات", vehicleAdded: "تمت إضافة السيارة", vehicleUpdated: "تم تحديث السيارة", vehicleDeleted: "تم حذف السيارة" },
  trips: { title: "المشاوير", addTrip: "إضافة مشوار", personName: "اسم الشخص", location: "الموقع", departureTime: "موعد التحرك", vehicle: "السيارة", noTrips: "لا توجد مشاوير", tripAdded: "تمت إضافة المشوار", tripUpdated: "تم تحديث المشوار", selectVehicle: "اختر السيارة", coordination: "تنسيق", coordinateWith: "تنسيق مع فني", coordinationCreated: "تم إنشاء مشوار التنسيق", minutes: "دقيقة", seconds: "ثانية" },
  technicians: { title: "دليل الفنيين", addTechnician: "إضافة فني", editTechnician: "تعديل فني", name: "اسم الفني", specialty: "التخصص", phone: "رقم الهاتف", noTechnicians: "لا يوجد فنيون", technicianAdded: "تمت إضافة الفني", technicianUpdated: "تم تحديث الفني", call: "اتصال", coordinate: "تنسيق سائق", plumber: "سباك", farmer: "مزارع", acTech: "فني تكييف", electrician: "كهربائي", carpenter: "نجار", painter: "دهّان", other: "أخرى" },
  maid: { cart: "سلة المشتريات", emptyCart: "السلة فارغة", sendOrder: "إرسال الطلب", all: "الكل", addToOrder: "إضافة للطلب", updateOrder: "تحديث الطلب", selectOrder: "اختر الطلب" },
  household: { needsApproval: "طلبات بحاجة لاعتماد", pendingLabel: "معلق", activeLabel: "نشط", completedLabel: "مكتمل", activeOrders: "طلبات نشطة", completedOrders: "طلبات مكتملة", pendingOrders: "طلبات معلقة" },
  admin: { approvePermission: "صلاحية الاعتماد", noApproval: "بدون اعتماد", orderStatusUpdated: "تم تحديث حالة الطلب", userRoleUpdated: "تم تحديث صلاحيات المستخدم", categoryAdded: "تمت إضافة التصنيف", storeAdded: "تمت إضافة المتجر", storeUpdated: "تم تحديث المتجر", iconCode: "رمز الأيقونة (مثال: milk)", addProduct: "إضافة منتج", addCategory: "إضافة تصنيف", addStore: "إضافة متجر", editProduct: "تعديل منتج", editCategory: "تعديل تصنيف", editStore: "تعديل متجر", suspendUser: "تعليق", activateUser: "تفعيل", userSuspended: "تم تعليق المستخدم", userActivated: "تم تفعيل المستخدم", suspended: "معلّق" },
};

const en: typeof ar = {
  app: { name: "Baytkom", subtitle: "Home Management" },
  roles: { admin: "Admin", household: "Household", maid: "Maid", driver: "Driver" },
  nav: { dashboard: "Dashboard", products: "Products", categories: "Categories", orders: "Orders", users: "Users", settings: "Settings", shopping: "Shopping", addItems: "Add Items", stores: "Stores", vehicles: "Vehicles", trips: "Trips", technicians: "Technicians" },
  actions: { add: "Add", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", approve: "Approve", reject: "Reject", login: "Login", logout: "Logout", search: "Search", confirm: "Confirm", back: "Back", submit: "Submit", update: "Update" },
  status: { pending: "Pending", approved: "Approved", rejected: "Rejected", in_progress: "In Progress", completed: "Completed", started: "Started", waiting: "Waiting" },
  fields: { name: "Name", nameAr: "Arabic Name", nameEn: "English Name", price: "Price", estimatedPrice: "Estimated Price", actualPrice: "Actual Price", quantity: "Quantity", category: "Category", store: "Store", stores: "Stores", notes: "Notes", unit: "Unit", role: "Role", email: "Email", total: "Total", receipt: "Receipt", image: "Image", uploadImage: "Upload Image", uploadReceipt: "Upload Receipt", websiteUrl: "Website URL", preferredStore: "Preferred Store" },
  messages: { noOrders: "No orders", noProducts: "No products", noCategories: "No categories", noStores: "No stores", orderCreated: "Order created", orderApproved: "Order approved", orderRejected: "Order rejected", productAdded: "Product added", productUpdated: "Product updated", categoryUpdated: "Category updated", welcome: "Welcome", loginRequired: "Login required", confirmDelete: "Are you sure you want to delete?", itemAdded: "Item added to order", receiptUploaded: "Receipt uploaded" },
  stats: { totalOrders: "Total Orders", pendingOrders: "Pending Orders", completedOrders: "Completed", completedSub: "This Week", totalSpent: "Total Spent", spentSub: "This Month", thisWeek: "This Week", thisMonth: "This Month" },
  auth: { username: "Username", password: "Password", firstName: "First Name", lastName: "Last Name", register: "Create Account", login: "Login", noAccount: "Don't have an account? Create one", hasAccount: "Already have an account? Login", firstUserAdmin: "First user will get admin privileges", loading: "Loading...", fillFields: "Please enter username and password" },
  driver: { startShopping: "Start Shopping", completePurchase: "Complete Purchase", shoppingList: "Shopping List", yourOrders: "Your Current Orders", groupedByStore: "Grouped by Store", noStore: "No Store", visitWebsite: "Visit Website", myTrips: "My Trips", startTrip: "Start Trip", waitTrip: "Start Waiting", completeTrip: "Complete Trip", waitingTime: "Waiting Time", tripStarted: "Trip Started", tripWaiting: "Waiting", tripCompleted: "Trip Completed" },
  vehicles: { title: "Vehicles", addVehicle: "Add Vehicle", editVehicle: "Edit Vehicle", name: "Vehicle Name", odometer: "Odometer Reading", lastMaintenance: "Last Maintenance", km: "km", noVehicles: "No vehicles", vehicleAdded: "Vehicle added", vehicleUpdated: "Vehicle updated", vehicleDeleted: "Vehicle deleted" },
  trips: { title: "Trips", addTrip: "Add Trip", personName: "Person Name", location: "Location", departureTime: "Departure Time", vehicle: "Vehicle", noTrips: "No trips", tripAdded: "Trip added", tripUpdated: "Trip updated", selectVehicle: "Select Vehicle", coordination: "Coordination", coordinateWith: "Coordinate with Technician", coordinationCreated: "Coordination trip created", minutes: "min", seconds: "sec" },
  technicians: { title: "Technicians Directory", addTechnician: "Add Technician", editTechnician: "Edit Technician", name: "Technician Name", specialty: "Specialty", phone: "Phone Number", noTechnicians: "No technicians", technicianAdded: "Technician added", technicianUpdated: "Technician updated", call: "Call", coordinate: "Driver Coordination", plumber: "Plumber", farmer: "Farmer", acTech: "AC Technician", electrician: "Electrician", carpenter: "Carpenter", painter: "Painter", other: "Other" },
  maid: { cart: "Shopping Cart", emptyCart: "Cart is empty", sendOrder: "Send Order", all: "All", addToOrder: "Add to Order", updateOrder: "Update Order", selectOrder: "Select Order" },
  household: { needsApproval: "Orders needing approval", pendingLabel: "Pending", activeLabel: "Active", completedLabel: "Completed", activeOrders: "Active Orders", completedOrders: "Completed Orders", pendingOrders: "Pending Orders" },
  admin: { approvePermission: "Approval Permission", noApproval: "No Approval", orderStatusUpdated: "Order status updated", userRoleUpdated: "User role updated", categoryAdded: "Category added", storeAdded: "Store added", storeUpdated: "Store updated", iconCode: "Icon code (e.g. milk)", addProduct: "Add Product", addCategory: "Add Category", addStore: "Add Store", editProduct: "Edit Product", editCategory: "Edit Category", editStore: "Edit Store", suspendUser: "Suspend", activateUser: "Activate", userSuspended: "User suspended", userActivated: "User activated", suspended: "Suspended" },
};

export type Lang = "ar" | "en";
const translations = { ar, en };

function getStoredLang(): Lang {
  try {
    const stored = localStorage.getItem("baytkom-lang");
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
  localStorage.setItem("baytkom-lang", lang);
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

export function formatPrice(amount: number): string {
  return currentLang === "ar" ? `${amount} ر.س` : `${amount} SAR`;
}
