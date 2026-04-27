import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member, Loan, Contribution, EMIRecord, AppSettings, Notification, PenaltyRecord, ManualInterestRecord, PaymentRequest } from '../types';
import { generateId, getDefaultPassword, calculateLoanDetails, getMonthKey, getContributionDueDate, calculatePenaltyDays } from '../utils/calculations';

const DEFAULT_MEMBERS: Omit<Member, 'id'>[] = [
  { name: 'ADMIN', mobile: '9315341037', password: '1311', joiningDate: '2025-09-10', isAdmin: true, isActive: true, language: 'hi' },
  { name: 'NISHA', mobile: '9711321568', password: '1568', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'MEENA', mobile: '9289137685', password: '7685', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'REKHA', mobile: '7678253940', password: '3940', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'AMISHA', mobile: '9211984237', password: '4237', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'MADHU', mobile: '7838140223', password: '0223', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'RACHNA', mobile: '8445669184', password: '9184', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'LATESH', mobile: '7017162405', password: '2405', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'SEEMA', mobile: '7525820593', password: '0593', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'SEETA', mobile: '8303972736', password: '2736', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'POONAM', mobile: '9910466049', password: '6049', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'MUSKAN', mobile: '9935593567', password: '3567', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'AVNISH', mobile: '9654784185', password: '4185', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'ASHOK', mobile: '9354276567', password: '6567', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'RAVI ARUMUGAM', mobile: '9711891954', password: '1954', joiningDate: '2025-09-10', isAdmin: false, isActive: true, language: 'en' },
  { name: 'RAMNIWAS', mobile: '9205231995', password: '1995', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'LUCKY', mobile: '9911303276', password: '3276', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'MAHESH', mobile: '8700569722', password: '9722', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'MONI', mobile: '9958422693', password: '2693', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'CHAMAN', mobile: '9911352254', password: '2254', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'INDERJEET', mobile: '8285072541', password: '2541', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'N.P. SINGH', mobile: '9315341038', password: '1038', joiningDate: '2025-09-10', isAdmin: false, isActive: true },
  { name: 'NANDINI', mobile: '8860693105', password: '3105', joiningDate: '2026-02-10', isAdmin: false, isActive: true },
  { name: 'RUPESH', mobile: '9696418043', password: '8043', joiningDate: '2026-01-10', isAdmin: false, isActive: true },
];

const DEFAULT_SETTINGS: AppSettings = {
  upiId: '9315341037@ybl',
  groupName: 'SHG BANK',
  monthlyContribution: 1000,
  maxLoanAmount: 15000,
  interestRate: 2,
  lateFeePerDay: 10,
  dueDate: 11,
};

const REMOVED_MEMBER_MOBILES = new Set(['9654662362', '9990173980']);

const SYNC_STATE_VERSION = 1;
const SHARED_STATE_URL = import.meta.env.VITE_SHARED_STATE_URL?.trim() || '';
const SHARED_STATE_TOKEN = import.meta.env.VITE_SHARED_STATE_TOKEN?.trim() || '';
const SHARED_STATE_METHOD = (import.meta.env.VITE_SHARED_STATE_METHOD?.trim() || 'PUT').toUpperCase();
const SYNC_DEBOUNCE_MS = 600;

// JSONBin.io dedicated sync support
const JSONBIN_BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID?.trim() || '';
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY?.trim() || '';
const JSONBIN_READ_URL = JSONBIN_BIN_ID ? `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest` : '';
const JSONBIN_WRITE_URL = JSONBIN_BIN_ID ? `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}` : '';
const USE_JSONBIN = !!JSONBIN_BIN_ID;

type SyncMethod = 'PUT' | 'POST' | 'PATCH';
const allowedSyncMethods: SyncMethod[] = ['PUT', 'POST', 'PATCH'];
const resolvedSyncMethod: SyncMethod = allowedSyncMethods.includes(SHARED_STATE_METHOD as SyncMethod)
  ? SHARED_STATE_METHOD as SyncMethod
  : 'PUT';

interface AppState {
  // Auth
  currentUserId: string | null;
  lastDataUpdateAt: string;
  
  // Data
  members: Member[];
  loans: Loan[];
  contributions: Contribution[];
  penalties: PenaltyRecord[];
  manualInterests: ManualInterestRecord[];
  notifications: Notification[];
  paymentRequests: PaymentRequest[];
  settings: AppSettings;
  language: 'hi' | 'en' | 'ta';
  
  // Auth actions
  login: (mobile: string, password: string) => Member | null;
  logout: () => void;
  changePassword: (memberId: string, newPassword: string) => void;
  resetMemberPassword: (memberId: string) => void;
  
  // Member actions
  addMember: (name: string, mobile: string, joiningDate: string) => void;
  removeMember: (memberId: string) => void;
  updateMember: (memberId: string, data: Partial<Member>) => void;
  setProfilePhoto: (memberId: string, photo: string) => void;
  
  // Loan actions
  applyForLoan: (memberId: string, amount: number, months: number) => void;
  recallLoan: (loanId: string) => void;
  approveLoan: (loanId: string) => void;
  rejectLoan: (loanId: string) => void;
  forecloseLoan: (loanId: string) => void;
  addOldLoan: (data: { memberId: string; amount: number; openingDate: string; closingDate?: string; includeInterest: boolean; months: number }) => void;
  
  // EMI actions
  addEMIPayment: (loanId: string, emiNumber: number, paidDate: string, applyPenalty: boolean) => void;
  
  // Contribution actions
  addContribution: (memberId: string, month: string, paidDate: string, applyPenalty: boolean) => void;
  addBulkContribution: (month: string, memberIds: string[], paidDate: string, applyPenalty: boolean) => void;
  
  // Manual interest
  addManualInterest: (memberId: string, amount: number, date: string, description: string) => void;
  removeManualInterest: (id: string) => void;
  getMemberManualInterest: (memberId: string) => number;
  
