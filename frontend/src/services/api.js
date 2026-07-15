import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
const STORAGE_KEY = "preonboarding_demo_state";
const SESSION_KEY = "preonboarding_demo_session";
const LEARNING_CONTENT_TYPES = new Set(["video", "pdf", "image", "link"]);

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
      id: "task-hr-video-day-one",
      title: "Day-one plant orientation video",
      description: "HR-uploaded video briefing covering gate entry, reporting flow, PPE basics, and first-day support contacts.",
      department: "All",
      version: "1.0",
      uploaded_by: "HR Learning Team",
      expiry_date: addDays(45),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "video",
      duration_minutes: 6,
      file_name: "day-one-plant-orientation.mp4",
      file_url: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4",
    },
    {
      id: "task-video-company-culture",
      title: "Company Culture: How We Work",
      description: "A concise video introduction to collaboration norms, ownership principles, and inclusive workplace behaviors.",
      department: "All",
      version: "1.0",
      uploaded_by: "People Experience",
      expiry_date: addDays(60),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "video",
      duration_minutes: 8,
      file_name: "company-culture-how-we-work.mp4",
      file_url: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4",
    },
    {
      id: "task-video-workplace-safety",
      title: "Workplace Safety Essentials",
      description: "Required safety orientation covering PPE, emergency exits, incident reporting, and shop-floor movement rules.",
      department: "Manufacturing",
      version: "1.0",
      uploaded_by: "Safety Team",
      expiry_date: addDays(45),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "video",
      duration_minutes: 10,
      file_name: "workplace-safety-essentials.mp4",
      file_url: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4",
    },
    {
      id: "task-video-manufacturing-basics",
      title: "Manufacturing Basics: From Line to Quality Gate",
      description: "Overview of production flow, takt time, quality checkpoints, and escalation practices for plant-facing teams.",
      department: "Manufacturing",
      version: "1.0",
      uploaded_by: "Manufacturing Academy",
      expiry_date: addDays(60),
      mandatory: false,
      visibility: "employees",
      status: "published",
      content_type: "video",
      duration_minutes: 12,
      file_name: "manufacturing-basics-quality-gate.mp4",
      file_url: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4",
    },
    {
      id: "task-pdf-code-of-conduct",
      title: "Code of Conduct Handbook",
      description: "PDF handbook covering ethical decision-making, conflicts of interest, confidentiality, and escalation channels.",
      department: "All",
      version: "1.0",
      uploaded_by: "Compliance Team",
      expiry_date: addDays(90),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "pdf",
      duration_minutes: 18,
      file_name: "code-of-conduct-handbook.pdf",
      file_url: "https://www.tata.com/content/dam/tata/pdf/Tata-Code-of-Conduct.pdf",
    },
    {
      id: "task-pdf-employee-benefits",
      title: "Employee Benefits Overview",
      description: "PDF guide summarizing health coverage, leave policies, wellness support, and employee assistance programs.",
      department: "All",
      version: "1.0",
      uploaded_by: "HR Benefits Team",
      expiry_date: addDays(90),
      mandatory: false,
      visibility: "employees",
      status: "published",
      content_type: "pdf",
      duration_minutes: 12,
      file_name: "employee-benefits-overview.pdf",
      file_url: "https://www.tatamotors.com/wp-content/uploads/2024/06/annual-report-2023-24.pdf",
    },
    {
      id: "task-image-safety-map",
      title: "Plant Safety Zones Map",
      description: "Visual reference for PPE zones, visitor walkways, assembly areas, and emergency response points.",
      department: "Manufacturing",
      version: "1.0",
      uploaded_by: "Safety Team",
      expiry_date: addDays(60),
      mandatory: false,
      visibility: "employees",
      status: "published",
      content_type: "image",
      duration_minutes: 5,
      file_name: "plant-safety-zones-map.jpeg",
      file_url: "https://images.unsplash.com/photo-1581092335878-1c5f0f15664f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "task-image-cybersecurity-checklist",
      title: "Cybersecurity Quick Reference",
      description: "Image-based checklist for password hygiene, phishing red flags, device locking, and secure data handling.",
      department: "All",
      version: "1.0",
      uploaded_by: "Information Security",
      expiry_date: addDays(60),
      mandatory: false,
      visibility: "employees",
      status: "published",
      content_type: "image",
      duration_minutes: 6,
      file_name: "cybersecurity-quick-reference.png",
      file_url: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "task-link-cybersecurity-awareness",
      title: "Cybersecurity Awareness Portal",
      description: "Learning link with phishing simulations, secure browsing guidance, and reporting steps for suspicious emails.",
      department: "All",
      version: "1.0",
      uploaded_by: "Information Security",
      expiry_date: addDays(45),
      mandatory: true,
      visibility: "employees",
      status: "published",
      content_type: "link",
      duration_minutes: 20,
      link_url: "https://www.cisa.gov/secure-our-world",
    },
    {
      id: "task-link-company-values",
      title: "Company Values and Leadership Principles",
      description: "Curated learning link for company values, leadership expectations, and responsible business practices.",
      department: "All",
      version: "1.0",
      uploaded_by: "HR Learning Team",
      expiry_date: addDays(90),
      mandatory: false,
      visibility: "employees",
      status: "published",
      content_type: "link",
      duration_minutes: 10,
      link_url: "https://www.tata.com/about-us/tata-values-purpose",
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
    {
      id: "aadhaar",
      name: "Aadhaar Card",
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
      id: "resume",
      name: "Resume",
      mandatory: true,
      department: "All",
      role: "",
      due_days_before_joining: 5,
      reminder_days: 2,
      max_file_size_mb: 10,
      accepted_formats: [".pdf"],
      approval_required: true,
    },
    {
      id: "degree",
      name: "Degree Certificate",
      mandatory: true,
      department: "All",
      role: "",
      due_days_before_joining: 10,
      reminder_days: 3,
      max_file_size_mb: 15,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png"],
      approval_required: true,
    },
    {
      id: "experience",
      name: "Experience Letter",
      mandatory: false,
      department: "All",
      role: "",
      due_days_before_joining: 10,
      reminder_days: 3,
      max_file_size_mb: 15,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png"],
      approval_required: true,
    },
    {
      id: "photo",
      name: "Passport Photo",
      mandatory: true,
      department: "All",
      role: "",
      due_days_before_joining: 7,
      reminder_days: 3,
      max_file_size_mb: 5,
      accepted_formats: [".jpg", ".jpeg", ".png"],
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
const reminderMessage =
  "Your joining date is coming soon. Please complete your pending onboarding activities, including profile details, document upload, learning modules, and readiness tasks before your joining date.";

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value || 0)));
const profileSectionIds = [
  "personal_info",
  "emergency_contacts",
  "bank_details",
  "tax_information",
  "profile_photo",
];

