const ar = {
  app: { name: "بيتكم", subtitle: "إدارة المنزل" },
  roles: { admin: "مدير", household: "أهل البيت", maid: "عاملة منزلية", driver: "سائق" },
  nav: { dashboard: "الرئيسية", products: "المنتجات", categories: "التصنيفات", orders: "الطلبات", users: "المستخدمين", settings: "الإعدادات", shopping: "التسوق", addItems: "إضافة نواقص" },
  actions: { add: "إضافة", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء", approve: "اعتماد", reject: "رفض", login: "تسجيل الدخول", logout: "تسجيل الخروج", search: "بحث", confirm: "تأكيد", back: "رجوع", submit: "إرسال" },
  status: { pending: "قيد الانتظار", approved: "معتمد", rejected: "مرفوض", in_progress: "قيد التنفيذ", completed: "مكتمل" },
  fields: { name: "الاسم", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية", price: "السعر", estimatedPrice: "السعر التقديري", actualPrice: "السعر الفعلي", quantity: "الكمية", category: "التصنيف", store: "المتجر المفضل", notes: "ملاحظات", unit: "الوحدة", role: "الصلاحية", email: "البريد الإلكتروني", total: "المجموع", receipt: "الفاتورة", image: "الصورة", uploadImage: "رفع صورة" },
  messages: { noOrders: "لا توجد طلبات", noProducts: "لا توجد منتجات", noCategories: "لا توجد تصنيفات", orderCreated: "تم إنشاء الطلب", orderApproved: "تم اعتماد الطلب", orderRejected: "تم رفض الطلب", productAdded: "تمت إضافة المنتج", productUpdated: "تم تحديث المنتج", categoryUpdated: "تم تحديث التصنيف", welcome: "مرحباً بك", loginRequired: "يجب تسجيل الدخول أولاً", confirmDelete: "هل أنت متأكد من الحذف؟" },
  stats: { totalOrders: "إجمالي الطلبات", pendingOrders: "طلبات معلقة", completedOrders: "طلبات مكتملة", totalSpent: "إجمالي الإنفاق" },
  auth: { username: "اسم المستخدم", password: "كلمة المرور", firstName: "الاسم الأول", lastName: "الاسم الأخير", register: "إنشاء حساب", login: "تسجيل الدخول", noAccount: "ليس لديك حساب؟ إنشاء حساب جديد", hasAccount: "لديك حساب؟ تسجيل الدخول", firstUserAdmin: "أول مستخدم يسجل سيحصل على صلاحيات المدير", loading: "جارٍ...", fillFields: "يرجى إدخال اسم المستخدم وكلمة المرور" },
  driver: { startShopping: "بدء التسوق", completePurchase: "إتمام الشراء", shoppingList: "قائمة المشتريات", yourOrders: "طلباتك الحالية" },
  maid: { cart: "سلة المشتريات", emptyCart: "السلة فارغة", sendOrder: "إرسال الطلب", all: "الكل" },
  household: { needsApproval: "طلبات بحاجة لاعتماد", pendingLabel: "معلق", activeLabel: "نشط", completedLabel: "مكتمل", activeOrders: "طلبات نشطة", completedOrders: "طلبات مكتملة", pendingOrders: "طلبات معلقة" },
  admin: { approvePermission: "صلاحية الاعتماد", noApproval: "بدون اعتماد", orderStatusUpdated: "تم تحديث حالة الطلب", userRoleUpdated: "تم تحديث صلاحيات المستخدم", categoryAdded: "تمت إضافة التصنيف", iconCode: "رمز الأيقونة (مثال: milk)", addProduct: "إضافة منتج", addCategory: "إضافة تصنيف", editProduct: "تعديل منتج", editCategory: "تعديل تصنيف" },
};

const en: typeof ar = {
  app: { name: "Baytkom", subtitle: "Home Management" },
  roles: { admin: "Admin", household: "Household", maid: "Maid", driver: "Driver" },
  nav: { dashboard: "Dashboard", products: "Products", categories: "Categories", orders: "Orders", users: "Users", settings: "Settings", shopping: "Shopping", addItems: "Add Items" },
  actions: { add: "Add", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", approve: "Approve", reject: "Reject", login: "Login", logout: "Logout", search: "Search", confirm: "Confirm", back: "Back", submit: "Submit" },
  status: { pending: "Pending", approved: "Approved", rejected: "Rejected", in_progress: "In Progress", completed: "Completed" },
  fields: { name: "Name", nameAr: "Arabic Name", nameEn: "English Name", price: "Price", estimatedPrice: "Estimated Price", actualPrice: "Actual Price", quantity: "Quantity", category: "Category", store: "Preferred Store", notes: "Notes", unit: "Unit", role: "Role", email: "Email", total: "Total", receipt: "Receipt", image: "Image", uploadImage: "Upload Image" },
  messages: { noOrders: "No orders", noProducts: "No products", noCategories: "No categories", orderCreated: "Order created", orderApproved: "Order approved", orderRejected: "Order rejected", productAdded: "Product added", productUpdated: "Product updated", categoryUpdated: "Category updated", welcome: "Welcome", loginRequired: "Login required", confirmDelete: "Are you sure you want to delete?" },
  stats: { totalOrders: "Total Orders", pendingOrders: "Pending Orders", completedOrders: "Completed Orders", totalSpent: "Total Spent" },
  auth: { username: "Username", password: "Password", firstName: "First Name", lastName: "Last Name", register: "Create Account", login: "Login", noAccount: "Don't have an account? Create one", hasAccount: "Already have an account? Login", firstUserAdmin: "First user will get admin privileges", loading: "Loading...", fillFields: "Please enter username and password" },
  driver: { startShopping: "Start Shopping", completePurchase: "Complete Purchase", shoppingList: "Shopping List", yourOrders: "Your Current Orders" },
  maid: { cart: "Shopping Cart", emptyCart: "Cart is empty", sendOrder: "Send Order", all: "All" },
  household: { needsApproval: "Orders needing approval", pendingLabel: "Pending", activeLabel: "Active", completedLabel: "Completed", activeOrders: "Active Orders", completedOrders: "Completed Orders", pendingOrders: "Pending Orders" },
  admin: { approvePermission: "Approval Permission", noApproval: "No Approval", orderStatusUpdated: "Order status updated", userRoleUpdated: "User role updated", categoryAdded: "Category added", iconCode: "Icon code (e.g. milk)", addProduct: "Add Product", addCategory: "Add Category", editProduct: "Edit Product", editCategory: "Edit Category" },
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