  // Admin edit
  editContribution: (contributionId: string, data: Partial<Contribution>) => void;
  editEMI: (loanId: string, emiId: string, data: Partial<EMIRecord>) => void;

  // Admin delete
  deleteContribution: (contributionId: string) => void;
  deleteEMIPayment: (loanId: string, emiId: string) => void;
  deleteLoan: (loanId: string) => void;
  permanentDeleteMember: (memberId: string) => void;
  
  // Settings
  updateSettings: (data: Partial<AppSettings>) => void;
  setLanguage: (lang: 'hi' | 'en' | 'ta') => void;
  
  // Notifications
  addNotification: (message: string, type: 'broadcast' | 'loan_holder' | 'loan_application', targetMemberId?: string) => void;

  // Payment Requests
  addPaymentRequest: (data: { memberId: string; memberName: string; memberMobile: string; month: string; amount: number; utrNumber: string; paymentDate: string; note?: string }) => void;
  approvePaymentRequest: (id: string) => void;
  rejectPaymentRequest: (id: string) => void;
  
  // CSV Export
  exportMemberCSV: (memberId: string) => string;
  exportMonthlyCSV: (month: string) => string;
  
  // Seed historical contributions
  seedHistoricalContributions: () => void;

  // Computed getters
  getMember: (id: string) => Member | undefined;
  getMemberByMobile: (mobile: string) => Member | undefined;
  getMemberLoans: (memberId: string) => Loan[];
  getMemberContributions: (memberId: string) => Contribution[];
  getMemberTotalContribution: (memberId: string) => number;
  getMemberPenaltyShare: (memberId: string) => number;
  getMemberInterestShare: (memberId: string) => number;
  getMemberTotalEarnings: (memberId: string) => number;
  getMemberGrandTotal: (memberId: string) => number;
  getActiveLoans: () => Loan[];
  getPendingLoans: () => Loan[];
  getTotalCollection: () => number;
  getTotalLoansGiven: () => number;
  getRemainingBalance: () => number;
  getTotalPenaltyCollected: () => number;
  getTotalInterestCollected: () => number;
  getDefaulterNames: () => string[];
  canApplyLoan: (memberId: string) => boolean;
  getMemberMaxLoan: (memberId: string) => number;
  toggleMemberActive: (memberId: string, inactiveDate?: string) => void;
}

type PersistedStateSlice = Pick<
  AppState,
  | 'members'
  | 'loans'
  | 'contributions'
  | 'penalties'
  | 'manualInterests'
  | 'notifications'
  | 'paymentRequests'
  | 'settings'
  | 'lastDataUpdateAt'
>;

interface SharedStateEnvelope {
  version: number;
  updatedAt: string;
  state: PersistedStateSlice;
}

const pickPersistedState = (state: AppState): PersistedStateSlice => ({
  members: state.members,
  loans: state.loans,
  contributions: state.contributions,
  penalties: state.penalties,
  manualInterests: state.manualInterests,
  notifications: state.notifications,
  paymentRequests: state.paymentRequests,
  settings: state.settings,
  lastDataUpdateAt: state.lastDataUpdateAt,
});

const getSyncHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (USE_JSONBIN) {
    if (JSONBIN_API_KEY) headers['X-Master-Key'] = JSONBIN_API_KEY;
  } else if (SHARED_STATE_TOKEN) {
    headers.Authorization = `Bearer ${SHARED_STATE_TOKEN}`;
  }
  return headers;
};

const isCloudSyncEnabled = () => USE_JSONBIN || !!SHARED_STATE_URL;

const parseSharedEnvelope = (payload: unknown): SharedStateEnvelope | null => {
  if (!payload || typeof payload !== 'object') return null;
  if ('state' in (payload as Record<string, unknown>)) {
    const envelope = payload as Partial<SharedStateEnvelope>;
    if (!envelope.state || typeof envelope.state !== 'object') return null;
    return {
      version: typeof envelope.version === 'number' ? envelope.version : SYNC_STATE_VERSION,
      updatedAt: typeof envelope.updatedAt === 'string' ? envelope.updatedAt : '',
      state: envelope.state as PersistedStateSlice,
    };
  }
  return {
    version: SYNC_STATE_VERSION,
    updatedAt: '',
    state: payload as PersistedStateSlice,
  };
};