function daysUntil(dateValue) {
  if (!dateValue) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const joining = new Date(dateValue);
  joining.setHours(0, 0, 0, 0);
  return Math.ceil((joining - todayStart) / 86400000);
}

function defaultDocumentRows(state) {
  const fromRequirements = (state.documentRequirements ?? []).map((requirement) => ({
    id: requirement.id,
    name: requirement.name,
    status: "missing",
    deadline: addDays(requirement.due_days_before_joining ?? 7),
    accepted_formats: requirement.accepted_formats ?? [],
  }));

  if (fromRequirements.length > 0) return fromRequirements;
  return (state.documents ?? []).map(({ id, name, deadline, accepted_formats }) => ({
    id,
    name,
    deadline,
    accepted_formats,
    status: "missing",
  }));
}

function inferFileType(fileName = "", contentType = "") {
  const source = `${fileName} ${contentType}`.toLowerCase();
  if (source.includes(".pdf") || source.includes("pdf")) return "PDF";
  if (source.includes(".png") || source.includes("png")) return "PNG";
  if (source.includes(".jpg") || source.includes(".jpeg") || source.includes("jpeg")) return "JPG";
  if (source.includes(".doc")) return "DOC";
  return "PDF";
}

function formatBytes(bytes) {
  if (!bytes) return "2.4 MB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeDocumentRow(doc, index = 0) {
  const now = new Date().toISOString();
  const uploadedAt = doc.uploaded_at || doc.uploadedAt || (doc.file_name ? addDays(-Math.max(1, index + 1)) : "");
  const fileType = doc.file_type || doc.fileType || inferFileType(doc.file_name, doc.content_type);
  const fileSize = doc.file_size || doc.fileSize || (doc.file_name ? `${(1.2 + index * 0.4).toFixed(1)} MB` : "");
  const updatedAt = doc.updated_at || doc.updatedAt || doc.verifiedAt || uploadedAt || "";
  const uploadedBy = doc.uploaded_by || doc.uploadedBy || "Candidate";
  const versionNumber = doc.version || doc.version_number || (doc.file_name ? 1 : 0);
  const baseVersion = doc.file_name
    ? {
        version: versionNumber || 1,
        file_name: doc.file_name,
        uploaded_at: uploadedAt,
        uploaded_by: uploadedBy,
        status: doc.status,
        verified_by: doc.verifiedBy || doc.verified_by || "",
        verified_at: doc.verifiedAt || doc.verified_at || "",
        file_type: fileType,
        file_size: fileSize,
      }
    : null;
  const versions = doc.versions?.length ? doc.versions : baseVersion ? [baseVersion] : [];
  const auditTrail = doc.auditTrail?.length
    ? doc.auditTrail
    : [
        doc.file_name
          ? {
              id: `${doc.id}-audit-upload`,
              action: versionNumber > 1 ? "Candidate re-uploaded document" : "Candidate uploaded document",
              actor: uploadedBy,
              at: uploadedAt,
              note: doc.file_name,
            }
          : null,
        doc.status === "verified"
          ? {
              id: `${doc.id}-audit-verified`,
              action: "HR verified document",
              actor: doc.verifiedBy || "HR",
              at: doc.verifiedAt || updatedAt || now,
              note: "Verification locked",
            }
          : null,
        doc.status === "rejected"
          ? {
              id: `${doc.id}-audit-rejected`,
              action: "HR rejected document",
              actor: doc.verifiedBy || "HR",
              at: updatedAt || now,
              note: doc.rejectionReason || doc.rejection_reason || doc.comments || "Re-upload requested",
            }
          : null,
      ].filter(Boolean);

  return {
    ...doc,
    file_type: fileType,
    fileSize,
    file_size: fileSize,
    uploaded_at: uploadedAt,
    uploadedAt,
    uploaded_by: uploadedBy,
    uploadedBy,
    updated_at: updatedAt,
    updatedAt,
    lastUpdated: updatedAt,
    version: versionNumber,
    versions,
    auditTrail,
  };
}

function documentRowsForUser(state, userId) {
  if (userId === "emp-001" && !state.userDocuments?.[userId]) {
    return (state.documents ?? []).map(normalizeDocumentRow);
  }
  const savedRows = state.userDocuments?.[userId] ?? [];
  const savedById = new Map(savedRows.map((doc) => [doc.id, doc]));
  return defaultDocumentRows(state).map((doc, index) => normalizeDocumentRow({ ...doc, ...(savedById.get(doc.id) ?? {}) }, index));
}

