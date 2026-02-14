const ar = {
  app: { name: "بيتكم", subtitle: "إدارة المنزل" },
  roles: { admin: "مدير", household: "أهل البيت", maid: "عاملة منزلية", driver: "سائق" },
  nav: { dashboard: "الرئيسية", products: "المنتجات", categories: "الفئات", orders: "الطلبات", users: "المستخدمين", settings: "الإعدادات", shopping: "التسوق", addItems: "إضافة نواقص" },
  actions: { add: "إضافة", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء", approve: "اعتماد", reject: "رفض", login: "تسجيل الدخول", logout: "تسجيل الخروج", search: "بحث", confirm: "تأكيد", back: "رجوع", submit: "إرسال" },
  status: { pending: "قيد الانتظار", approved: "معتمد", rejected: "مرفوض", in_progress: "قيد التنفيذ", completed: "مكتمل" },
  fields: { name: "الاسم", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية", price: "السعر", estimatedPrice: "السعر التقديري", actualPrice: "السعر الفعلي", quantity: "الكمية", category: "الفئة", store: "المتجر المفضل", notes: "ملاحظات", unit: "الوحدة", role: "الصلاحية", email: "البريد الإلكتروني", total: "المجموع", receipt: "الفاتورة" },
  messages: { noOrders: "لا توجد طلبات", noProducts: "لا توجد منتجات", noCategories: "لا توجد فئات", orderCreated: "تم إنشاء الطلب", orderApproved: "تم اعتماد الطلب", orderRejected: "تم رفض الطلب", productAdded: "تمت إضافة المنتج", welcome: "مرحباً بك", loginRequired: "يجب تسجيل الدخول أولاً", confirmDelete: "هل أنت متأكد من الحذف؟" },
  stats: { totalOrders: "إجمالي الطلبات", pendingOrders: "طلبات معلقة", completedOrders: "طلبات مكتملة", totalSpent: "إجمالي الإنفاق" },
};

const en: typeof ar = {
  app: { name: "Baytkom", subtitle: "Home Management" },
  roles: { admin: "Admin", household: "Household", maid: "Maid", driver: "Driver" },
  nav: { dashboard: "Dashboard", products: "Products", categories: "Categories", orders: "Orders", users: "Users", settings: "Settings", shopping: "Shopping", addItems: "Add Items" },
  actions: { add: "Add", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", approve: "Approve", reject: "Reject", login: "Login", logout: "Logout", search: "Search", confirm: "Confirm", back: "Back", submit: "Submit" },
  status: { pending: "Pending", approved: "Approved", rejected: "Rejected", in_progress: "In Progress", completed: "Completed" },
  fields: { name: "Name", nameAr: "Arabic Name", nameEn: "English Name", price: "Price", estimatedPrice: "Estimated Price", actualPrice: "Actual Price", quantity: "Quantity", category: "Category", store: "Preferred Store", notes: "Notes", unit: "Unit", role: "Role", email: "Email", total: "Total", receipt: "Receipt" },
  messages: { noOrders: "No orders", noProducts: "No products", noCategories: "No categories", orderCreated: "Order created", orderApproved: "Order approved", orderRejected: "Order rejected", productAdded: "Product added", welcome: "Welcome", loginRequired: "Login required", confirmDelete: "Are you sure you want to delete?" },
  stats: { totalOrders: "Total Orders", pendingOrders: "Pending Orders", completedOrders: "Completed Orders", totalSpent: "Total Spent" },
};

export type Lang = "ar" | "en";
const translations = { ar, en };

let currentLang: Lang = "ar";

export function setLang(lang: Lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
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