const fetchSharedState = async (): Promise<SharedStateEnvelope | null> => {
  if (!isCloudSyncEnabled()) return null;
  try {
    const url = USE_JSONBIN ? JSONBIN_READ_URL : SHARED_STATE_URL;
    const response = await fetch(url, {
      method: 'GET',
      headers: getSyncHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json();
    // JSONBin wraps the data inside a "record" key: { record: {...}, metadata: {...} }
    const data =
      USE_JSONBIN && payload && typeof payload === 'object' && 'record' in (payload as Record<string, unknown>)
        ? (payload as { record: unknown }).record
        : payload;
    return parseSharedEnvelope(data);
  } catch {
    return null;
  }
};

const pushSharedState = async (state: AppState): Promise<void> => {
  if (!isCloudSyncEnabled()) return;
  const body: SharedStateEnvelope = {
    version: SYNC_STATE_VERSION,
    updatedAt: state.lastDataUpdateAt,
    state: pickPersistedState(state),
  };
  try {
    const url = USE_JSONBIN ? JSONBIN_WRITE_URL : SHARED_STATE_URL;
    const method = USE_JSONBIN ? 'PUT' : resolvedSyncMethod;
    await fetch(url, {
      method,
      headers: getSyncHeaders(),
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // No-op: local persistence remains primary fallback.
  }
};

export const SHG_STORAGE_KEY = 'shg-bank-storage';

export const useStore = create<AppState>()(
  persist(
    (rawSet, get) => {
      let syncTimer: ReturnType<typeof setTimeout> | null = null;
      let isPushInFlight = false;
      let hasQueuedPush = false;

      const flushSharedPush = async () => {
        if (!isCloudSyncEnabled() || isPushInFlight) return;
        isPushInFlight = true;
        try {
          do {
            hasQueuedPush = false;
            await pushSharedState(get());
          } while (hasQueuedPush);
        } finally {
          isPushInFlight = false;
        }
      };

      const queueSharedPush = () => {
        if (!isCloudSyncEnabled()) return;
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          if (isPushInFlight) {
            hasQueuedPush = true;
            return;
          }
          void flushSharedPush();
        }, SYNC_DEBOUNCE_MS);
      };

      const set: typeof rawSet = (partial, replace) => {
        let hasMutated = false;
        rawSet((previous) => {
          const update = typeof partial === 'function' ? partial(previous) : partial;
          if (update === previous || update === null || update === undefined) return previous;
          hasMutated = true;
          if (replace) return update;
          const patch = update as Partial<AppState>;
          return {
            ...previous,
            ...patch,
            lastDataUpdateAt: patch.lastDataUpdateAt ?? new Date().toISOString(),
          };
        }, replace);
        if (hasMutated) queueSharedPush();
      };

      return {
      currentUserId: null,
      lastDataUpdateAt: new Date().toISOString(),
      members: DEFAULT_MEMBERS.map((m, i) => ({ ...m, id: `member_${i}_${m.mobile}` })),
      loans: [],
      contributions: [],
      penalties: [],
      manualInterests: [],
      notifications: [],
      paymentRequests: [],
      settings: DEFAULT_SETTINGS,
      language: 'hi',

      login: (mobile, password) => {
        const member = get().members.find(m => m.mobile === mobile && m.password === password);
        if (member) {
          rawSet({ currentUserId: member.id });
          return member;
        }
        return null;
      },

      logout: () => rawSet({ currentUserId: null }),

      changePassword: (memberId, newPassword) => {
        set(s => ({
          members: s.members.map(m => m.id === memberId ? { ...m, password: newPassword } : m),
        }));
      },

      resetMemberPassword: (memberId) => {
        const member = get().members.find(m => m.id === memberId);
        if (member) {
          get().changePassword(memberId, getDefaultPassword(member.mobile));
        }
      },

      addMember: (name, mobile, joiningDate) => {
        const newMember: Member = {
          id: generateId(),
          name,
          mobile,
          password: getDefaultPassword(mobile),
          joiningDate,
          isAdmin: false,
          isActive: true,
        };
        set(s => ({ members: [...s.members, newMember] }));
      },

      removeMember: (memberId) => {
        const today = new Date().toISOString().split('T')[0];
        set(s => ({
          members: s.members.map(m => m.id === memberId ? { ...m, isActive: false, inactiveDate: m.isActive ? today : m.inactiveDate } : m),
        }));
      },

      updateMember: (memberId, data) => {
        set(s => ({
          members: s.members.map(m => m.id === memberId ? { ...m, ...data } : m),
        }));
      },

      setProfilePhoto: (memberId, photo) => {
        set(s => ({
          members: s.members.map(m => m.id === memberId ? { ...m, profilePhoto: photo } : m),
        }));
      },

      applyForLoan: (memberId, amount, months) => {
        const member = get().members.find(m => m.id === memberId);
        if (!member) return;
        const details = calculateLoanDetails(amount, months);
        const now = new Date();
        const closingDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
        const loan: Loan = {
          id: generateId(),
          memberId,
          memberName: member.name,
          amount,
          interestRate: 2,
          months,
          totalInterest: details.totalInterest,
          totalPayable: details.totalPayable,
          emiAmount: details.emi,
          remainingAmount: details.totalPayable,
          openingDate: now.toISOString(),
          closingDate: closingDate.toISOString(),
          nextEmiDate: new Date(now.getFullYear(), now.getMonth() + 1, 11).toISOString(),
          status: 'pending',
          includeInterest: true,
          isOldLoan: false,
          emiHistory: details.breakdown.map((b, i) => ({
            id: generateId(),
            loanId: '',
            memberId,
            emiNumber: i + 1,
            amount: b.amount,
            interestComponent: b.interest,
            principalComponent: b.principal,
            dueDate: new Date(now.getFullYear(), now.getMonth() + i, 11).toISOString(),
            penalty: 0,
            status: 'pending' as const,
            approvedByMember: false,
          })),
        };
        loan.emiHistory = loan.emiHistory.map(e => ({ ...e, loanId: loan.id }));
        set(s => ({ loans: [...s.loans, loan] }));
        get().addNotification(
          `ऋण आवेदन: ${member.name} ने ₹${amount} (${months} माह) के लिए आवेदन किया`,
          'loan_application'
        );
      },

      recallLoan: (loanId) => {
        set(s => ({
          loans: s.loans.map(l => l.id === loanId ? { ...l, status: 'recalled' as const } : l),
        }));
      },

      approveLoan: (loanId) => {
        set(s => ({
          loans: s.loans.map(l => l.id === loanId ? { ...l, status: 'active' as const } : l),
        }));
      },

      rejectLoan: (loanId) => {
        set(s => ({
          loans: s.loans.map(l => l.id === loanId ? { ...l, status: 'rejected' as const } : l),
        }));
      },

      forecloseLoan: (loanId) => {
        const today = new Date().toISOString().split('T')[0];
        set(s => ({
          loans: s.loans.map(l => l.id === loanId ? {
            ...l,
            status: 'completed' as const,
            closingDate: today,
            remainingAmount: 0,
            emiHistory: l.emiHistory.map(e => e.status === 'pending' ? { ...e, status: 'paid' as const } : e),
          } : l),
        }));
      },

      addOldLoan: ({ memberId, amount, openingDate, closingDate = '', includeInterest, months }) => {
        const member = get().members.find(m => m.id === memberId);
        if (!member) return;
        const rate = includeInterest ? 0.02 : 0;
        const details = calculateLoanDetails(amount, months, rate);
        const isClosed = !!closingDate;
        const loan: Loan = {
          id: generateId(),
          memberId,
          memberName: member.name,
          amount,
          interestRate: includeInterest ? 2 : 0,
          months,
          totalInterest: includeInterest ? details.totalInterest : 0,
          totalPayable: details.totalPayable,
          emiAmount: details.emi,
          remainingAmount: isClosed ? 0 : details.totalPayable,
          openingDate,
          closingDate: closingDate || '',
          nextEmiDate: new Date(new Date(openingDate).getFullYear(), new Date(openingDate).getMonth() + 1, 11).toISOString(),
          status: isClosed ? 'completed' : 'active',
          includeInterest,
          isOldLoan: true,
          emiHistory: details.breakdown.map((b, i) => {
            const emiDate = new Date(new Date(openingDate).getFullYear(), new Date(openingDate).getMonth() + i, 11);
            return {
              id: generateId(),
              loanId: '',
              memberId,
              emiNumber: i + 1,
              amount: b.amount,
              interestComponent: b.interest,
              principalComponent: b.principal,
              dueDate: emiDate.toISOString(),
              penalty: 0,
              status: 'pending' as const,
              approvedByMember: false,
            };
          }),
        };
        loan.emiHistory = loan.emiHistory.map(e => ({ ...e, loanId: loan.id }));
        set(s => ({ loans: [...s.loans, loan] }));
      },

      addEMIPayment: (loanId, emiNumber, paidDate, applyPenalty) => {
        set(s => {
          const loan = s.loans.find(l => l.id === loanId);
          if (!loan) return s;
          const emi = loan.emiHistory.find(e => e.emiNumber === emiNumber);
          if (!emi || emi.status === 'paid') return s;
          
          let penalty = 0;
          if (applyPenalty) {
            const daysLate = calculatePenaltyDays(emi.dueDate);
            if (daysLate > 0) {
              penalty = daysLate * s.settings.lateFeePerDay;
            }
          }

          const penaltyRecord: PenaltyRecord = penalty > 0 ? {
            id: generateId(),
            memberId: loan.memberId,
            type: 'emi',
            referenceId: emi.id,
            amount: penalty,
            date: paidDate,
            daysLate: Math.ceil(penalty / s.settings.lateFeePerDay),
          } : null as any;

          return {
            loans: s.loans.map(l => {
              if (l.id !== loanId) return l;
              return {
                ...l,
                remainingAmount: Math.max(0, l.remainingAmount - emi.amount),
                emiHistory: l.emiHistory.map(e =>
                  e.emiNumber === emiNumber
                    ? { ...e, status: 'paid' as const, paidDate, penalty, approvedByMember: true }
                    : e
                ),
                status: l.emiHistory.every(e => e.emiNumber === emiNumber ? true : e.status === 'paid') && l.emiHistory.filter(e => e.emiNumber === emiNumber || e.status === 'paid').length === l.months
                  ? 'completed' as const
                  : l.status,
              };
            }),
            penalties: penaltyRecord ? [...s.penalties, penaltyRecord] : s.penalties,
          };
        });
      },

      addContribution: (memberId, month, paidDate, applyPenalty) => {
        const member = get().members.find(m => m.id === memberId);
        if (!member) return;
        const dueDate = getContributionDueDate(month);
        const existing = get().contributions.find(c => c.memberId === memberId && c.month === month);
        if (existing) return;

        let penalty = 0;
        if (applyPenalty) {
          const daysLate = calculatePenaltyDays(dueDate);
          if (daysLate > 0) penalty = daysLate * get().settings.lateFeePerDay;
        }

        const penaltyRecord: PenaltyRecord = penalty > 0 ? {
          id: generateId(),
          memberId,
          type: 'contribution',
          referenceId: '',
          amount: penalty,
          date: paidDate,
          daysLate: Math.ceil(penalty / get().settings.lateFeePerDay),
        } : null as any;

        const contribution: Contribution = {
          id: generateId(),
          memberId,
          memberName: member.name,
          amount: get().settings.monthlyContribution,
          month,
          dueDate,
          paidDate,
          penalty,
          status: 'paid',
          approvedByMember: true,
        };

        set(s => ({
          contributions: [...s.contributions, contribution],
          penalties: penaltyRecord ? [...s.penalties, penaltyRecord] : s.penalties,
        }));
      },

      addBulkContribution: (month, memberIds, paidDate, applyPenalty) => {
        memberIds.forEach(memberId => {
          get().addContribution(memberId, month, paidDate, applyPenalty);
        });
      },

      addManualInterest: (memberId, amount, date, description) => {
        const member = get().members.find(m => m.id === memberId);
        if (!member || amount <= 0) return;
        const record: ManualInterestRecord = {
          id: generateId(),
          memberId,
          memberName: member.name,
          amount,
          date,
          description,
        };
        set(s => ({ manualInterests: [...s.manualInterests, record] }));
      },

      removeManualInterest: (id) => {
        set(s => ({ manualInterests: s.manualInterests.filter(m => m.id !== id) }));
      },

      getMemberManualInterest: (memberId) => {
        return get().manualInterests
          .filter(m => m.memberId === memberId)
          .reduce((sum, m) => sum + m.amount, 0);
      },

      editContribution: (contributionId, data) => {
        set(s => ({
          contributions: s.contributions.map(c => c.id === contributionId ? { ...c, ...data } : c),
        }));
      },

      editEMI: (loanId, emiId, data) => {
        set(s => ({
          loans: s.loans.map(l => {
            if (l.id !== loanId) return l;
            return {
              ...l,
              emiHistory: l.emiHistory.map(e => e.id === emiId ? { ...e, ...data } : e),
            };
          }),
        }));
      },

      deleteContribution: (contributionId) => {
        set(s => ({
          contributions: s.contributions.filter(c => c.id !== contributionId),
          penalties: s.penalties.filter(p => {
            const contrib = s.contributions.find(c => c.id === contributionId);
            return contrib ? p.referenceId !== contributionId : true;
          }),
        }));
      },

      deleteEMIPayment: (loanId, emiId) => {
        set(s => {
          const loan = s.loans.find(l => l.id === loanId);
          if (!loan) return s;
          const emi = loan.emiHistory.find(e => e.id === emiId);
          if (!emi) return s;

          const wasPaid = emi.status === 'paid';
          const penaltyRefunded = emi.penalty || 0;

          return {
            loans: s.loans.map(l => {
              if (l.id !== loanId) return l;
              const statusChanged = wasPaid ? 'active' as const : l.status;
              return {
                ...l,
                status: statusChanged,
                remainingAmount: Math.min(l.remainingAmount + (wasPaid ? emi.amount : 0), l.totalPayable),
                emiHistory: l.emiHistory.map(e =>
                  e.id === emiId
                    ? { ...e, status: 'pending' as const, paidDate: undefined, penalty: 0, approvedByMember: false }
                    : e
                ),
              };
            }),
            penalties: penaltyRefunded > 0
              ? s.penalties.filter(p => p.referenceId !== emiId)
              : s.penalties,
          };
        });
      },

      deleteLoan: (loanId) => {
        set(s => ({
          loans: s.loans.filter(l => l.id !== loanId),
        }));
      },

      permanentDeleteMember: (memberId) => {
        const member = get().getMember(memberId);
        if (!member || member.isAdmin) return;
        // Remove member and ALL their associated data
        // Interest/penalty sharing automatically re-distributes proportionally
        // because the ratio formula is (memberContrib / totalContribs) — removing
        // the member reduces both numerator and denominator for remaining members.
        set(s => ({
          members: s.members.filter(m => m.id !== memberId),
          loans: s.loans.filter(l => l.memberId !== memberId),
          contributions: s.contributions.filter(c => c.memberId !== memberId),
          penalties: s.penalties.filter(p => p.memberId !== memberId),
          manualInterests: s.manualInterests.filter(i => i.memberId !== memberId),
          notifications: s.notifications.filter(n => !n.targetMemberId || n.targetMemberId !== memberId),
          paymentRequests: s.paymentRequests.filter(r => r.memberId !== memberId),
        }));
      },

      updateSettings: (data) => {
        set(s => ({ settings: { ...s.settings, ...data } }));
      },

      setLanguage: (lang) => rawSet({ language: lang }),

      addNotification: (message, type, targetMemberId) => {
        const notification: Notification = {
          id: generateId(),
          message,
          date: new Date().toISOString(),
          type,
          targetMemberId,
        };
        set(s => ({ notifications: [...s.notifications, notification] }));
      },

      addPaymentRequest: (data) => {
        const req: PaymentRequest = {
          id: generateId(),
          memberId: data.memberId,
          memberName: data.memberName,
          memberMobile: data.memberMobile,
          month: data.month,
          amount: data.amount,
          utrNumber: data.utrNumber,
          paymentDate: data.paymentDate,
          note: data.note,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        set(s => ({ paymentRequests: [...s.paymentRequests, req] }));
      },

      approvePaymentRequest: (id) => {
        const req = get().paymentRequests.find(r => r.id === id);
        if (!req || req.status !== 'pending') return;
        get().addContribution(req.memberId, req.month, req.paymentDate, false);
        set(s => ({
          paymentRequests: s.paymentRequests.map(r =>
            r.id === id ? { ...r, status: 'approved' as const } : r
          ),
        }));
      },

      rejectPaymentRequest: (id) => {
        set(s => ({
          paymentRequests: s.paymentRequests.map(r =>
            r.id === id ? { ...r, status: 'rejected' as const } : r
          ),
        }));
      },

      exportMemberCSV: (memberId) => {
        const member = get().getMember(memberId);
        const loans = get().getMemberLoans(memberId);
        const contributions = get().getMemberContributions(memberId);
        const totalContrib = get().getMemberTotalContribution(memberId);
        const penaltyShare = get().getMemberPenaltyShare(memberId);
        const interestShare = get().getMemberInterestShare(memberId);
        const grandTotal = totalContrib + penaltyShare + interestShare;
        if (!member) return '';
        let csv = `SHG BANK - Member Report\n`;
        csv += `Name,${member.name}\nMobile,${member.mobile}\nJoining Date,${member.joiningDate}\n`;
        csv += `\n--- Summary ---\n`;
        csv += `Total Contribution,${totalContrib}\nPenalty Earnings,${penaltyShare}\nInterest Earnings,${interestShare}\nGrand Total,${grandTotal}\n`;

        // Monthly ROI Breakdown
        csv += `\n--- Monthly ROI (Earnings Breakdown) ---\n`;
        csv += `Month,Total Fund (Till Date),Interest Earned,Penalty Earned,Total Earnings,Cumulative Earnings\n`;

        // Get all months from joining date to now
        const joiningDate = new Date(member.joiningDate);
        const now = new Date();
        const allMonths: string[] = [];
        const cursor = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
        while (cursor <= now) {
          allMonths.push(getMonthKey(cursor));
          cursor.setMonth(cursor.getMonth() + 1);
        }

        // Get member's contribution ratio for each month (based on cumulative contribution till that month)
        const allNonAdminMembers = get().members.filter(m => m.isActive && !m.isAdmin);
        let cumulativeEarnings = 0;

        allMonths.forEach(monthKey => {
          // Member's cumulative contribution till this month
          const memberContribTillMonth = get().contributions
            .filter(c => c.memberId === memberId && c.status === 'paid' && c.month <= monthKey)
            .reduce((sum, c) => sum + c.amount, 0);

          // Total contributions by all active members till this month
          const totalContribsTillMonth = allNonAdminMembers.reduce((sum, m) => {
            return sum + get().contributions
              .filter(c => c.memberId === m.id && c.status === 'paid' && c.month <= monthKey)
              .reduce((s, c) => s + c.amount, 0);
          }, 0);

          // Interest earned this month (from paid EMIs this month)
          const monthStart = monthKey + '-01';
          const [y, m] = monthKey.split('-').map(Number);
          const monthEnd = new Date(y, m, 0).toISOString().split('T')[0];
          const interestThisMonth = get().loans
            .filter(l => l.status !== 'recalled' && l.status !== 'rejected' && l.status !== 'pending' && l.openingDate >= member.joiningDate)
            .reduce((sum, l) => {
              return sum + l.emiHistory
                .filter(e => e.status === 'paid' && e.paidDate && e.paidDate >= monthStart && e.paidDate <= monthEnd)
                .reduce((s, e) => s + (e.interestComponent || 0), 0);
            }, 0);

          // Penalty earned this month
          const penaltyThisMonth = get().penalties
            .filter(p => p.date >= monthStart && p.date <= monthEnd && p.date >= member.joiningDate)
            .reduce((sum, p) => sum + p.amount, 0);

          // Member's share ratio
          const ratio = totalContribsTillMonth > 0 ? memberContribTillMonth / totalContribsTillMonth : 0;
          const memberInterestThisMonth = Math.round(interestThisMonth * ratio * 100) / 100;
          const memberPenaltyThisMonth = Math.round(penaltyThisMonth * ratio * 100) / 100;
          const totalEarningsThisMonth = Math.round((memberInterestThisMonth + memberPenaltyThisMonth) * 100) / 100;
          cumulativeEarnings = Math.round((cumulativeEarnings + totalEarningsThisMonth) * 100) / 100;

          if (totalEarningsThisMonth > 0 || memberContribTillMonth > 0) {
            csv += `${monthKey},${memberContribTillMonth},${memberInterestThisMonth},${memberPenaltyThisMonth},${totalEarningsThisMonth},${cumulativeEarnings}\n`;
          }
        });

        csv += `\n--- Contributions ---\nMonth,Amount,Status,Penalty,Paid Date\n`;
        contributions.forEach(c => {
          csv += `${c.month},${c.amount},${c.status},${c.penalty || 0},${c.paidDate || ''}\n`;
        });
        csv += `\n--- Loans ---\nLoan ID,Amount,Months,Interest,Total,Status,Opening Date\n`;
        loans.forEach(l => {
          csv += `${l.id},${l.amount},${l.months},${l.totalInterest},${l.totalPayable},${l.status},${l.openingDate}\n`;
        });
        return csv;
      },

      exportMonthlyCSV: (month) => {
        const contributions = get().contributions.filter(c => c.month === month);
        const [y, m] = month.split('-').map(Number);
        const monthStart = `${month}-01`;
        const monthEnd = new Date(y, m, 0).toISOString().split('T')[0];

        // Interest earned this month (from paid EMIs)
        const interestThisMonth = get().loans
          .filter(l => l.status === 'active' || l.status === 'completed')
          .reduce((sum, l) => {
            return sum + l.emiHistory
              .filter(e => e.status === 'paid' && e.paidDate && e.paidDate >= monthStart && e.paidDate <= monthEnd)
              .reduce((s, e) => s + (e.interestComponent || 0), 0);
          }, 0);

        // Penalty earned this month
        const penaltyThisMonth = get().penalties
          .filter(p => p.date >= monthStart && p.date <= monthEnd)
          .reduce((sum, p) => sum + p.amount, 0);

        // Manual interest this month
        const manualInterestThisMonth = get().manualInterests
          .filter(mi => mi.date >= monthStart && mi.date <= monthEnd)
          .reduce((sum, mi) => sum + mi.amount, 0);

        const totalROI = interestThisMonth + penaltyThisMonth + manualInterestThisMonth;

        let csv = `SHG BANK - Monthly Report - ${month}\n\n`;

        // ROI Summary
        csv += `--- Monthly ROI Summary ---\n`;
        csv += `Interest from Loans,${interestThisMonth}\n`;
        csv += `Penalty Collected,${penaltyThisMonth}\n`;
        csv += `Manual Interest,${manualInterestThisMonth}\n`;
        csv += `Total Earnings This Month,${totalROI}\n\n`;

        // Per-member share breakdown
        csv += `--- Member-wise ROI Share ---\n`;
        csv += `Name,Mobile,Contribution,Till Date Fund,ROI Share (Interest),ROI Share (Penalty),Total ROI Share,Cumulative Total\n`;

        const allNonAdminMembers = get().members.filter(mb => mb.isActive && !mb.isAdmin);
        allNonAdminMembers.forEach(mb => {
          const memberContrib = get().getMemberTotalContribution(mb.id);
          const contribTillMonth = get().contributions
            .filter(c => c.memberId === mb.id && c.status === 'paid' && c.month <= month)
            .reduce((sum, c) => sum + c.amount, 0);
          const totalContribsTillMonth = allNonAdminMembers.reduce((sum, mb2) => {
            return sum + get().contributions
              .filter(c => c.memberId === mb2.id && c.status === 'paid' && c.month <= month)
              .reduce((s, c) => s + c.amount, 0);
          }, 0);
          const ratio = totalContribsTillMonth > 0 ? contribTillMonth / totalContribsTillMonth : 0;
          const interestShare = Math.round(interestThisMonth * ratio * 100) / 100;
          const penaltyShare = Math.round(penaltyThisMonth * ratio * 100) / 100;
          const totalShare = Math.round((interestShare + penaltyShare + (mb.id ? 0 : 0)) * 100) / 100;
          const memberTotalEarnings = get().getMemberPenaltyShare(mb.id) + get().getMemberInterestShare(mb.id);

          csv += `${mb.name},${mb.mobile},${contribTillMonth},${memberContrib},${interestShare},${penaltyShare},${totalShare},${memberTotalEarnings}\n`;
        });

        // Contributions detail
        csv += `\n--- Contributions ---\n`;
        csv += `Name,Mobile,Amount,Status,Penalty,Paid Date\n`;
        contributions.forEach(c => {
          csv += `${c.memberName},${c.memberId},${c.amount},${c.status},${c.penalty},${c.paidDate || ''}\n`;
        });

        return csv;
      },

      // Computed getters
      getMember: (id) => get().members.find(m => m.id === id),
      getMemberByMobile: (mobile) => get().members.find(m => m.mobile === mobile),
      getMemberLoans: (memberId) => get().loans.filter(l => l.memberId === memberId),
      getMemberContributions: (memberId) => get().contributions.filter(c => c.memberId === memberId),
      
      getMemberTotalContribution: (memberId) => {
        return get().contributions
          .filter(c => c.memberId === memberId && c.status === 'paid')
          .reduce((sum, c) => sum + c.amount, 0);
      },

      getMemberPenaltyShare: (memberId) => {
        const member = get().getMember(memberId);
        if (!member) return 0;
        const allNonAdminMembers = get().members.filter(m => m.isActive && !m.isAdmin);
        const totalContribs = allNonAdminMembers.reduce((sum, m) => sum + get().getMemberTotalContribution(m.id), 0);
        const avgContrib = allNonAdminMembers.length > 0 ? totalContribs / allNonAdminMembers.length : 0;
        // Admin gets equal share using average member contribution
        const memberContrib = member.isAdmin ? avgContrib : get().getMemberTotalContribution(memberId);
        const effectiveTotal = member.isAdmin ? (totalContribs + avgContrib) : totalContribs;
        if (effectiveTotal === 0) return 0;

        // Only penalties after member's joining date
        const joiningDate = new Date(member.joiningDate);
        const relevantPenalties = get().penalties.filter(p => new Date(p.date) >= joiningDate);
        const totalPenalty = relevantPenalties.reduce((sum, p) => sum + p.amount, 0);
        return Math.round((memberContrib / effectiveTotal) * totalPenalty * 100) / 100;
      },

      getMemberInterestShare: (memberId) => {
        const member = get().getMember(memberId);
        if (!member) return 0;
        const allNonAdminMembers = get().members.filter(m => m.isActive && !m.isAdmin);
        const totalContribs = allNonAdminMembers.reduce((sum, m) => sum + get().getMemberTotalContribution(m.id), 0);
        const avgContrib = allNonAdminMembers.length > 0 ? totalContribs / allNonAdminMembers.length : 0;
        // Admin gets equal share using average member contribution
        const memberContrib = member.isAdmin ? avgContrib : get().getMemberTotalContribution(memberId);
        const effectiveTotal = member.isAdmin ? (totalContribs + avgContrib) : totalContribs;
        if (effectiveTotal === 0) return 0;

        // Only interest from loans given after member's joining date
        const joiningDate = new Date(member.joiningDate);
        const relevantLoans = get().loans.filter(l => l.status !== 'recalled' && l.status !== 'rejected' && l.status !== 'pending' && new Date(l.openingDate) >= joiningDate);
        const totalInterest = relevantLoans.reduce((sum, l) => sum + l.totalInterest, 0);
        const calculatedShare = Math.round((memberContrib / effectiveTotal) * totalInterest * 100) / 100;

        // Add manual interest for this member
        const manualInterest = member.isAdmin ? 0 : get().getMemberManualInterest(memberId);

        return Math.round((calculatedShare + manualInterest) * 100) / 100;
      },

      getMemberTotalEarnings: (memberId) => {
        return get().getMemberPenaltyShare(memberId) + get().getMemberInterestShare(memberId);
      },

      getMemberGrandTotal: (memberId) => {
        return get().getMemberTotalContribution(memberId) + get().getMemberTotalEarnings(memberId);
      },

      getActiveLoans: () => get().loans.filter(l => l.status === 'active'),
      getPendingLoans: () => get().loans.filter(l => l.status === 'pending'),
      getTotalCollection: () => {
        return get().contributions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
      },
      getTotalLoansGiven: () => {
        return get().loans
          .filter(l => l.status === 'active' || l.status === 'completed')
          .reduce((sum, l) => sum + l.amount, 0);
      },
      getRemainingBalance: () => {
        const collection = get().getTotalCollection();
        const loansGiven = get().getTotalLoansGiven();
        return collection - loansGiven;
      },
      getTotalPenaltyCollected: () => {
        return get().penalties.reduce((sum, p) => sum + p.amount, 0);
      },
      getTotalInterestCollected: () => {
        const loanInterest = get().loans
          .filter(l => l.status === 'active' || l.status === 'completed')
          .reduce((sum, l) => sum + l.totalInterest, 0);
        const manualInterest = get().manualInterests.reduce((sum, m) => sum + m.amount, 0);
        return loanInterest + manualInterest;
      },
      getDefaulterNames: () => {
        const now = new Date();
        const currentMonth = getMonthKey(now);
        const contributions = get().contributions;
        return get().members
          .filter(m => m.isActive && !m.isAdmin)
          .filter(m => {
            // Check if any past contribution is unpaid
            const memberContribs = contributions.filter(c => c.memberId === m.id);
            return memberContribs.some(c => c.month < currentMonth && c.status !== 'paid');
          })
          .map(m => m.name);
      },
      seedHistoricalContributions: () => {
        const allMonths = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
        const excludeNames = ['ADMIN'];
        const eligibleMembers = get().members.filter(m => !m.isAdmin && m.isActive && !excludeNames.includes(m.name));

        // Member-specific month overrides (joining date logic)
        const memberMonthOverrides: Record<string, string[]> = {
          'NANDINI': ['2026-02', '2026-03'],
          'RUPESH': ['2026-01', '2026-02', '2026-03'],
        };

        const newContributions: Contribution[] = [];
        const existingKeys = new Set(get().contributions.map(c => `${c.memberId}_${c.month}`));

        eligibleMembers.forEach(member => {
          const months = memberMonthOverrides[member.name] || allMonths;
          months.forEach(month => {
            const key = `${member.id}_${month}`;
            if (existingKeys.has(key)) return;
            const [y, m] = month.split('-').map(Number);
            const paidDate = new Date(y, m - 1, 10).toISOString();
            newContributions.push({
              id: generateId(),
              memberId: member.id,
              memberName: member.name,
              amount: get().settings.monthlyContribution,
              month,
              dueDate: new Date(y, m - 1, 11).toISOString(),
              paidDate,
              penalty: 0,
              status: 'paid',
              approvedByMember: true,
            });
          });
        });

        if (newContributions.length > 0) {
          set(s => ({ contributions: [...s.contributions, ...newContributions] }));
        }
      },

      canApplyLoan: (memberId) => {
        const member = get().getMember(memberId);
        if (!member) return false;
        const activeLoans = get().loans.filter(l => l.memberId === memberId && (l.status === 'active' || l.status === 'pending'));
        if (activeLoans.length > 0) {
          const eligible = activeLoans.every(l => {
            const paidEmis = l.emiHistory.filter(e => e.status === 'paid').length;
            return paidEmis >= Math.ceil(l.months / 2);
          });
          if (!eligible) return false;
        }
        return true;
      },

      getMemberMaxLoan: (memberId) => {
        const member = get().getMember(memberId);
        if (!member) return 0;
        const settings = get().settings;
        if (member.isActive || member.isAdmin) return settings.maxLoanAmount;
        // Inactive member: max loan = total contribution - active loan remaining
        const totalContrib = get().getMemberTotalContribution(memberId);
        const activeLoanRemaining = get().loans
          .filter(l => l.memberId === memberId && (l.status === 'active' || l.status === 'pending'))
          .reduce((sum, l) => sum + l.remainingAmount, 0);
        return Math.max(0, totalContrib - activeLoanRemaining);
      },

      toggleMemberActive: (memberId, inactiveDate) => {
        const member = get().getMember(memberId);
        if (!member || member.isAdmin) return;
        const nowDeactivating = member.isActive; // going from active → inactive
        set((state) => ({
          members: state.members.map(m =>
            m.id === memberId ? { ...m, isActive: !m.isActive, inactiveDate: nowDeactivating ? (inactiveDate || new Date().toISOString().split('T')[0]) : undefined } : m
          ),
        }));
      },
      };
    },
    {
      name: SHG_STORAGE_KEY,
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<typeof current>) };
        const removedMemberIds = new Set(
          state.members
            .filter(m => REMOVED_MEMBER_MOBILES.has(m.mobile))
            .map(m => m.id)
        );
        if (removedMemberIds.size > 0) {
          state.members = state.members.filter(m => !removedMemberIds.has(m.id));
          state.loans = state.loans.filter(l => !removedMemberIds.has(l.memberId));
          state.contributions = state.contributions.filter(c => !removedMemberIds.has(c.memberId));
          state.penalties = state.penalties.filter(p => !removedMemberIds.has(p.memberId));
          state.manualInterests = state.manualInterests.filter(i => !removedMemberIds.has(i.memberId));
          state.notifications = state.notifications.filter(n => !n.targetMemberId || !removedMemberIds.has(n.targetMemberId));
        }
        // Auto-recover POONAM if deleted
        if (!state.members.find(m => m.name === 'POONAM' && m.mobile === '9910466049')) {
          const existingPoonam = state.members.find(m => m.name === 'POONAM');
          if (!existingPoonam) {
            const recoveredPoonam: Member = {
              id: generateId(),
              name: 'POONAM',
              mobile: '9910466049',
              password: '6049',
              joiningDate: '2025-09-10',
              isAdmin: false,
              isActive: true,
            };
            state.members = [...state.members, recoveredPoonam];
          }
        } else {
          // POONAM exists but might be inactive — recover her
          state.members = state.members.map(m =>
            m.name === 'POONAM' && m.mobile === '9910466049' && !m.isActive
              ? { ...m, isActive: true, inactiveDate: undefined }
              : m
          );
        }
        return state;
      },
    }
  )
);

