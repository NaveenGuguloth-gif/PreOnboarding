import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
const STORAGE_KEY = "preonboarding_demo_state";
const SESSION_KEY = "preonboarding_demo_session";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const today = new Date();
const addDays = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const demoState = {
  users: [
    {
      id: "emp-001",
      name: "Aarav Kulkarni",
      full_name: "Aarav Kulkarni",
      email: "aarav.kulkarni@tatamotors.com",
      employeeId: "TM-2026-1042",
      employee_id: "TM-2026-1042",
      role: "Graduate Engineer Trainee",
      department: "Vehicle Software",
      location: "Pune Plant",
      joiningDate: addDays(18),
      joining_date: addDays(18),
      userType: "employee",
      user_type: "employee",
      password: "password",
    },
    {
      id: "hr-001",
      name: "Meera Shah",
      full_name: "Meera Shah",
      email: "meera.shah@tatamotors.com",
      employeeId: "HR-2026-018",
      employee_id: "HR-2026-018",
      role: "HR Business Partner",
      department: "People Operations",
      location: "Mumbai HQ",
      joiningDate: "2022-04-12",
      joining_date: "2022-04-12",
      userType: "hr",
      user_type: "hr",
      password: "password",
    },
  ],
  documents: [
    {
      id: "pan",
      name: "PAN Card",
      status: "verified",
      deadline: addDays(7),
      file_name: "pan-card.pdf",
      uploaded_at: addDays(-3),
    },
    {
      id: "aadhaar",
      name: "Aadhaar Card",
      status: "submitted",
      deadline: addDays(7),
      file_name: "aadhaar-front-back.pdf",
      uploaded_at: addDays(-1),
    },
    { id: "bank", name: "Bank Details", status: "missing", deadline: addDays(12) },
    { id: "graduation", name: "Graduation Certificate", status: "missing", deadline: addDays(10) },
    { id: "medical", name: "Medical Fitness Form", status: "missing", deadline: addDays(10) },
    { id: "photo", name: "Passport Photo", status: "missing", deadline: addDays(7) },
  ],
  modules: [
    {
      id: "welcome",
      title: "Welcome to Tata Motors",
      category: "Company Orientation",
      description: "A quick introduction to Tata Motors, our business groups, and how teams work together.",
      progress: 100,
      required: 1,
      duration_minutes: 25,
      file_url: "https://www.tatamotors.com/",
      content_type: "video",
      uploaded_by: "HR Learning Team",
    },
    {
      id: "ethics",
      title: "Code of Conduct and Ethics",
      category: "Compliance",
      description: "Understand the values, compliance expectations, and workplace conduct standards.",
      progress: 65,
      required: 1,
      duration_minutes: 35,
      file_url: "https://www.tata.com/about-us/tata-code-of-conduct",
      content_type: "policy",
      uploaded_by: "HR Policy Team",
    },
    {
      id: "safety",
      title: "Plant Safety Essentials",
      category: "Workplace Safety",
      description: "Safety protocols, emergency guidance, and entry requirements for plant locations.",
      progress: 40,
      required: 1,
      duration_minutes: 30,
      file_url: "https://www.tatamotors.com/corporate-responsibility/",
      content_type: "pdf",
      uploaded_by: "Safety Team",
    },
    {
      id: "tools",
      title: "Digital Tools Setup",
      category: "IT Enablement",
      description: "Set up collaboration tools, access requests, and day-one account readiness.",
      progress: 0,
      required: 0,
      duration_minutes: 20,
      file_url: "",
      content_type: "document",
      uploaded_by: "IT Enablement",
    },
    {
      id: "benefits-policy",
      title: "Employee Benefits Policy",
      category: "Company Policies",
      description: "HR-uploaded policy document covering benefits, leave, and employee support programs.",
      progress: 0,
      required: 0,
      duration_minutes: 15,
      file_url: "https://www.tatamotors.com/corporate-responsibility/",
      content_type: "policy",
      uploaded_by: "HR Policy Team",
    },
  ],
  departments: [
    { id: "dept-vehicle-software", name: "Vehicle Software", manager_name: "Rohan Iyer", department_hr: "Meera Shah" },
    { id: "dept-manufacturing", name: "Manufacturing", manager_name: "Sneha Patil", department_hr: "Arjun Rao" },
    { id: "dept-quality", name: "Quality", manager_name: "Dev Malhotra", department_hr: "Meera Shah" },
    { id: "dept-production", name: "Production", manager_name: "Priya Nair", department_hr: "Kavya Menon" },
  ],
  tasks: [
    {
      id: "task-orientation",
      title: "Publish joining-day orientation",
      description: "Share plant reporting guidance and welcome module with new joiners.",
      department: "All",
      version: "1.0",
      uploaded_by: "HR Learning Team",
      expiry_date: addDays(45),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "document",
      duration_minutes: 25,
    },
    {
      id: "task-safety",
      title: "Review plant safety learning",
      description: "Confirm safety module is assigned to plant-facing candidates.",
      department: "Manufacturing",
      version: "1.2",
      uploaded_by: "Safety Team",
      expiry_date: addDays(30),
      mandatory: true,
      visibility: "employees",
      status: "draft",
      content_type: "video",
      duration_minutes: 30,
    },
    {
      id: "task-device",
      title: "IT device readiness",
      description: "Coordinate laptop, VPN, and tool access before joining date.",
      department: "Vehicle Software",
      version: "1.0",
      uploaded_by: "IT Enablement",
      expiry_date: addDays(18),
      mandatory: false,
      visibility: "hr",
      status: "published",
      content_type: "checklist",
      duration_minutes: 15,
    },
  ],
  documentRequirements: [
    {
      id: "docreq-pan",
      name: "PAN Card",
      mandatory: true,
      department: "All",
      role: "",
      due_days_before_joining: 7,
      reminder_days: 3,
      max_file_size_mb: 10,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png"],
      approval_required: true,
    },
    {
      id: "docreq-bank",
      name: "Bank Details",
      mandatory: true,
      department: "All",
      role: "",
      due_days_before_joining: 10,
      reminder_days: 3,
      max_file_size_mb: 10,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png"],
      approval_required: true,
    },
    {
      id: "docreq-medical",
      name: "Medical Fitness Form",
      mandatory: true,
      department: "Manufacturing",
      role: "",
      due_days_before_joining: 12,
      reminder_days: 5,
      max_file_size_mb: 15,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png"],
      approval_required: true,
    },
  ],
  relocation: {
    location: "Pune",
    reportingLocation: "Tata Motors Passenger Vehicle Plant, Pimpri-Chinchwad, Pune",
    arrivalGuidance: "Report at Gate 3 by 8:30 AM with a government ID, joining letter, and document originals.",
    requiredBeforeTravel: [
      "Confirm temporary accommodation with HR travel desk.",
      "Carry original ID, education certificates, and two passport photos.",
      "Save the plant reporting address and emergency contact offline.",
    ],
    resources: [
      {
        id: "stay-guest-house",
        category: "Accommodation",
        title: "Company guest house helpdesk",
        name: "Company guest house helpdesk",
        description: "Temporary stay support for new joiners while permanent accommodation is finalized.",
        address: "Pimpri-Chinchwad, near Plant Gate 3",
        contact: "travel.desk@tatamotors.com",
        distance_km: 2.4,
      },
      {
        id: "stay-apartments",
        category: "Accommodation",
        title: "Approved short-stay apartments",
        name: "Approved short-stay apartments",
        description: "HR-reviewed apartment options suitable for the first month after relocation.",
        address: "Akurdi and Nigdi residential cluster",
        contact: "+91 20 4100 2211",
        distance_km: 4.8,
      },
      {
        id: "transport-shuttle",
        category: "Transport",
        title: "Plant shuttle from Pimpri station",
        name: "Plant shuttle from Pimpri station",
        description: "Morning shuttle route aligned with plant reporting windows for new joiners.",
        address: "Pimpri railway station east exit",
        contact: "transport.support@tatamotors.com",
        distance_km: 1.2,
      },
      {
        id: "transport-airport",
        category: "Transport",
        title: "Airport prepaid cab counter",
        name: "Airport prepaid cab counter",
        description: "Reliable airport-to-plant transfer option with prepaid fare confirmation.",
        address: "Pune International Airport arrivals",
        contact: "+91 20 6680 0000",
        distance_km: 18.5,
      },
      {
        id: "health-clinic",
        category: "Health",
        title: "Nearest medical clinic",
        name: "Nearest medical clinic",
        description: "Primary care clinic for first-aid, basic consultation, and emergency referrals.",
        address: "Old Mumbai-Pune Highway, Pimpri",
        contact: "+91 20 4012 1190",
        distance_km: 1.9,
      },
      {
        id: "bank-branch",
        category: "Banking",
        title: "Bank branch and ATM",
        name: "Bank branch and ATM",
        description: "Nearby branch for salary account documentation and cash withdrawal.",
        address: "Pimpri main road",
        contact: "+91 20 4099 3310",
        distance_km: 0.8,
      },
    ],
  },
  candidates: [
    {
      id: "emp-001",
      name: "Aarav Kulkarni",
      email: "aarav.kulkarni@tatamotors.com",
      employee_id: "TM-2026-1042",
      department: "Vehicle Software",
      location: "Pune Plant",
      role: "Graduate Engineer Trainee",
      joining_date: addDays(18),
      phone: "+91 98765 43210",
      user_type: "employee",
      profile_completion: 92,
      document_completion: 50,
      learning_completion: 51,
      readiness_score: 64,
    },
    {
      id: "emp-002",
      name: "Nisha Menon",
      email: "nisha.menon@tatamotors.com",
      employee_id: "TM-2026-1065",
      department: "Manufacturing",
      location: "Sanand Plant",
      role: "Production Engineer",
      joining_date: addDays(24),
      phone: "+91 91234 56780",
      user_type: "employee",
      profile_completion: 85,
      document_completion: 75,
      learning_completion: 62,
      readiness_score: 73,
    },
    {
      id: "emp-003",
      name: "Kabir Singh",
      email: "kabir.singh@tatamotors.com",
      employee_id: "TM-2026-1091",
      department: "Quality",
      location: "Lucknow Plant",
      role: "Quality Analyst",
      joining_date: addDays(11),
      phone: "+91 99887 77665",
      user_type: "employee",
      profile_completion: 100,
      document_completion: 100,
      learning_completion: 88,
      readiness_score: 92,
    },
  ],
};