function modulesForUser(state, user) {
  const department = (user?.department ?? "").trim().toLowerCase();
  const role = (user?.role ?? user?.designation ?? "").trim().toLowerCase();
  const plant = (user?.location ?? "").trim().toLowerCase();
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
      progress: 0,
      required: task.mandatory ? 1 : 0,
      duration_minutes: task.duration_minutes ?? 15,
      file_url: task.file_url || "",
      content_type: task.content_type || "document",
      uploaded_by: task.uploaded_by || "HR",
      audience: task.department && task.department !== "All" ? "Department-based" : "Company-wide",
      track: task.department && task.department !== "All" ? "department" : "culture",
      link_url: task.link_url || "",
      applies_to: task.department && task.department !== "All" ? task.department : "All employees",
    }));

  const baseModules = taskModules;
  const progressMap = state.userModuleProgress?.[user?.id] ?? {};
  const seen = new Set();
  return baseModules
    .filter((module) => {
      const moduleDepartment = (module.department_target ?? module.department ?? "").toLowerCase();
      const moduleRole = (module.role_target ?? "").toLowerCase();
      const modulePlant = (module.plant_target ?? "").toLowerCase();
      const departmentMatch = !moduleDepartment || moduleDepartment === "all" || moduleDepartment === department;
      const roleMatch = !moduleRole || role.includes(moduleRole) || moduleRole.includes(role);
      const plantMatch = !modulePlant || plant.includes(modulePlant) || modulePlant.includes(plant);
      return departmentMatch && roleMatch && plantMatch;
    })
    .filter((module) => {
      if (seen.has(module.id)) return false;
      seen.add(module.id);
      return true;
    })
    .map((module) => ({
      ...module,
      progress: user?.id === "emp-001" && progressMap[module.id] == null ? module.progress ?? 0 : progressMap[module.id] ?? 0,
    }));
}

function profileSectionsForUser(state, user) {
  if (!user) return {};
  const saved = state.userProfileSections?.[user.id];
  if (saved) return saved;

  const candidate = (state.candidates ?? []).find((item) => item.id === user.id || item.email === user.email);
  const completedCount = Math.floor(((candidate?.profile_completion ?? user.profile_completion ?? 0) / 100) * profileSectionIds.length);
  return profileSectionIds.reduce((sections, id, index) => {
    sections[id] = index < completedCount;
    return sections;
  }, {});
}

function calculateProgressForUser(state, user) {
  if (!user) {
    return { profileCompletion: 0, documentCompletion: 0, learningCompletion: 0, readinessScore: 0, profileSections: {} };
  }
  const documents = documentRowsForUser(state, user.id);
  const modules = modulesForUser(state, user);
  const profileSections = profileSectionsForUser(state, user);
  const documentCompletion = documents.length
    ? clampPercent((documents.filter((doc) => ["uploaded", "submitted", "verified", "approved"].includes(doc.status)).length / documents.length) * 100)
    : 0;
  const learningCompletion = modules.length
    ? clampPercent(modules.reduce((sum, mod) => sum + (mod.progress ?? 0), 0) / modules.length)
    : 0;
  const profileCompletion = clampPercent(
    (profileSectionIds.filter((id) => profileSections[id]).length / profileSectionIds.length) * 100
  );
  const readinessScore = clampPercent((profileCompletion + documentCompletion + learningCompletion) / 3);
  return { profileCompletion, documentCompletion, learningCompletion, readinessScore, profileSections };
}

function syncCandidateProgress(state, userId) {
  const user = (state.users ?? []).find((item) => item.id === userId);
  if (!user) return state;
  const progress = calculateProgressForUser(state, user);
  state.candidates = (state.candidates ?? []).map((candidate) =>
    candidate.id === userId || candidate.email === user.email
      ? {
          ...candidate,
          profile_completion: progress.profileCompletion,
          document_completion: progress.documentCompletion,
          learning_completion: progress.learningCompletion,
          learning_progress: progress.learningCompletion,
          readiness_score: progress.readinessScore,
          last_activity: progress.readinessScore >= 100 ? "Onboarding completed" : candidate.last_activity,
        }
      : candidate
  );
  return state;
}

function candidateWithDerivedStatus(candidate) {
  const readiness = clampPercent(candidate.readiness_score ?? 0);
  const joiningDays = daysUntil(candidate.joining_date);
  const complete = readiness >= 100;
  const nearJoining = joiningDays >= 0 && joiningDays <= 7;
  const needsAttention = nearJoining && !complete;
  const notificationStatus = complete
    ? "Completed"
    : candidate.last_notified_at
      ? "Notified"
      : needsAttention
        ? "Pending Notification"
        : "On Track";

  return {
    ...candidate,
    joining_days_remaining: joiningDays,
    needs_attention: needsAttention,
    notification_status: notificationStatus,
  };
}

function onboardingStatusLabel(candidate) {
  const readiness = candidate.readiness_score ?? 0;
  if (readiness >= 100) return "Ready";
  if (candidate.needs_attention || readiness < 30) return "Critical";
  return "In Progress";
}