const asTimestamp = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const hydrateFromSharedState = async () => {
  if (!isCloudSyncEnabled()) return;
  const remote = await fetchSharedState();
  if (!remote?.state) return;

  const local = useStore.getState();
  const remoteTimestamp = asTimestamp(remote.state.lastDataUpdateAt ?? remote.updatedAt);
  const localTimestamp = asTimestamp(local.lastDataUpdateAt);

  if (remoteTimestamp <= localTimestamp) {
    if (remoteTimestamp === 0 && localTimestamp > 0) {
      await pushSharedState(local);
    }
    return;
  }

  useStore.setState({
    ...remote.state,
    currentUserId: local.currentUserId,
    language: local.language,
    lastDataUpdateAt: remote.state.lastDataUpdateAt ?? remote.updatedAt,
  });
};

if (typeof window !== 'undefined' && !(window as Window & { __shgSyncInit?: boolean }).__shgSyncInit) {
  (window as Window & { __shgSyncInit?: boolean }).__shgSyncInit = true;

  void hydrateFromSharedState();

  // Poll every 30 seconds so members see admin updates without reloading
  setInterval(() => void hydrateFromSharedState(), 30_000);

  // Also sync immediately when the user switches back to this tab / app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void hydrateFromSharedState();
  });
}

// Immediately pushes local state to remote, then pulls to apply any even-newer remote state.
// Use this when the user explicitly requests a sync (e.g. refresh button) to guarantee the
// latest admin changes are flushed even if the background debounce push is still pending.
const forceSyncWithRemote = async () => {
  if (!isCloudSyncEnabled()) return;
  await pushSharedState(useStore.getState());
  await hydrateFromSharedState();
};

export { hydrateFromSharedState, forceSyncWithRemote };