const response = (data) => Promise.resolve({ data });
const clone = (value) => JSON.parse(JSON.stringify(value));

function getState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
    return clone(demoState);
  }
  const merged = { ...clone(demoState), ...JSON.parse(saved) };
  const savedDocuments = merged.documents ?? [];
  const savedDocumentIds = new Set(savedDocuments.map((document) => document.id));

  merged.documents = [
    ...savedDocuments,
    ...demoState.documents.filter((document) => !savedDocumentIds.has(document.id)),
  ];

  for (const key of ["departments", "tasks", "documentRequirements"]) {
    const savedItems = merged[key] ?? [];
    const savedIds = new Set(savedItems.map((item) => item.id));
    merged[key] = [...savedItems, ...demoState[key].filter((item) => !savedIds.has(item.id))];
  }

  return merged;
}

function setState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function currentUser() {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  return getState().users.find((user) => user.id === sessionId) ?? null;
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    name: safeUser.name ?? safeUser.full_name,
    full_name: safeUser.full_name ?? safeUser.name,
    userType: safeUser.userType ?? safeUser.user_type ?? safeUser.role,
    user_type: safeUser.user_type ?? safeUser.userType ?? safeUser.role,
    employeeId: safeUser.employeeId ?? safeUser.employee_id,
    employee_id: safeUser.employee_id ?? safeUser.employeeId,
    joiningDate: safeUser.joiningDate ?? safeUser.joining_date,
    joining_date: safeUser.joining_date ?? safeUser.joiningDate,
  };
}