function generatedNotificationsFor(state, user) {
  if (!user) return [];
  const now = new Date().toISOString();
  const documents = documentRowsForUser(state, user.id);
  const modules = modulesForUser(state, user);
  const pendingDocs = documents.filter((doc) => ["missing", "pending", "rejected"].includes(doc.status)).length;
  const submittedDocs = documents.filter((doc) => ["submitted", "uploaded"].includes(doc.status)).length;
  const pendingModules = modules.filter((module) => (module.progress ?? 0) < 100).length;
  const daysRemaining = daysUntil(user.joiningDate ?? user.joining_date);
  const items = [
    {
      id: `welcome-${user.id}`,
      user_id: user.id,
      type: "welcome",
      title: "Welcome to Pre-Onboarding",
      message: "Your onboarding workspace is ready. Start with profile completion, documents, learning, and relocation planning.",
      priority: "normal",
      created_at: now,
    },
    {
      id: `hr-announcement-${user.id}`,
      user_id: user.id,
      type: "hr_announcement",
      title: "HR announcement",
      message: "Please keep your original documents and joining letter ready for Day 1 verification.",
      priority: "normal",
      created_at: now,
    },
  ];

  if (pendingDocs > 0 || pendingModules > 0) {
    items.push({
      id: `pending-tasks-${user.id}`,
      user_id: user.id,
      type: "pending_tasks",
      title: "Pending onboarding tasks",
      message: `${pendingDocs} document${pendingDocs === 1 ? "" : "s"} and ${pendingModules} learning module${pendingModules === 1 ? "" : "s"} still need attention.`,
      priority: "high",
      created_at: now,
    });
  }
  if (pendingModules > 0) {
    items.push({
      id: `learning-reminder-${user.id}`,
      user_id: user.id,
      type: "learning_reminder",
      title: "Learning reminder",
      message: "Complete assigned department, role, plant safety, culture, and code of conduct modules before joining.",
      priority: "normal",
      created_at: now,
    });
  }
  if (submittedDocs > 0) {
    items.push({
      id: `document-approval-${user.id}`,
      user_id: user.id,
      type: "document_approval",
      title: "Document approval in progress",
      message: `${submittedDocs} uploaded document${submittedDocs === 1 ? " is" : "s are"} waiting for HR approval.`,
      priority: "normal",
      created_at: now,
    });
  }
  if (daysRemaining >= 0 && daysRemaining <= 7) {
    items.push({
      id: `joining-reminder-${user.id}`,
      user_id: user.id,
      type: "joining_reminder",
      title: daysRemaining === 0 ? "Joining today" : "Joining date approaching",
      message: daysRemaining === 0 ? "Today is your joining day. Follow the Day 1 Simulator timeline." : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} to go. Complete pending onboarding activities before your joining date.`,
      priority: "high",
      created_at: now,
    });
  }

  return items;
}

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
  merged.tasks = (merged.tasks ?? []).filter((task) => LEARNING_CONTENT_TYPES.has(task.content_type || "video"));

  merged.userDocuments = merged.userDocuments ?? {};
  merged.userModuleProgress = merged.userModuleProgress ?? {};
  merged.userProfileSections = merged.userProfileSections ?? {};
  merged.notifications = merged.notifications ?? [];
  merged.notificationReads = merged.notificationReads ?? {};
  merged.notificationHistory = merged.notificationHistory ?? [];
  merged.candidates = (merged.candidates ?? []).map(candidateWithDerivedStatus);

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

function rememberSessionUser(user) {
  const normalized = publicUser(user);
  if (!normalized?.id) return normalized;
  const state = getState();
  const existing = state.users.some((item) => item.id === normalized.id);
  state.users = existing
    ? state.users.map((item) => (item.id === normalized.id ? { ...item, ...normalized } : item))
    : [...state.users, normalized];
  localStorage.setItem(SESSION_KEY, normalized.id);
  setState(state);
  return normalized;
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
  return request().catch(() => Promise.resolve(fallback()).then((data) => response(data)));
}

function readFilePreview(file) {
  if (!file || typeof FileReader === "undefined") return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function metricsFromState() {
  const state = getState();
  const user = currentUser();
  const progress = calculateProgressForUser(state, user);
  const daysRemaining = Math.max(0, daysUntil(user?.joiningDate));
  const candidate = (state.candidates ?? []).find((item) => item.id === user?.id || item.email === user?.email);

  return {
    ...progress,
    daysRemaining,
    teamAssignment: candidate?.team_assignment ?? null,
    welcomeKitAssignment: candidate?.welcome_kit_assignment ?? {},
  };
}

function analyticsFromState() {
  const candidates = getState().candidates.map(candidateWithDerivedStatus);
  const avg = (key) => candidates.length ? Math.round(candidates.reduce((sum, item) => sum + (item[key] ?? 0), 0) / candidates.length) : 0;
  const inJoiningWeek = (candidate) =>
    (candidate.joining_days_remaining ?? 99) >= 0 && (candidate.joining_days_remaining ?? 99) <= 7;
  const learningValue = (candidate) => candidate.learning_completion ?? candidate.learning_progress ?? 0;

  return {
    totalCandidates: candidates.length,
    avgProfileCompletion: avg("profile_completion"),
    avgDocumentCompletion: avg("document_completion"),
    avgLearningCompletion: candidates.length
      ? Math.round(candidates.reduce((sum, item) => sum + learningValue(item), 0) / candidates.length)
      : 0,
    avgReadinessScore: avg("readiness_score"),
    pendingDocuments: candidates.filter((candidate) => (candidate.document_completion ?? 0) < 100).length,
    learningPending: candidates.filter((candidate) => learningValue(candidate) < 100).length,
    readyCandidates: candidates.filter((candidate) => (candidate.readiness_score ?? 0) >= 100).length,
    joiningToday: candidates.filter((candidate) => candidate.joining_days_remaining === 0).length,
    joiningThisWeek: candidates.filter(inJoiningWeek).length,
    upcomingJoiners: candidates.filter((candidate) => (candidate.joining_days_remaining ?? 99) >= 0 && (candidate.joining_days_remaining ?? 99) <= 30).length,
    highRiskJoiners: candidates.filter((candidate) => inJoiningWeek(candidate) && (candidate.readiness_score ?? 0) < 60).length,
    attentionRequired: candidates.filter((candidate) => candidate.needs_attention).length,
  };
}

function modulesFromHrTasks() {
  const state = getState();
  const user = currentUser();
  return modulesForUser(state, user);
}

function relocationSuggestionsFor(location) {
  const area = location?.trim() || "your preferred area";
  return [
    {
      id: "fallback-pgs",
      category: "Nearby PGs",
      title: `PG stays near ${area}`,
      description: "Meal-inclusive PGs and hostels for first-month relocation.",
      address: `${area} residential clusters`,
      contact: "+91 20 4100 2231",
      distance_km: 1.2,
      plant_distance_km: 3.4,
      monthly_cost: "₹8,000-₹14,000/month",
      commute_time: "15-25 min to plant",
    },
    {
      id: "fallback-flats",
      category: "Flats",
      title: `Shared flats and 1BHKs near ${area}`,
      description: "Longer-stay housing options with deposit and commute comparison.",
      address: `${area} apartment belt`,
      contact: "+91 20 4100 2242",
      distance_km: 1.8,
      plant_distance_km: 4.1,
      monthly_cost: "₹16,000-₹28,000/month",
      commute_time: "20-35 min to plant",
    },
    {
      id: "fallback-hotels",
      category: "Hotels",
      title: `Short-stay hotels near ${area}`,
      description: "Arrival-week hotels for employees and family travel.",
      address: `${area} main road`,
      contact: "+91 20 4100 2255",
      distance_km: 2.0,
      plant_distance_km: 4.8,
      monthly_cost: "₹1,800-₹4,500/night",
      commute_time: "20-40 min to plant",
    },
    {
      id: "fallback-hospitals",
      category: "Health",
      title: `Hospitals and clinics near ${area}`,
      description: "Save emergency care, general physician, pharmacy, and diagnostics options.",
      address: `${area} main road and nearby market`,
      contact: "+91 20 4100 2290",
      distance_km: 2.0,
      plant_distance_km: 3.8,
      monthly_cost: "Consultation ₹500-₹1,200",
      commute_time: "15-30 min to plant",
    },
    {
      id: "fallback-gyms",
      category: "Fitness",
      title: `Gyms near ${area}`,
      description: "Look for monthly plans, trial sessions, lockers, and walkable distance.",
      address: `${area} market / high-street area`,
      contact: "+91 20 4100 2266",
      distance_km: 1.0,
      plant_distance_km: 3.2,
      monthly_cost: "₹1,200-₹2,500/month",
      commute_time: "10-25 min to plant",
    },
    {
      id: "fallback-schools",
      category: "Schools",
      title: `Schools near ${area}`,
      description: "Education options for employees relocating with family.",
      address: `${area} education corridor`,
      contact: "+91 20 4100 2277",
      distance_km: 2.8,
      plant_distance_km: 5.6,
      monthly_cost: "Fees vary by school",
      commute_time: "25-45 min to plant",
    },
    {
      id: "fallback-malls",
      category: "Shopping Malls",
      title: `Shopping malls near ${area}`,
      description: "Food, household setup, electronics, and weekend shopping.",
      address: `${area} retail zone`,
      contact: "+91 20 4100 2288",
      distance_km: 3.1,
      plant_distance_km: 6.2,
      monthly_cost: "Lifestyle spend varies",
      commute_time: "25-45 min to plant",
    },
    {
      id: "fallback-essentials",
      category: "Essentials",
      title: `Groceries, pharmacy, and daily needs near ${area}`,
      description: "Shortlist grocery stores, pharmacies, laundry, food options, and setup shops.",
      address: `${area} local market`,
      contact: "Save two backup options",
      distance_km: 0.8,
      plant_distance_km: 3.0,
      monthly_cost: "₹6,000-₹12,000/month basics",
      commute_time: "10-20 min to plant",
    },
    {
      id: "fallback-transport",
      category: "Transport",
      title: `Transportation from ${area}`,
      description: "Compare shuttle, rail, bus, auto, cab pooling, and first-week commute time.",
      address: `${area} commute corridor`,
      contact: "transport.support@tatamotors.com",
      distance_km: 3.2,
      plant_distance_km: 3.2,
      monthly_cost: "₹1,500-₹5,000/month commute",
      commute_time: "15-40 min to plant",
    },
  ];
}

function relocationCategoriesFor(location) {
  const area = location?.trim() || "your preferred area";
  return [
    {
      key: "housing",
      title: "PGs, Flats, and Hotels",
      columns: ["Rank", "Type", "Name", "Plant Distance", "Travel Time", "Cost", "Contact"],
      items: [
        { Rank: "1", Type: "PG", Name: `PG stays near ${area}`, "Plant Distance": "3.4 km", "Travel Time": "15-25 min", Cost: "₹8,000-₹14,000/month", Contact: "+91 20 4100 2231" },
        { Rank: "2", Type: "Flat", Name: `Shared flats near ${area}`, "Plant Distance": "4.1 km", "Travel Time": "20-35 min", Cost: "₹16,000-₹28,000/month", Contact: "+91 20 4100 2242" },
        { Rank: "3", Type: "Hotel", Name: `Short-stay hotels near ${area}`, "Plant Distance": "4.8 km", "Travel Time": "20-40 min", Cost: "₹1,800-₹4,500/night", Contact: "+91 20 4100 2255" },
      ],
    },
    {
      key: "hospitals",
      title: "Hospitals",
      columns: ["Rank", "Name", "Plant Distance", "Emergency", "Contact", "Cost"],
      items: [
        { Rank: "1", Name: `Hospitals near ${area}`, "Plant Distance": "3.8 km", Emergency: "24x7 emergency", Contact: "+91 20 4100 2290", Cost: "Consultation ₹500-₹1,200" },
      ],
    },
    {
      key: "lifestyle",
      title: "Gyms, Schools, and Shopping",
      columns: ["Rank", "Type", "Name", "Plant Distance", "Monthly Cost", "Contact"],
      items: [
        { Rank: "1", Type: "Gym", Name: `Gyms near ${area}`, "Plant Distance": "3.2 km", "Monthly Cost": "₹1,200-₹2,500/month", Contact: "+91 20 4100 2266" },
        { Rank: "2", Type: "School", Name: `Schools near ${area}`, "Plant Distance": "5.6 km", "Monthly Cost": "Fees vary", Contact: "+91 20 4100 2277" },
        { Rank: "3", Type: "Mall", Name: `Shopping malls near ${area}`, "Plant Distance": "6.2 km", "Monthly Cost": "Lifestyle spend varies", Contact: "+91 20 4100 2288" },
      ],
    },
    {
      key: "transport",
      title: "Transportation and Cost of Living",
      columns: ["Rank", "Name", "Plant Distance", "Travel Time", "Monthly Cost", "Contact"],
      items: [
        { Rank: "1", Name: `Transport from ${area}`, "Plant Distance": "3.2 km", "Travel Time": "15-40 min", "Monthly Cost": "₹1,500-₹5,000/month", Contact: "transport.support@tatamotors.com" },
        { Rank: "2", Name: "Daily essentials", "Plant Distance": "3.0 km", "Travel Time": "10-20 min", "Monthly Cost": "₹6,000-₹12,000 basics", Contact: "Save two local options" },
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
      () =>
        api.post("/api/auth/login", data).then((res) => {
          rememberSessionUser(res.data?.user);
          return res;
        }),
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
      () =>
        api.post("/api/auth/signup", data).then((res) => {
          rememberSessionUser(res.data?.user);
          return res;
        }),
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
          profile_completion: 0,
          document_completion: 0,
          learning_completion: 0,
          learning_progress: 0,
          readiness_score: 0,
          current_stage: "Registered",
          last_activity: "Account created",
          notification_status: "On Track",
        });
        state.userDocuments = { ...(state.userDocuments ?? {}), [id]: defaultDocumentRows(state) };
        state.userModuleProgress = { ...(state.userModuleProgress ?? {}), [id]: {} };
        state.userProfileSections = { ...(state.userProfileSections ?? {}), [id]: {} };
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
      () =>
        api.get("/api/auth/me").then((res) => {
          rememberSessionUser(res.data?.user);
          return res;
        }),
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
  listPeers: () =>
    withFallback(
      () => api.get("/api/candidate/peers"),
      () => {
        const state = getState();
        const user = currentUser();
        const peers = (state.candidates ?? [])
          .filter((candidate) => candidate.id !== user?.id && candidate.email !== user?.email)
          .map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            employee_id: candidate.employee_id,
            department: candidate.department,
            role: candidate.role ?? candidate.designation,
            location: candidate.location,
            joining_date: candidate.joining_date,
            current_stage: candidate.current_stage ?? candidate.hr_status ?? candidate.status,
            readiness_score: candidate.readiness_score ?? candidate.readinessScore ?? 0,
          }));
        return { peers };
      }
    ),
  updateProfile: (data) =>
    withFallback(
      () => api.patch("/api/candidate/profile", data),
      () => {
        const state = getState();
        const user = currentUser();
        if (!user) return { ok: true };
        state.users = state.users.map((item) => (item.id === user.id ? { ...item, ...data } : item));
        if (data.profileSections) {
          state.userProfileSections = {
            ...(state.userProfileSections ?? {}),
            [user.id]: data.profileSections,
          };
        }
        const profileCompletion = data.profileSections
          ? clampPercent((profileSectionIds.filter((id) => data.profileSections[id]).length / profileSectionIds.length) * 100)
          : data.profile_completion ?? 100;
        state.candidates = state.candidates.map((candidate) =>
          candidate.id === user.id
            ? { ...candidate, ...data, profile_completion: profileCompletion, last_activity: "Profile updated" }
            : candidate
        );
        syncCandidateProgress(state, user.id);
        setState(state);
        return { ok: true };
      }
    ),
};

// Documents
export const documentsApi = {
  list: (candidateId) =>
    withFallback(
      () => api.get("/api/documents", { params: { candidate_id: candidateId ?? currentUser()?.id ?? "demo" } }),
      () => {
        const state = getState();
        const user = currentUser();
        return { documents: documentRowsForUser(state, candidateId ?? user?.id ?? "demo") };
      }
    ),
  upload: (id, formData, candidateId, options = {}) =>
    withFallback(
      () => {
        if (!formData.get("candidate_id")) {
          formData.append("candidate_id", candidateId ?? currentUser()?.id ?? "demo");
        }
        return (
        api.post("/api/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          params: { documentId: id },
          onUploadProgress: options.onUploadProgress,
        })
        );
      },
      async () => {
        const state = getState();
        const user = currentUser();
        const userId = candidateId ?? user?.id ?? "demo";
        const file = formData.get("file");
        const filePreviewUrl = await readFilePreview(file);
        const rows = documentRowsForUser(state, userId).map((doc) =>
          doc.id === id
            ? normalizeDocumentRow({
                ...doc,
                status: "uploaded",
                file_name: file?.name ?? "uploaded-file.pdf",
                file_preview_url: filePreviewUrl,
                fileUrl: filePreviewUrl,
                uploaded_at: new Date().toISOString(),
                uploaded_by: currentUser()?.name ?? currentUser()?.full_name ?? "Candidate",
                updated_at: new Date().toISOString(),
                file_size: formatBytes(file?.size),
                content_type: file?.type,
                version: (doc.version || doc.versions?.length || 0) + 1,
                verifiedBy: "",
                verifiedAt: "",
                comments: "",
                rejectionReason: "",
                versions: [
                  ...(doc.versions ?? []),
                  {
                    version: (doc.version || doc.versions?.length || 0) + 1,
                    file_name: file?.name ?? "uploaded-file.pdf",
                    uploaded_at: new Date().toISOString(),
                    uploaded_by: currentUser()?.name ?? currentUser()?.full_name ?? "Candidate",
                    status: "uploaded",
                    file_type: inferFileType(file?.name, file?.type),
                    file_size: formatBytes(file?.size),
                  },
                ],
                auditTrail: [
                  ...(doc.auditTrail ?? []),
                  {
                    id: `${doc.id}-audit-${Date.now()}`,
                    action: doc.file_name ? "Candidate re-uploaded document" : "Candidate uploaded document",
                    actor: currentUser()?.name ?? currentUser()?.full_name ?? "Candidate",
                    at: new Date().toISOString(),
                    note: file?.name ?? "uploaded-file.pdf",
                  },
                ],
              })
            : doc
        );
        state.userDocuments = { ...(state.userDocuments ?? {}), [userId]: rows };
        syncCandidateProgress(state, userId);
        setState(state);
        return { ok: true };
      }
    ),
  remove: (id, candidateId) =>
    withFallback(
      () => api.delete(`/api/documents/${id}`, { params: { candidate_id: candidateId ?? currentUser()?.id ?? "demo" } }),
      () => {
        const state = getState();
        const user = currentUser();
        const userId = candidateId ?? user?.id ?? "demo";
        const rows = documentRowsForUser(state, userId).map((doc) =>
          doc.id === id
            ? {
                ...doc,
                status: "missing",
                file_name: undefined,
                uploaded_at: undefined,
              }
            : doc
        );
        state.userDocuments = { ...(state.userDocuments ?? {}), [userId]: rows };
        syncCandidateProgress(state, userId);
        setState(state);
        return { ok: true };
      }
    ),
};

// Learning
export const learningApi = {
  listModules: (candidateId) => {
    const user = currentUser();
    return withFallback(
      () => api.get("/api/learning/modules", { params: { candidate_id: candidateId ?? user?.id ?? "demo" } }),
      () => ({ modules: modulesFromHrTasks() })
    );
  },
  updateProgress: (data, candidateId) =>
    withFallback(
      () => api.post("/api/learning/progress", { ...data, candidate_id: candidateId ?? currentUser()?.id ?? "demo" }),
      () => {
        const state = getState();
        const user = currentUser();
        const userId = candidateId ?? user?.id ?? "demo";
        state.userModuleProgress = {
          ...(state.userModuleProgress ?? {}),
          [userId]: {
            ...(state.userModuleProgress?.[userId] ?? {}),
            [data.moduleId]: clampPercent(data.progress),
          },
        };
        if (userId === "emp-001") {
          state.modules = state.modules.map((mod) =>
            mod.id === data.moduleId ? { ...mod, progress: clampPercent(data.progress) } : mod
          );
        }
        syncCandidateProgress(state, userId);
        setState(state);
        return { ok: true };
      }
    ),
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

// Notifications
export const notificationApi = {
  list: (params = {}, candidateId) =>
    withFallback(
      () => api.get("/api/notifications", { params: { user_id: candidateId ?? currentUser()?.id ?? "demo", ...params } }),
      () => {
        const user = currentUser();
        const state = getState();
        const stored = (state.notifications ?? [])
          .filter((item) => item.user_id === user?.id)
          .map((item) => ({ type: "hr_announcement", priority: "normal", ...item }));
        const generated = generatedNotificationsFor(state, user).map((item) => ({
          ...item,
          read: Boolean(state.notificationReads?.[item.id]),
        }));
        const notifications = [...stored, ...generated]
          .filter((item) => !params.type || item.type === params.type)
          .filter((item) => !params.unread_only || !item.read)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { notifications };
      }
    ),
  markRead: (id) =>
    withFallback(
      () => api.post(`/api/notifications/${id}/read`),
      () => {
        const state = getState();
        state.notificationReads = { ...(state.notificationReads ?? {}), [id]: true };
        state.notifications = (state.notifications ?? []).map((item) =>
          item.id === id ? { ...item, read: true } : item
        );
        setState(state);
        return { ok: true };
      }
    ),
};

// HR
export const hrApi = {
  listCandidates: (params = {}) =>
    withFallback(
      () => api.get("/api/hr/candidates", { params }),
      () => {
        const state = getState();
        let candidates = (state.candidates ?? []).map(candidateWithDerivedStatus);
        if (params.search) {
          const term = String(params.search).toLowerCase();
          candidates = candidates.filter((candidate) =>
            [
              candidate.name,
              candidate.employee_id,
              candidate.email,
              candidate.department,
              candidate.role,
              candidate.designation,
              candidate.joining_date,
              candidate.location,
              candidate.current_stage,
              candidate.notification_status,
              onboardingStatusLabel(candidate),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term)
          );
        }
        if (params.department) {
          candidates = candidates.filter((candidate) => candidate.department === params.department);
        }
        if (params.location) {
          candidates = candidates.filter((candidate) => candidate.location === params.location);
        }
        if (params.status) {
          candidates = candidates.filter((candidate) => (candidate.current_stage ?? candidate.hr_status) === params.status);
        }
        if (params.joining_window && params.joining_window !== "all") {
          const windows = { today: [0, 0], week: [0, 7], month: [0, 30] };
          const [min, max] = windows[params.joining_window] ?? [-9999, 9999];
          candidates = candidates.filter((candidate) => candidate.joining_days_remaining >= min && candidate.joining_days_remaining <= max);
        }
        const order = params.order === "asc" ? 1 : -1;
        const sortKey = params.sort || "joining_date";
        candidates = [...candidates].sort((a, b) => {
          const left = a[sortKey] ?? "";
          const right = b[sortKey] ?? "";
          if (sortKey === "readiness_score" || sortKey === "document_completion") return ((left || 0) - (right || 0)) * order;
          return String(left).localeCompare(String(right)) * order;
        });
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Number(params.limit) || 25);
        const total = candidates.length;
        const start = (page - 1) * limit;
        return {
          candidates: candidates.slice(start, start + limit),
          pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
        };
      }
    ),
  getAnalytics: () => withFallback(() => api.get("/api/hr/analytics"), analyticsFromState),
  getCandidate: (id) =>
    withFallback(
      () => api.get(`/api/hr/candidates/${id}`),
      () => ({
        candidate: getState().candidates.find((candidate) => candidate.id === id),
        documents: documentRowsForUser(getState(), id),
        modules: getState().modules,
      })
    ),
  documentDownloadUrl: (fileUrl) =>
    fileUrl?.startsWith("http") || fileUrl?.startsWith("data:") || fileUrl?.startsWith("blob:") ? fileUrl : `${BASE_URL}${fileUrl}`,
  getDocumentPreviewUrl: async (fileUrl) => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) return fileUrl;
    const absoluteUrl = fileUrl.startsWith("http") ? fileUrl : `${BASE_URL}${fileUrl}`;
    const request = fileUrl.startsWith("http")
      ? axios.get(absoluteUrl, { responseType: "blob", withCredentials: true })
      : api.get(fileUrl, { responseType: "blob" });
    const response = await request;
    return URL.createObjectURL(response.data);
  },
  reviewDocument: (candidateId, requirementId, data) =>
    withFallback(
      () => api.post(`/api/hr/candidates/${candidateId}/documents/${requirementId}/review`, data),
      () => {
        const state = getState();
        const status = data.status === "rejected" ? "rejected" : "verified";
        const now = new Date().toISOString();
        const reviewer = currentUser()?.name ?? currentUser()?.full_name ?? "HR";
        const rows = documentRowsForUser(state, candidateId).map((doc) =>
          doc.id === requirementId
            ? normalizeDocumentRow({
                ...doc,
                status,
                comments: data.comments || "",
                rejectionReason: status === "rejected" ? data.comments || "Rejected by HR" : "",
                verifiedBy: status === "verified" ? reviewer : "",
                verifiedAt: status === "verified" ? now : "",
                updated_at: now,
                versions: (doc.versions ?? []).map((version, index, versions) =>
                  index === versions.length - 1
                    ? { ...version, status, verified_by: status === "verified" ? reviewer : "", verified_at: status === "verified" ? now : "" }
                    : version
                ),
                auditTrail: [
                  ...(doc.auditTrail ?? []),
                  {
                    id: `${doc.id}-audit-${Date.now()}`,
                    action: status === "verified" ? "HR verified document" : "HR rejected document",
                    actor: reviewer,
                    at: now,
                    note: status === "verified" ? "Verification locked" : data.comments || "Re-upload requested",
                  },
                ],
              }
              )
            : doc
        );
        state.userDocuments = { ...(state.userDocuments ?? {}), [candidateId]: rows };
        state.notifications = [
          ...(state.notifications ?? []),
          {
            id: `notif-doc-${Date.now()}`,
            user_id: candidateId,
            type: "document_approval",
            title: status === "verified" ? "Document verified" : "Document rejected",
            message: status === "verified" ? "One of your uploaded documents was verified by HR." : data.comments || "Please re-upload the rejected document.",
            priority: status === "rejected" ? "high" : "normal",
            read: false,
            created_at: now,
          },
        ];
        syncCandidateProgress(state, candidateId);
        setState(state);
        return { documents: rows };
      }
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
          learning_progress: data.learning_progress ?? 0,
          profile_completion: data.profile_completion ?? 0,
          current_stage: "Registered",
          last_activity: "Candidate added by HR",
          team_assignment: data.team_assignment ?? null,
        };
        state.candidates.push(candidateWithDerivedStatus(candidate));
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
        state.users = state.users.map((user) =>
          user.id === id ? { ...user, ...data } : user
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
  notifyCandidate: (id) =>
    withFallback(
      () => api.post(`/api/hr/candidates/${id}/notify`),
      () => {
        const state = getState();
        const now = new Date().toISOString();
        const candidate = state.candidates.find((item) => item.id === id);
        if (!candidate) return { ok: false };
        const notification = {
          id: `notif-${Date.now()}`,
          user_id: id,
          title: "Joining date reminder",
          message: reminderMessage,
          channel: "in_app",
          read: false,
          created_at: now,
        };
        state.notifications = [...(state.notifications ?? []), notification];
        state.notificationHistory = [
          ...(state.notificationHistory ?? []),
          { id: `hist-${Date.now()}`, candidate_id: id, sent_at: now, channel: "in_app,email", message: reminderMessage },
        ];
        state.candidates = state.candidates.map((item) =>
          item.id === id
            ? candidateWithDerivedStatus({
                ...item,
                last_notified_at: now,
                notification_status: "Notified",
                last_activity: "Reminder sent by HR",
              })
            : item
        );
        setState(state);
        return { ok: true, notification };
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
          file_url: file ? URL.createObjectURL(file) : taskData.file_url,
          link_url: taskData.content_type === "link" ? taskData.link_url || taskData.file_url || "" : taskData.link_url,
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