function withFallback(request, fallback) {
  return request().catch(() => response(fallback()));
}

function metricsFromState() {
  const state = getState();
  const documentCompletion = Math.round(
    (state.documents.filter((doc) => doc.status === "verified").length / state.documents.length) * 100
  );
  const learningCompletion = Math.round(
    state.modules.reduce((sum, mod) => sum + (mod.progress ?? 0), 0) / state.modules.length
  );
  const profileCompletion = 92;
  const readinessScore = Math.round((documentCompletion + learningCompletion + profileCompletion) / 3);
  const user = currentUser();
  const daysRemaining = user?.joiningDate
    ? Math.max(0, Math.ceil((new Date(user.joiningDate) - today) / 86400000))
    : 0;

  return { profileCompletion, documentCompletion, learningCompletion, readinessScore, daysRemaining };
}

function analyticsFromState() {
  const candidates = getState().candidates;
  const avg = (key) => Math.round(candidates.reduce((sum, item) => sum + item[key], 0) / candidates.length);
  return {
    totalCandidates: candidates.length,
    avgProfileCompletion: avg("profile_completion"),
    avgDocumentCompletion: avg("document_completion"),
    avgLearningCompletion: avg("learning_completion"),
    avgReadinessScore: avg("readiness_score"),
  };
}

function modulesFromHrTasks() {
  const state = getState();
  const user = currentUser();
  const department = (user?.department ?? "").trim().toLowerCase();
  const taskModules = (state.tasks ?? [])
    .filter((task) => {
      if (task.status && task.status !== "published") return false;
      const taskDepartment = (task.department || "All").trim().toLowerCase();
      return !department || ["all", "overall", "everyone", "employees"].includes(taskDepartment) || taskDepartment === department;
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      category: task.department || "General",
      description: task.description || "",
      progress: task.progress ?? 0,
      required: task.mandatory ? 1 : 0,
      duration_minutes: task.duration_minutes ?? 15,
      file_url: task.file_url || "",
      content_type: task.content_type || "document",
      uploaded_by: task.uploaded_by || "HR",
    }));

  const taskIds = new Set(taskModules.map((task) => task.id));
  const staticModules = (state.modules ?? []).filter((module) => !taskIds.has(module.id));
  return [...taskModules, ...staticModules];
}

function relocationSuggestionsFor(location) {
  const area = location?.trim() || "your preferred area";
  return [
    {
      id: "fallback-apartments",
      category: "Accommodation",
      title: `Apartments and PGs near ${area}`,
      description: "Compare furnished apartments, PGs, shared flats, deposits, and commute time.",
      address: `${area} residential clusters`,
      contact: "Verify with HR travel desk or local listings",
      distance_km: 1.5,
    },
    {
      id: "fallback-hospitals",
      category: "Health",
      title: `Hospitals and clinics near ${area}`,
      description: "Save emergency care, general physician, pharmacy, and diagnostics options.",
      address: `${area} main road and nearby market`,
      contact: "Verify emergency number before relying on it",
      distance_km: 2.0,
    },
    {
      id: "fallback-gyms",
      category: "Fitness",
      title: `Gyms near ${area}`,
      description: "Look for monthly plans, trial sessions, lockers, and walkable distance.",
      address: `${area} market / high-street area`,
      contact: "Visit before paying membership",
      distance_km: 1.0,
    },
    {
      id: "fallback-essentials",
      category: "Essentials",
      title: `Groceries, pharmacy, and daily needs near ${area}`,
      description: "Shortlist grocery stores, pharmacies, laundry, food options, and setup shops.",
      address: `${area} local market`,
      contact: "Save two backup options",
      distance_km: 0.8,
    },
  ];
}

function relocationCategoriesFor(location) {
  const area = location?.trim() || "your preferred area";
  return [
    {
      key: "apartments",
      title: "Apartments",
      columns: ["Rank", "Name", "Distance", "Travel Time", "Rent", "Contact", "Rating"],
      items: [
        { Rank: "1", Name: `Apartments near ${area}`, Distance: "1.5 km", "Travel Time": "Not Available", Rent: "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "2", Name: "Not Available", Distance: "Not Available", "Travel Time": "Not Available", Rent: "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "3", Name: "Not Available", Distance: "Not Available", "Travel Time": "Not Available", Rent: "Not Available", Contact: "Not Available", Rating: "Not Available" },
      ],
    },
    {
      key: "hospitals",
      title: "Hospitals",
      columns: ["Rank", "Name", "Distance", "Emergency", "Contact", "Rating"],
      items: [
        { Rank: "1", Name: `Hospitals near ${area}`, Distance: "2 km", Emergency: "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "2", Name: "Not Available", Distance: "Not Available", Emergency: "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "3", Name: "Not Available", Distance: "Not Available", Emergency: "Not Available", Contact: "Not Available", Rating: "Not Available" },
      ],
    },
    {
      key: "fitness",
      title: "Fitness Centers",
      columns: ["Rank", "Name", "Distance", "Monthly Fees", "Contact", "Rating"],
      items: [
        { Rank: "1", Name: `Gyms near ${area}`, Distance: "1 km", "Monthly Fees": "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "2", Name: "Not Available", Distance: "Not Available", "Monthly Fees": "Not Available", Contact: "Not Available", Rating: "Not Available" },
        { Rank: "3", Name: "Not Available", Distance: "Not Available", "Monthly Fees": "Not Available", Contact: "Not Available", Rating: "Not Available" },
      ],
    },
  ];
}

function assistantReply(message) {
  const text = message.toLowerCase();
  if (text.includes("document")) {
    return "You should complete PAN, Aadhaar, education certificates, and bank proof before your joining date. Submitted items can still be re-uploaded until HR verifies them.";
  }
  if (text.includes("relocat") || text.includes("travel") || text.includes("stay")) {
    return "For relocation, confirm temporary accommodation, carry original documents, and report to the plant gate listed in Relocation Support. HR travel desk can help with approved stays and shuttle details.";
  }
  if (text.includes("learn") || text.includes("module")) {
    return "Complete required learning modules first: company orientation, code of conduct, and plant safety. Optional modules can be finished after the required items are done.";
  }
  return "For onboarding, focus on three things first: verify your profile, upload pending documents, and complete required learning modules. Your dashboard readiness score tracks all three.";
}

function socialUserFor(provider, role) {
  const state = getState();
  const normalizedRole = role === "hr" ? "hr" : "employee";
  const normalizedProvider = provider?.toLowerCase() || "sso";
  const existingUser =
    state.users.find((item) => item.user_type === normalizedRole || item.userType === normalizedRole) ??
    state.users[0];

  if (existingUser) {
    localStorage.setItem(SESSION_KEY, existingUser.id);
    return publicUser({
      ...existingUser,
      authProvider: normalizedProvider,
      auth_provider: normalizedProvider,
    });
  }

  const id = `${normalizedRole}-${normalizedProvider}-${Date.now()}`;
  const displayProvider = normalizedProvider.charAt(0).toUpperCase() + normalizedProvider.slice(1);
  const nextUser = {
    id,
    name: `${displayProvider} ${normalizedRole === "hr" ? "HR" : "User"}`,
    full_name: `${displayProvider} ${normalizedRole === "hr" ? "HR" : "User"}`,
    email: `${normalizedProvider}.${normalizedRole}@tatamotors.com`,
    employeeId: normalizedRole === "hr" ? "HR-SOCIAL" : "TM-SOCIAL",
    employee_id: normalizedRole === "hr" ? "HR-SOCIAL" : "TM-SOCIAL",
    role: normalizedRole === "hr" ? "HR Business Partner" : "Graduate Engineer Trainee",
    department: normalizedRole === "hr" ? "People Operations" : "Vehicle Software",
    location: normalizedRole === "hr" ? "Mumbai HQ" : "Pune Plant",
    joiningDate: addDays(18),
    joining_date: addDays(18),
    userType: normalizedRole,
    user_type: normalizedRole,
    authProvider: normalizedProvider,
    auth_provider: normalizedProvider,
  };

  state.users.push(nextUser);
  setState(state);
  localStorage.setItem(SESSION_KEY, nextUser.id);
  return publicUser(nextUser);
}

// Auth
export const authApi = {
  oauthStartUrl: (provider, role = "employee", mode = "login") =>
    `${BASE_URL}/api/auth/oauth/${provider}/start?role=${encodeURIComponent(role)}&mode=${encodeURIComponent(mode)}`,
  login: (data) =>
    withFallback(
      () => api.post("/api/auth/login", data),
      () => {
        const state = getState();
        const identifier = data.identifier?.trim();
        const userByIdentifier = state.users.find(
          (item) =>
            item.email === identifier || item.employeeId === identifier || item.employee_id === identifier
        );
        const user =
          userByIdentifier ??
          state.users.find((item) => item.userType === data.role || item.user_type === data.role);
        if (!user) {
          throw new Error("Invalid credentials");
        }
        localStorage.setItem(SESSION_KEY, user.id);
        return { user: publicUser(user), demo: true };
      }
    ),
  signup: (data) =>
    withFallback(
      () => api.post("/api/auth/signup", data),
      () => {
        const state = getState();
        const id = `emp-${Date.now()}`;
        const user = {
          id,
          name: data.name ?? data.full_name,
          full_name: data.name ?? data.full_name,
          email: data.email,
          employeeId: data.employeeId,
          employee_id: data.employeeId,
          role: data.designation ?? data.role,
          department: data.department,
          location: data.location,
          joiningDate: data.joiningDate,
          joining_date: data.joiningDate,
          userType: data.accountType ?? "employee",
          user_type: data.accountType ?? "employee",
          password: data.password,
        };
        state.users.push(user);
        state.candidates.push({
          id,
          name: user.name,
          email: user.email,
          employee_id: user.employeeId,
          department: user.department,
          location: user.location,
          role: user.role,
          joining_date: user.joiningDate,
          phone: "—",
          user_type: user.userType,
          profile_completion: 70,
          document_completion: 0,
          learning_completion: 0,
          readiness_score: 23,
        });
        setState(state);
        return { user: publicUser(user), demo: true };
      }
    ),
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    return api.post("/api/auth/logout").catch(() => response({ ok: true }));
  },
  me: () =>
    withFallback(
      () => api.get("/api/auth/me"),
      () => {
        const user = currentUser();
        if (!user) throw new Error("No demo session");
        return { user: publicUser(user), demo: true };
      }
    ),
  forgotPassword: (data) => api.post("/api/auth/forgot-password", data).catch(() => response({ ok: true })),
  resetPassword: (data) => api.post("/api/auth/reset-password", data).catch(() => response({ ok: true })),
  socialLogin: (data) => api.get(`/api/auth/oauth/${data.provider}/start`, { params: { role: data.role } }),
};

// Candidate
export const candidateApi = {
  getMe: () => withFallback(() => api.get("/api/candidate/me"), () => ({ user: publicUser(currentUser()) })),
  getMetrics: () => withFallback(() => api.get("/api/candidate/metrics"), metricsFromState),
  updateProfile: (data) => api.patch("/api/candidate/profile", data).catch(() => response({ ok: true })),
};

// Documents
export const documentsApi = {
  list: () => withFallback(() => api.get("/api/documents"), () => ({ documents: getState().documents })),
  upload: (id, formData) =>
    withFallback(
      () =>
        api.post("/api/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          params: { documentId: id },
        }),
      () => {
        const state = getState();
        const file = formData.get("file");
        state.documents = state.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                status: "submitted",
                file_name: file?.name ?? "uploaded-file.pdf",
                uploaded_at: new Date().toISOString().slice(0, 10),
              }
            : doc
        );
        setState(state);
        return { ok: true };
      }
    ),
};

// Learning
export const learningApi = {
  listModules: () => {
    const user = currentUser();
    return withFallback(
      () => api.get("/api/learning/modules", { params: { candidate_id: user?.id ?? "demo" } }),
      () => ({ modules: modulesFromHrTasks() })
    );
  },
  updateProgress: (data) =>
    withFallback(
      () => api.post("/api/learning/progress", data),
      () => {
        const state = getState();
        state.modules = state.modules.map((mod) =>
          mod.id === data.moduleId ? { ...mod, progress: data.progress } : mod
        );
        state.tasks = (state.tasks ?? []).map((task) =>
          task.id === data.moduleId ? { ...task, progress: data.progress } : task
        );
        setState(state);
        return { ok: true };
      }
    ),
  submitQuiz: (data) => api.post("/api/learning/quiz-submit", data).catch(() => response({ ok: true })),
};

// Relocation
export const relocationApi = {
  get: () => withFallback(() => api.get("/api/relocation"), () => getState().relocation),
  search: (data) =>
    withFallback(
      () => api.post("/api/relocation/search", data),
      () => ({
        location: data.location || data.destination_city,
        summary: {
          destination: data.location || data.destination_city,
          overview: `Demo relocation suggestions for ${data.location || data.destination_city}.`,
        },
        categories: [
          {
            key: "relocation-results",
            title: "Relocation Results",
            columns: ["Name", "Location", "Contact", "Distance"],
            items: relocationSuggestionsFor(data.location || data.destination_city).map((item) => ({
              Name: item.title,
              Location: item.address || data.location || data.destination_city,
              Contact: item.contact || "Not Available",
              Distance: item.distance_km != null ? `${item.distance_km} km` : "Not Available",
            })),
          },
        ],
        suggested_best_choice: {},
        additional_insights: ["Verify addresses, contacts, and distance directly before booking."],
        resources: relocationSuggestionsFor(data.location || data.destination_city),
        source: "fallback",
      })
    ),
};

// Assistant
export const assistantApi = {
  chat: (data) =>
    withFallback(
      () => api.post("/api/assistant/chat", data),
      () => ({ reply: assistantReply(data.message ?? "") })
    ),
  policies: (data) => api.post("/api/assistant/policies", data),
};

// HR
export const hrApi = {
  listCandidates: (params = {}) =>
    withFallback(
      () => api.get("/api/hr/candidates", { params }),
      () => ({ candidates: getState().candidates, pagination: { page: 1, limit: getState().candidates.length, total: getState().candidates.length, pages: 1 } })
    ),
  getAnalytics: () => withFallback(() => api.get("/api/hr/analytics"), analyticsFromState),
  getCandidate: (id) =>
    withFallback(
      () => api.get(`/api/hr/candidates/${id}`),
      () => ({
        candidate: getState().candidates.find((candidate) => candidate.id === id),
        documents: getState().documents,
        modules: getState().modules,
      })
    ),
  createCandidate: (data) =>
    withFallback(
      () => api.post("/api/hr/candidates", data),
      () => {
        const state = getState();
        const candidate = {
          id: `emp-${Date.now()}`,
          name: data.name,
          email: data.email,
          employee_id: data.employee_id,
          department: data.department,
          role: data.role ?? data.designation,
          joining_date: data.joining_date,
          phone: data.phone ?? "",
          readiness_score: data.readiness_score ?? 0,
          document_completion: data.document_completion ?? 0,
          learning_completion: data.learning_progress ?? 0,
          profile_completion: data.profile_completion ?? 70,
        };
        state.candidates.push(candidate);
        setState(state);
        return { candidate };
      }
    ),
  updateCandidate: (id, data) =>
    withFallback(
      () => api.patch(`/api/hr/candidates/${id}`, data),
      () => {
        const state = getState();
        state.candidates = state.candidates.map((candidate) =>
          candidate.id === id ? { ...candidate, ...data } : candidate
        );
        setState(state);
        return { candidate: state.candidates.find((candidate) => candidate.id === id) };
      }
    ),
  deleteCandidate: (id) =>
    withFallback(
      () => api.delete(`/api/hr/candidates/${id}`),
      () => {
        const state = getState();
        state.candidates = state.candidates.filter((candidate) => candidate.id !== id);
        setState(state);
        return { ok: true };
      }
    ),
  listDepartments: () =>
    withFallback(() => api.get("/api/hr/departments"), () => ({ departments: getState().departments })),
  createDepartment: (data) =>
    withFallback(
      () => api.post("/api/hr/departments", data),
      () => {
        const state = getState();
        const department = { id: `dept-${Date.now()}`, ...data };
        state.departments.push(department);
        setState(state);
        return { department };
      }
    ),
  updateDepartment: (id, data) =>
    withFallback(
      () => api.patch(`/api/hr/departments/${id}`, data),
      () => {
        const state = getState();
        state.departments = state.departments.map((department) =>
          department.id === id ? { ...department, ...data } : department
        );
        setState(state);
        return { department: state.departments.find((department) => department.id === id) };
      }
    ),
  deleteDepartment: (id) =>
    withFallback(
      () => api.delete(`/api/hr/departments/${id}`),
      () => {
        const state = getState();
        state.departments = state.departments.filter((department) => department.id !== id);
        setState(state);
        return { ok: true };
      }
    ),
  listTasks: (params = {}) =>
    withFallback(() => api.get("/api/hr/tasks", { params }), () => ({ tasks: getState().tasks })),
  createTask: (data) =>
    withFallback(
      () => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") formData.append(key, value);
        });
        return api.post("/api/hr/tasks", formData, { headers: { "Content-Type": "multipart/form-data" } });
      },
      () => {
        const state = getState();
        const { file, ...taskData } = data;
        const task = {
          id: `task-${Date.now()}`,
          version: "1.0",
          visibility: "employees",
          ...taskData,
          file_name: file?.name ?? taskData.file_name,
          file_url: file?.name ? `local-upload://${file.name}` : taskData.file_url,
        };
        state.tasks.unshift(task);
        setState(state);
        return { task };
      }
    ),
  updateTask: (id, data) =>
    withFallback(
      () => api.patch(`/api/hr/tasks/${id}`, data),
      () => {
        const state = getState();
        state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, ...data } : task));
        setState(state);
        return { task: state.tasks.find((task) => task.id === id) };
      }
    ),
  deleteTask: (id) =>
    withFallback(
      () => api.delete(`/api/hr/tasks/${id}`),
      () => {
        const state = getState();
        state.tasks = state.tasks.filter((task) => task.id !== id);
        setState(state);
        return { ok: true };
      }
    ),
  listDocumentRequirements: () =>
    withFallback(() => api.get("/api/hr/document-requirements"), () => ({ requirements: getState().documentRequirements })),
  createDocumentRequirement: (data) =>
    withFallback(
      () => api.post("/api/hr/document-requirements", data),
      () => {
        const state = getState();
        const requirement = { id: `docreq-${Date.now()}`, ...data };
        state.documentRequirements.push(requirement);
        setState(state);
        return { requirement };
      }
    ),
  updateDocumentRequirement: (id, data) =>
    withFallback(
      () => api.patch(`/api/hr/document-requirements/${id}`, data),
      () => {
        const state = getState();
        state.documentRequirements = state.documentRequirements.map((requirement) =>
          requirement.id === id ? { ...requirement, ...data } : requirement
        );
        setState(state);
        return { requirement: state.documentRequirements.find((requirement) => requirement.id === id) };
      }
    ),
  deleteDocumentRequirement: (id) =>
    withFallback(
      () => api.delete(`/api/hr/document-requirements/${id}`),
      () => {
        const state = getState();
        state.documentRequirements = state.documentRequirements.filter((requirement) => requirement.id !== id);
        setState(state);
        return { ok: true };
      }
    ),
  listLearning: () => withFallback(() => api.get("/api/hr/learning"), () => ({ modules: getState().modules })),
  createModule: (data) => api.post("/api/hr/learning", data).catch(() => response({ module: data })),
};

export default api;
