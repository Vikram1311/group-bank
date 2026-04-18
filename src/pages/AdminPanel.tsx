import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, formatDate, generateId, getMonthKey, getContributionDueDate, calculatePenaltyDays } from '../utils/calculations';
import { calculateLoanDetails } from '../utils/calculations';
import {
  Users, IndianRupee, TrendingUp, Wallet, LogOut, Plus, Trash2, Edit3, Download,
  Send, Settings, Eye, CheckCircle, XCircle, Banknote,
  AlertTriangle, CreditCard, FileText, Bell, UserPlus
} from 'lucide-react';

type AdminTab = 'dashboard' | 'members' | 'loans' | 'contributions' | 'messages' | 'settings';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02]">
      <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-2 shadow-lg`}>
        {icon}
      </div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-white font-bold text-xl mt-1">{formatCurrency(value)}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-md max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showAddOldLoan, setShowAddOldLoan] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showInterestHistory, setShowInterestHistory] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showEditMember, setShowEditMember] = useState<string | null>(null);
  const [showInactiveModal, setShowInactiveModal] = useState<string | null>(null);
  const [inactiveDate, setInactiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEMIDetail, setShowEMIDetail] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [messageText, setMessageText] = useState('');
  const [messageSendFeedback, setMessageSendFeedback] = useState('');
  const [messageType, setMessageType] = useState<'broadcast' | 'loan_holder'>('broadcast');
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newJoiningDate, setNewJoiningDate] = useState('');
  const [contribMemberId, setContribMemberId] = useState('');
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [contribPenalty, setContribPenalty] = useState(false);
  const [bulkContribDate, setBulkContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkPenalty, setBulkPenalty] = useState(false);
  const [bulkSelectedMembers, setBulkSelectedMembers] = useState<string[]>([]);
  const [oldLoanMember, setOldLoanMember] = useState('');
  const [oldLoanAmount, setOldLoanAmount] = useState('');
  const [oldLoanOpening, setOldLoanOpening] = useState('');
  const [oldLoanClosing, setOldLoanClosing] = useState('');
  const [oldLoanIncludeInterest, setOldLoanIncludeInterest] = useState(true);
  const [oldLoanMonths, setOldLoanMonths] = useState('6');
  const [interestMember, setInterestMember] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [interestDate, setInterestDate] = useState('');
  const [interestDesc, setInterestDesc] = useState('');
  const [emiLoanId, setEmiLoanId] = useState('');
  const [emiPaidDate, setEmiPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [emiPenalty, setEmiPenalty] = useState(false);
  const [showAddEMI, setShowAddEMI] = useState(false);
  const [showEditContribution, setShowEditContribution] = useState<string | null>(null);
  const [showEditEMI, setShowEditEMI] = useState<{ loanId: string; emiId: string } | null>(null);
  const [settingsEdit, setSettingsEdit] = useState({ ...store.settings });
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const activeMembers = store.members.filter(m => m.isActive);
  const nonAdminMembers = activeMembers.filter(m => !m.isAdmin);
  const allNonAdminMembers = store.members.filter(m => !m.isAdmin);
  const totalCollection = store.getTotalCollection();
  const totalLoansGiven = store.getTotalLoansGiven();
  const remainingBalance = store.getRemainingBalance();
  const totalPenalty = store.getTotalPenaltyCollected();
  const totalInterest = store.getTotalInterestCollected();
  const pendingLoans = store.getPendingLoans();
  const defaulters = store.getDefaulterNames();
  const adminMember = store.members.find(m => m.isAdmin && m.isActive);
  const adminPenaltyShare = adminMember ? store.getMemberPenaltyShare(adminMember.id) : 0;
  const adminInterestShare = adminMember ? store.getMemberInterestShare(adminMember.id) : 0;
  const adminTotalEarnings = adminPenaltyShare + adminInterestShare;

  const normalizeWhatsappPhone = (mobile: string) => {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
  };

  const getMessageRecipientPhones = (type: 'broadcast' | 'loan_holder') => {
    const targetMembers = type === 'broadcast'
      ? nonAdminMembers
      : nonAdminMembers.filter(m => store.loans.some(l => l.memberId === m.id && (l.status === 'active' || l.status === 'pending')));
    return Array.from(new Set(
      targetMembers
        .map(m => normalizeWhatsappPhone(m.mobile))
        .filter(phone => phone.length >= 10),
    ));
  };

  const handleAddMember = () => {
    if (!newName || !newMobile || !newJoiningDate) return;
    store.addMember(newName, newMobile, newJoiningDate);
    setNewName(''); setNewMobile(''); setNewJoiningDate('');
    setShowAddMember(false);
  };

  const handleAddContribution = () => {
    if (!contribMemberId || !selectedMonth) return;
    store.addContribution(contribMemberId, selectedMonth, contribDate, contribPenalty);
    setContribMemberId(''); setContribPenalty(false);
    setShowAddContribution(false);
  };

  const handleBulkEntry = () => {
    if (bulkSelectedMembers.length === 0) return;
    store.addBulkContribution(selectedMonth, bulkSelectedMembers, bulkContribDate, bulkPenalty);
    setBulkSelectedMembers([]); setBulkPenalty(false);
    setShowBulkEntry(false);
  };

  const handleAddEMI = () => {
    if (!emiLoanId) return;
    const loan = store.loans.find(l => l.id === emiLoanId);
    if (!loan) return;
    const nextPending = loan.emiHistory.find(e => e.status === 'pending');
    if (!nextPending) return;
    store.addEMIPayment(emiLoanId, nextPending.emiNumber, emiPaidDate, emiPenalty);
    setShowAddEMI(false);
  };

  const handleAddOldLoan = () => {
    if (!oldLoanMember || !oldLoanAmount || !oldLoanOpening) return;
    store.addOldLoan({
      memberId: oldLoanMember,
      amount: Number(oldLoanAmount),
      openingDate: oldLoanOpening,
      closingDate: oldLoanClosing || '',
      includeInterest: oldLoanIncludeInterest,
      months: Number(oldLoanMonths),
    });
    setShowAddOldLoan(false);
  };

  const handleAddInterest = () => {
    if (!interestMember || !interestAmount || Number(interestAmount) <= 0) return;
    store.addManualInterest(interestMember, Number(interestAmount), interestDate || new Date().toISOString().split('T')[0], interestDesc || '');
    setInterestMember('');
    setInterestAmount('');
    setInterestDate('');
    setInterestDesc('');
    setShowAddInterest(false);
  };

  const handleSendMessage = () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) return;
    setMessageSendFeedback('');
    store.addNotification(trimmedMessage, messageType);
    const recipientPhones = getMessageRecipientPhones(messageType);
    const whatsappUrl = recipientPhones.length === 1
      ? `https://api.whatsapp.com/send?phone=${recipientPhones[0]}&text=${encodeURIComponent(trimmedMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(trimmedMessage)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setMessageSendFeedback(t('whatsappPopupBlocked'));
      return;
    }
    setMessageText('');
    setShowSendMessage(false);
  };

  const handleExportCSV = (memberId?: string) => {
    const csv = memberId ? store.exportMemberCSV(memberId) : store.exportMonthlyCSV(selectedMonth);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = memberId ? 'member_report.csv' : `monthly_report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMonths = () => {
    const months: string[] = [];
    const start = new Date('2025-09-01');
    const now = new Date();
    for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
      months.push(getMonthKey(d));
    }
    return months.reverse();
  };

  const toggleBulkMember = (id: string) => {
    setBulkSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const btnP = 'relative overflow-hidden rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 transform bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30';
  const btnS = 'relative overflow-hidden rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 transform bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/30';
  const btnD = 'relative overflow-hidden rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 transform bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30';
  const btnW = 'relative overflow-hidden rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 transform bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30';
  const btnPu = 'relative overflow-hidden rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 transform bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg shadow-purple-500/30';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">SHG BANK - {t('adminPanel')}</h1>
                <p className="text-blue-200 text-xs">स्वयं सहायता समूह बैंक</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                <option value="hi">हिंदी</option>
                <option value="en">English</option>
              </select>
              <button onClick={() => store.logout()} className={`${btnD} px-4 py-2 text-sm`}><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<IndianRupee className="w-6 h-6" />} label={t('totalCollection')} value={totalCollection} color="from-emerald-500 to-green-600" />
              <StatCard icon={<CreditCard className="w-6 h-6" />} label={t('totalLoansGiven')} value={totalLoansGiven} color="from-blue-500 to-indigo-600" />
              <StatCard icon={<Wallet className="w-6 h-6" />} label={t('remainingBalance')} value={remainingBalance} color="from-purple-500 to-violet-600" />
              <StatCard icon={<Users className="w-6 h-6" />} label={t('totalMembers')} value={nonAdminMembers.length} color="from-amber-500 to-orange-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard icon={<AlertTriangle className="w-6 h-6" />} label={t('totalPenaltyCollected')} value={totalPenalty} color="from-red-500 to-rose-600" />
              <StatCard icon={<TrendingUp className="w-6 h-6" />} label={t('totalInterestCollected')} value={totalInterest} color="from-cyan-500 to-teal-600" />
              <StatCard icon={<FileText className="w-6 h-6" />} label={t('pendingLoans')} value={pendingLoans.length} color="from-yellow-500 to-amber-600" />
            </div>
            {/* Admin Share Card */}
            {adminTotalEarnings > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 backdrop-blur rounded-2xl p-4 mb-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">⭐ {t('admin')} - {t('totalEarnings')}</p>
                    <p className="text-white font-bold text-2xl mt-1">{formatCurrency(adminTotalEarnings)}</p>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <p className="text-red-400">{t('penaltyEarnings')}: <span className="font-bold">{formatCurrency(adminPenaltyShare)}</span></p>
                    <p className="text-blue-400">{t('interestEarnings')}: <span className="font-bold">{formatCurrency(adminInterestShare)}</span></p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button onClick={() => setShowAddContribution(true)} className={`${btnP} p-4 text-center`}>
                <Plus className="w-6 h-6 mx-auto mb-1" /><span className="text-sm">{t('addContribution')}</span>
              </button>
              <button onClick={() => setShowAddEMI(true)} className={`${btnS} p-4 text-center`}>
                <CreditCard className="w-6 h-6 mx-auto mb-1" /><span className="text-sm">{t('addEMI')}</span>
              </button>
              <button onClick={() => setShowBulkEntry(true)} className={`${btnW} p-4 text-center`}>
                <FileText className="w-6 h-6 mx-auto mb-1" /><span className="text-sm">{t('bulkEntry')}</span>
              </button>
              <button onClick={() => setShowSendMessage(true)} className={`${btnPu} p-4 text-center`}>
                <Send className="w-6 h-6 mx-auto mb-1" /><span className="text-sm">{t('sendMessage')}</span>
              </button>
            </div>

            {pendingLoans.length > 0 && (
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4 mb-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /> {t('pendingLoans')}</h3>
                {pendingLoans.map(loan => (
                  <div key={loan.id} className="bg-white/5 rounded-xl p-3 mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{loan.memberName}</p>
                      <p className="text-gray-400 text-sm">{formatCurrency(loan.amount)} • {loan.months} माह</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => store.approveLoan(loan.id)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-600"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => store.rejectLoan(loan.id)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {defaulters.length > 0 && (
              <div className="bg-red-500/10 backdrop-blur rounded-2xl p-4 mb-6 border border-red-500/20">
                <h3 className="text-red-300 font-bold text-lg mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {t('defaulterList')} ({defaulters.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {defaulters.map((name, i) => (<span key={i} className="bg-red-500/20 text-red-200 px-3 py-1 rounded-full text-sm">{name}</span>))}
                </div>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
              <h3 className="text-white font-bold text-lg mb-3">{t('memberSummary')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">{t('name')}</th>
                      <th className="text-right py-2 px-2">{t('totalContribution')}</th>
                      <th className="text-right py-2 px-2">{t('penaltyEarnings')}</th>
                      <th className="text-right py-2 px-2">{t('interestEarnings')}</th>
                      <th className="text-right py-2 px-2">{t('grandTotal')}</th>
                      <th className="text-center py-2 px-2">CSV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Admin Share Row */}
                    {adminMember && (
                      <tr key={adminMember.id} className="border-b border-white/10 bg-purple-500/10 hover:bg-purple-500/20">
                        <td className="py-2 px-2 text-gray-400">⭐</td>
                        <td className="py-2 px-2 text-purple-300 font-bold">{adminMember.name} <span className="text-xs text-purple-400/70">({t('admin')})</span></td>
                        <td className="py-2 px-2 text-right text-gray-500">—</td>
                        <td className="py-2 px-2 text-right text-red-400">{formatCurrency(adminPenaltyShare)}</td>
                        <td className="py-2 px-2 text-right text-blue-400">{formatCurrency(adminInterestShare)}</td>
                        <td className="py-2 px-2 text-right text-yellow-400 font-bold">{formatCurrency(adminTotalEarnings)}</td>
                        <td className="py-2 px-2 text-center">—</td>
                      </tr>
                    )}
                    {nonAdminMembers.map((m, i) => {
                      const tc = store.getMemberTotalContribution(m.id);
                      const pe = store.getMemberPenaltyShare(m.id);
                      const ie = store.getMemberInterestShare(m.id);
                      return (
                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2 text-white">{m.name}</td>
                          <td className="py-2 px-2 text-right text-emerald-400">{formatCurrency(tc)}</td>
                          <td className="py-2 px-2 text-right text-red-400">{formatCurrency(pe)}</td>
                          <td className="py-2 px-2 text-right text-blue-400">{formatCurrency(ie)}</td>
                          <td className="py-2 px-2 text-right text-yellow-400 font-bold">{formatCurrency(tc + pe + ie)}</td>
                          <td className="py-2 px-2 text-center">
                            <button onClick={() => handleExportCSV(m.id)} className="text-blue-400 hover:text-blue-300"><Download className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-xl">{t('allMembers')} ({allNonAdminMembers.length})</h2>
              <button onClick={() => setShowAddMember(true)} className={`${btnP} px-4 py-2 text-sm flex items-center gap-2`}><UserPlus className="w-4 h-4" /> {t('addMember')}</button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-white/5 rounded-xl p-1">
              <button onClick={() => setMemberFilter('all')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${memberFilter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                {t('allMembers')} ({allNonAdminMembers.length})
              </button>
              <button onClick={() => setMemberFilter('active')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${memberFilter === 'active' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                {t('active')} ({allNonAdminMembers.filter(m => m.isActive).length})
              </button>
              <button onClick={() => setMemberFilter('inactive')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${memberFilter === 'inactive' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                {t('inactive')} ({allNonAdminMembers.filter(m => !m.isActive).length})
              </button>
            </div>

            {/* Filtered Members */}
            {allNonAdminMembers
              .filter(m => memberFilter === 'all' || (memberFilter === 'active' ? m.isActive : !m.isActive))
              .map(member => (
              <div key={member.id} className={`bg-white/5 backdrop-blur rounded-2xl p-4 border hover:border-white/20 transition ${member.isActive ? 'border-white/10' : 'border-red-500/30 opacity-80'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.profilePhoto ? (
                      <img src={member.profilePhoto} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg ${!member.isActive ? 'grayscale' : ''}`}>{member.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className={`font-semibold ${member.isActive ? 'text-white' : 'text-gray-400 line-through'}`}>{member.name}</p>
                      <p className="text-gray-400 text-sm">{member.mobile} • {formatDate(member.joiningDate)}</p>
                      {!member.isActive && (
                        <span className="text-red-400 text-xs font-semibold">⛔ {t('inactive')}{member.inactiveDate ? ` — ${formatDate(member.inactiveDate)}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active/Inactive Toggle */}
                    {member.isActive ? (
                      <button
                        onClick={() => { setInactiveDate(new Date().toISOString().split('T')[0]); setShowInactiveModal(member.id); }}
                        className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/30 font-semibold"
                      >
                        ⛔ {t('inactive')}
                      </button>
                    ) : (
                      <button
                        onClick={() => store.toggleMemberActive(member.id)}
                        className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-500/30 font-semibold"
                      >
                        ✅ {t('active')}
                      </button>
                    )}
                    <button onClick={() => setShowEditMember(member.id)} className="bg-blue-500/20 text-blue-400 p-2 rounded-lg hover:bg-blue-500/30"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm(`${member.name} हटाएं?`)) store.removeMember(member.id); }} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => store.resetMemberPassword(member.id)} className="bg-amber-500/20 text-amber-400 p-2 rounded-lg hover:bg-amber-500/30 text-xs whitespace-nowrap">🔑 Reset</button>
                  </div>
                </div>
              </div>
            ))}
            {allNonAdminMembers.filter(m => memberFilter === 'all' || (memberFilter === 'active' ? m.isActive : !m.isActive)).length === 0 && (
              <div className="text-center text-gray-400 py-12">{t('noData')}</div>
            )}
          </div>
        )}

        {/* Loans */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-xl">{t('loans')}</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowAddInterest(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 text-sm rounded-xl flex items-center gap-2 transition"><Plus className="w-4 h-4" /> {t('addManualInterest')}</button>
                <button onClick={() => setShowInterestHistory(true)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 text-sm rounded-xl flex items-center gap-2 transition"><Eye className="w-4 h-4" /> {t('interestHistory')}</button>
                <button onClick={() => setShowAddOldLoan(true)} className={`${btnW} px-4 py-2 text-sm flex items-center gap-2`}><Plus className="w-4 h-4" /> {t('addOldLoan')}</button>
              </div>
            </div>
            {store.loans.filter(l => l.status !== 'recalled' && l.status !== 'rejected').map(loan => (
              <div key={loan.id} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${loan.status === 'active' ? 'bg-emerald-500/20' : loan.status === 'completed' ? 'bg-blue-500/20' : 'bg-yellow-500/20'}`}>
                      <CreditCard className={`w-5 h-5 ${loan.status === 'active' ? 'text-emerald-400' : loan.status === 'completed' ? 'text-blue-400' : 'text-yellow-400'}`} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{loan.memberName}</p>
                      <p className="text-gray-400 text-sm">{formatDate(loan.openingDate)} → {formatDate(loan.closingDate)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${loan.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : loan.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : loan.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{t(loan.status)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mt-3">
                  <div className="bg-white/5 rounded-lg p-2"><p className="text-gray-400 text-xs">{t('loanAmount')}</p><p className="text-white font-bold">{formatCurrency(loan.amount)}</p></div>
                  <div className="bg-white/5 rounded-lg p-2"><p className="text-gray-400 text-xs">{t('totalInterest')}</p><p className="text-yellow-400 font-bold">{formatCurrency(loan.totalInterest)}</p></div>
                  <div className="bg-white/5 rounded-lg p-2"><p className="text-gray-400 text-xs">{t('remaining')}</p><p className="text-red-400 font-bold">{formatCurrency(loan.remainingAmount)}</p></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-gray-400 text-sm">{loan.emiHistory.filter(e => e.status === 'paid').length}/{loan.months} EMI {t('paid')}</p>
                  <div className="flex gap-2">
                    {loan.status === 'pending' && (<>
                      <button onClick={() => store.approveLoan(loan.id)} className={`${btnS} px-3 py-1.5 text-xs`}><CheckCircle className="w-3 h-3 inline mr-1" /> {t('approve')}</button>
                      <button onClick={() => store.rejectLoan(loan.id)} className={`${btnD} px-3 py-1.5 text-xs`}><XCircle className="w-3 h-3 inline mr-1" /> {t('reject')}</button>
                    </>)}
                    {loan.status === 'active' && (
                      <button onClick={() => { if (confirm(`${loan.memberName} का ₹${loan.remainingAmount} शेष वाला ऋण foreclose करें?`)) store.forecloseLoan(loan.id); }} className="bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg text-xs hover:bg-orange-500/30 font-semibold"><CreditCard className="w-3 h-3 inline mr-1" /> {t('foreclose')}</button>
                    )}
                    <button onClick={() => setShowEMIDetail(loan.id)} className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-500/30"><Eye className="w-3 h-3 inline mr-1" /> EMI</button>
                    <button onClick={() => { if (confirm(`${loan.memberName} का ये ऋण हटाएं?`)) store.deleteLoan(loan.id); }} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/30"><Trash2 className="w-3 h-3 inline mr-1" /> {t('delete')}</button>
                  </div>
                </div>
              </div>
            ))}
            {store.loans.filter(l => l.status !== 'recalled' && l.status !== 'rejected').length === 0 && (
              <div className="text-center text-gray-400 py-12">{t('noData')}</div>
            )}
          </div>
        )}

        {/* Contributions */}
        {activeTab === 'contributions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-xl">{t('contributions')}</h2>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                  {getMonths().map(m => <option key={m} value={m} className="bg-slate-800">{m}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExportCSV()} className={`${btnP} px-3 py-1.5 text-sm flex items-center gap-1`}><Download className="w-3 h-3" /> CSV</button>
                <button onClick={() => setShowBulkEntry(true)} className={`${btnW} px-3 py-1.5 text-sm flex items-center gap-1`}><FileText className="w-3 h-3" /> {t('bulkEntry')}</button>
              </div>
            </div>
            {store.contributions.filter(c => c.month === selectedMonth).length === 0 ? (
              <div className="text-center text-gray-400 py-12">{t('noData')}</div>
            ) : (
              store.contributions.filter(c => c.month === selectedMonth).map(c => (
                <div key={c.id} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{c.memberName}</p>
                      <p className="text-gray-400 text-xs">{c.paidDate ? formatDate(c.paidDate) : ''} {c.penalty > 0 && <span className="text-red-400">+ {formatCurrency(c.penalty)} {t('penalty')}</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t(c.status)} {formatCurrency(c.amount)}</span>
                      <button onClick={() => setShowEditContribution(c.id)} className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/30"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm(`${c.memberName} का ${c.month} योगदान हटाएं?`)) store.deleteContribution(c.id); }} className="bg-red-500/20 text-red-400 p-1.5 rounded-lg hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl">{t('notifications')}</h2>
            <button onClick={() => setShowSendMessage(true)} className={`${btnP} px-4 py-2 text-sm flex items-center gap-2`}><Send className="w-4 h-4" /> {t('sendMessage')}</button>
            {store.notifications.length === 0 ? (
              <div className="text-center text-gray-400 py-12">{t('noData')}</div>
            ) : store.notifications.map(n => (
              <div key={n.id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div><p className="text-white">{n.message}</p><p className="text-gray-400 text-xs mt-1">{formatDate(n.date)} • {n.type === 'broadcast' ? t('broadcast') : t('loanHolders')}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-white font-bold text-xl">{t('settings')}</h2>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-white font-semibold">{t('paymentQR')}</h3>
              <div className="flex flex-col items-center bg-white rounded-2xl p-6">
                <QRCodeSVG value={`upi://pay?pa=${store.settings.upiId}&pn=SHG%20Bank`} size={180} />
                <p className="text-gray-800 font-bold mt-3 text-lg">{store.settings.upiId}</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-white font-semibold">⚙️ {t('settings')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm">{t('upiId')}</label><input value={settingsEdit.upiId} onChange={(e) => setSettingsEdit({ ...settingsEdit, upiId: e.target.value })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-gray-400 text-sm">{t('monthlyContrib')}</label><input type="number" value={settingsEdit.monthlyContribution} onChange={(e) => setSettingsEdit({ ...settingsEdit, monthlyContribution: Number(e.target.value) })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-gray-400 text-sm">{t('maxLoan')}</label><input type="number" value={settingsEdit.maxLoanAmount} onChange={(e) => setSettingsEdit({ ...settingsEdit, maxLoanAmount: Number(e.target.value) })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-gray-400 text-sm">{t('interestRate')} (%)</label><input type="number" value={settingsEdit.interestRate} onChange={(e) => setSettingsEdit({ ...settingsEdit, interestRate: Number(e.target.value) })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-gray-400 text-sm">{t('lateFee')}</label><input type="number" value={settingsEdit.lateFeePerDay} onChange={(e) => setSettingsEdit({ ...settingsEdit, lateFeePerDay: Number(e.target.value) })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                <div><label className="text-gray-400 text-sm">{t('dueDay')}</label><input type="number" value={settingsEdit.dueDate} onChange={(e) => setSettingsEdit({ ...settingsEdit, dueDate: Number(e.target.value) })} className="w-full mt-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
              </div>
              <button onClick={() => store.updateSettings(settingsEdit)} className={`${btnS} px-6 py-2 text-sm`}><CheckCircle className="w-4 h-4 inline mr-1" /> {t('save')}</button>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">🔒 {t('changePassword')}</h3>
              <AdminChangePassword />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {([
            { key: 'dashboard' as AdminTab, icon: <TrendingUp className="w-5 h-5" />, label: t('summary') },
            { key: 'members' as AdminTab, icon: <Users className="w-5 h-5" />, label: t('members') },
            { key: 'loans' as AdminTab, icon: <CreditCard className="w-5 h-5" />, label: t('loans') },
            { key: 'contributions' as AdminTab, icon: <IndianRupee className="w-5 h-5" />, label: t('contributions') },
            { key: 'messages' as AdminTab, icon: <Bell className="w-5 h-5" />, label: t('notifications') },
            { key: 'settings' as AdminTab, icon: <Settings className="w-5 h-5" />, label: t('settings') },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${activeTab === tab.key ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}>
              {tab.icon}<span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* MODALS */}
      {showAddMember && (
        <Modal title={t('addMember')} onClose={() => setShowAddMember(false)}>
          <div className="space-y-4">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('name')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={newMobile} onChange={(e) => setNewMobile(e.target.value)} placeholder={t('mobile')} maxLength={10} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="date" value={newJoiningDate} onChange={(e) => setNewJoiningDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="flex gap-2">
              <button onClick={handleAddMember} className={`${btnS} flex-1 py-3`}>{t('save')}</button>
              <button onClick={() => setShowAddMember(false)} className={`${btnD} px-6 py-3`}>{t('cancel')}</button>
            </div>
          </div>
        </Modal>
      )}

      {showEditMember && <EditMemberModal memberId={showEditMember} onClose={() => setShowEditMember(null)} />}

      {/* Inactive Date Modal */}
      {showInactiveModal && (
        <Modal title={t('setInactiveDate')} onClose={() => setShowInactiveModal(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">{t('selectInactiveDate')}</p>
              <input
                type="date"
                value={inactiveDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setInactiveDate(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowInactiveModal(null)} className="flex-1 bg-white/10 text-gray-300 py-3 rounded-xl font-semibold hover:bg-white/20">
                {t('cancel')}
              </button>
              <button
                onClick={() => { store.toggleMemberActive(showInactiveModal, inactiveDate); setShowInactiveModal(null); }}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30"
              >
                ⛔ {t('confirmInactive')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAddContribution && (
        <Modal title={t('addContribution')} onClose={() => setShowAddContribution(false)}>
          <div className="space-y-4">
            <select value={contribMemberId} onChange={(e) => setContribMemberId(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="" className="bg-slate-800">{t('selectMember')}</option>
              {nonAdminMembers.map(m => <option key={m.id} value={m.id} className="bg-slate-800">{m.name} - {m.mobile}</option>)}
            </select>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {getMonths().map(m => <option key={m} value={m} className="bg-slate-800">{m}</option>)}
            </select>
            <input type="date" value={contribDate} onChange={(e) => setContribDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input type="checkbox" checked={contribPenalty} onChange={(e) => setContribPenalty(e.target.checked)} className="w-5 h-5 rounded" />
              {t('applyPenalty')} (₹10/{t('perDay')})
            </label>
            <button onClick={handleAddContribution} className={`${btnS} w-full py-3`}>{t('save')}</button>
          </div>
        </Modal>
      )}

      {showAddEMI && (
        <Modal title={t('addEMI')} onClose={() => setShowAddEMI(false)}>
          <div className="space-y-4">
            <select value={emiLoanId} onChange={(e) => setEmiLoanId(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="" className="bg-slate-800">{t('selectMember')} / {t('loans')}</option>
              {store.loans.filter(l => l.status === 'active').map(l => (
                <option key={l.id} value={l.id} className="bg-slate-800">{l.memberName} - {formatCurrency(l.amount)} ({l.emiHistory.filter(e => e.status === 'paid').length}/{l.months})</option>
              ))}
            </select>
            <input type="date" value={emiPaidDate} onChange={(e) => setEmiPaidDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input type="checkbox" checked={emiPenalty} onChange={(e) => setEmiPenalty(e.target.checked)} className="w-5 h-5 rounded" />
              {t('applyPenalty')} (₹10/{t('perDay')})
            </label>
            <button onClick={handleAddEMI} className={`${btnS} w-full py-3`}>{t('save')}</button>
          </div>
        </Modal>
      )}

      {showBulkEntry && (
        <Modal title={t('bulkEntry')} onClose={() => setShowBulkEntry(false)}>
          <div className="space-y-4">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {getMonths().map(m => <option key={m} value={m} className="bg-slate-800">{m}</option>)}
            </select>
            <input type="date" value={bulkContribDate} onChange={(e) => setBulkContribDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input type="checkbox" checked={bulkPenalty} onChange={(e) => setBulkPenalty(e.target.checked)} className="w-5 h-5 rounded" />
              {t('applyPenalty')} (₹10/{t('perDay')})
            </label>
            <p className="text-gray-400 text-sm">{t('selectMember')} ({bulkSelectedMembers.length}/{nonAdminMembers.length})</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {nonAdminMembers.map(m => (
                <label key={m.id} className="flex items-center gap-2 text-white cursor-pointer hover:bg-white/5 p-1 rounded">
                  <input type="checkbox" checked={bulkSelectedMembers.includes(m.id)} onChange={() => toggleBulkMember(m.id)} className="w-4 h-4" />
                  <span className="text-sm">{m.name}</span>
                </label>
              ))}
            </div>
            <button onClick={handleBulkEntry} className={`${btnS} w-full py-3`}>{t('save')} ({bulkSelectedMembers.length})</button>
          </div>
        </Modal>
      )}

      {showAddOldLoan && (
        <Modal title={t('addOldLoan')} onClose={() => setShowAddOldLoan(false)}>
          <div className="space-y-4">
            <select value={oldLoanMember} onChange={(e) => setOldLoanMember(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="" className="bg-slate-800">{t('selectMember')}</option>
              {nonAdminMembers.map(m => <option key={m.id} value={m.id} className="bg-slate-800">{m.name}</option>)}
            </select>
            <input type="number" value={oldLoanAmount} onChange={(e) => setOldLoanAmount(e.target.value)} placeholder={t('loanAmount')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="date" value={oldLoanOpening} onChange={(e) => setOldLoanOpening(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{t('loanCloseDate')} ({t('optional')})</label>
              <input type="date" value={oldLoanClosing} onChange={(e) => setOldLoanClosing(e.target.value)} placeholder={t('optional')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <p className="text-gray-500 text-xs mt-1">{t('currentLoanSkipMsg')}</p>
            </div>
            <select value={oldLoanMonths} onChange={(e) => setOldLoanMonths(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[1,2,3,4,5,6].map(n => <option key={n} value={n} className="bg-slate-800">{n} माह</option>)}
            </select>
            <label className="flex items-center gap-3 text-white cursor-pointer">
              <input type="checkbox" checked={oldLoanIncludeInterest} onChange={(e) => setOldLoanIncludeInterest(e.target.checked)} className="w-5 h-5 rounded" />
              {t('includeInterest')} (2%)
            </label>
            {oldLoanAmount && oldLoanMonths && (
              <div className="bg-white/5 rounded-xl p-3">
                {(() => {
                  const d = calculateLoanDetails(Number(oldLoanAmount), Number(oldLoanMonths), oldLoanIncludeInterest ? 0.02 : 0);
                  return (<div className="text-sm space-y-1">
                    <p className="text-gray-400">{t('emiAmount')}: <span className="text-white font-bold">{formatCurrency(d.emi)}</span></p>
                    <p className="text-gray-400">{t('totalInterest')}: <span className="text-yellow-400 font-bold">{formatCurrency(d.totalInterest)}</span></p>
                    <p className="text-gray-400">{t('totalPayable')}: <span className="text-emerald-400 font-bold">{formatCurrency(d.totalPayable)}</span></p>
                  </div>);
                })()}
              </div>
            )}
            <button onClick={handleAddOldLoan} className={`${btnS} w-full py-3`}>{t('save')}</button>
          </div>
        </Modal>
      )}

      {/* Add Manual Interest Modal */}
      {showAddInterest && (
        <Modal title={t('addManualInterest')} onClose={() => setShowAddInterest(false)}>
          <div className="space-y-4">
            <select value={interestMember} onChange={(e) => setInterestMember(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="" className="bg-slate-800">{t('selectMember')}</option>
              {nonAdminMembers.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-800">{m.name}</option>
              ))}
            </select>
            <input type="number" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} placeholder={t('interestAmount')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <input type="date" value={interestDate} onChange={(e) => setInterestDate(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <input type="text" value={interestDesc} onChange={(e) => setInterestDesc(e.target.value)} placeholder={t('description')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <button onClick={handleAddInterest} className={`${btnS} w-full py-3`}>{t('save')}</button>
          </div>
        </Modal>
      )}

      {/* Interest History Modal */}
      {showInterestHistory && (
        <Modal title={t('interestHistory')} onClose={() => setShowInterestHistory(false)}>
          <div className="space-y-3">
            {store.manualInterests.length === 0 ? (
              <p className="text-gray-400 text-center py-4">{t('noData')}</p>
            ) : (
              <>
                <div className="text-yellow-400 font-bold text-right">{t('total')}: {formatCurrency(store.manualInterests.reduce((s, m) => s + m.amount, 0))}</div>
                {store.manualInterests.slice().reverse().map(record => (
                  <div key={record.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{record.memberName}</p>
                        <p className="text-gray-400 text-xs">{record.description || '—'}</p>
                        <p className="text-gray-500 text-xs">{formatDate(record.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 font-bold">{formatCurrency(record.amount)}</span>
                        <button onClick={() => store.removeManualInterest(record.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Modal>
      )}

      {showSendMessage && (
        <Modal title={t('sendMessage')} onClose={() => { setShowSendMessage(false); setMessageSendFeedback(''); }}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setMessageType('broadcast')} className={`flex-1 py-2 rounded-xl text-sm ${messageType === 'broadcast' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>{t('broadcast')}</button>
              <button onClick={() => setMessageType('loan_holder')} className={`flex-1 py-2 rounded-xl text-sm ${messageType === 'loan_holder' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>{t('loanHolders')}</button>
            </div>
            <textarea value={messageText} onChange={(e) => { setMessageText(e.target.value); setMessageSendFeedback(''); }} placeholder={t('message')} rows={4} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            {messageSendFeedback && <p className="text-xs text-amber-300">{messageSendFeedback}</p>}
            <p className="text-xs text-gray-400">{t('whatsappLinkedHint')}</p>
            <button onClick={handleSendMessage} className={`${btnP} w-full py-3`}><Send className="w-4 h-4 inline mr-1" /> {t('sendMessage')}</button>
          </div>
        </Modal>
      )}

      {showEMIDetail && <EMIDetailModal loanId={showEMIDetail} onClose={() => setShowEMIDetail(null)} onEditEMI={(loanId, emiId) => setShowEditEMI({ loanId, emiId })} />}
      {showEditContribution && <EditContributionModal contributionId={showEditContribution} onClose={() => setShowEditContribution(null)} />}
      {showEditEMI && <EditEMIModal loanId={showEditEMI.loanId} emiId={showEditEMI.emiId} onClose={() => setShowEditEMI(null)} />}
    </div>
  );
}

function EditMemberModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const member = store.getMember(memberId);
  const [name, setName] = useState(member?.name || '');
  const [mobile, setMobile] = useState(member?.mobile || '');
  if (!member) return null;
  return (
    <Modal title={`✏️ ${t('edit')} - ${member.name}`} onClose={onClose}>
      <div className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('mobile')} maxLength={10} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={() => { store.updateMember(memberId, { name, mobile }); onClose(); }} className="bg-emerald-500 text-white w-full py-3 rounded-xl font-semibold hover:bg-emerald-600">{t('save')}</button>
      </div>
    </Modal>
  );
}

function AdminChangePassword() {
  const { t } = useTranslation();
  const store = useStore();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const handleSave = () => {
    const user = store.getMember(store.currentUserId!);
    if (!user) return;
    if (current !== user.password) { setError('वर्तमान पासवर्ड गलत है'); return; }
    if (newPass.length < 4) { setError('पासवर्ड कम से कम 4 अंक का होना चाहिए'); return; }
    if (newPass !== confirm) { setError('पासवर्ड मेल नहीं खाता'); return; }
    store.changePassword(user.id, newPass);
    setError(''); setCurrent(''); setNewPass(''); setConfirm('');
    alert('पासवर्ड बदला गया!');
  };
  return (
    <div className="space-y-3">
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="वर्तमान पासवर्ड" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="नया पासवर्ड" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="पासवर्ड की पुष्टि करें" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={handleSave} className="bg-emerald-500 text-white w-full py-3 rounded-xl font-semibold hover:bg-emerald-600">{t('save')}</button>
    </div>
  );
}

function EMIDetailModal({ loanId, onClose, onEditEMI }: { loanId: string; onClose: () => void; onEditEMI: (loanId: string, emiId: string) => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const loan = store.loans.find(l => l.id === loanId);
  if (!loan) return null;
  return (
    <Modal title={`EMI - ${loan.memberName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-gray-400 text-xs">{t('loanAmount')}</p><p className="text-white font-bold">{formatCurrency(loan.amount)}</p></div>
          <div className="bg-white/5 rounded-lg p-2 text-center"><p className="text-gray-400 text-xs">{t('emiAmount')}</p><p className="text-white font-bold">{formatCurrency(loan.emiAmount)}</p></div>
        </div>
        {loan.emiHistory.map(emi => (
          <div key={emi.id} className={`rounded-xl p-3 border ${emi.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">EMI #{emi.emiNumber}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${emi.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t(emi.status)}</span>
                {emi.status === 'paid' && (
                  <>
                    <button onClick={() => onEditEMI(loanId, emi.id)} className="bg-blue-500/20 text-blue-400 p-1 rounded hover:bg-blue-500/30"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => { if (confirm(`EMI #${emi.emiNumber} हटाएं (रिफंड)?`)) { store.deleteEMIPayment(loanId, emi.id); }; }} className="bg-red-500/20 text-red-400 p-1 rounded hover:bg-red-500/30"><Trash2 className="w-3 h-3" /></button>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">{formatCurrency(emi.amount)}</span><span className="text-gray-400">{emi.dueDate ? formatDate(emi.dueDate) : ''}</span></div>
            {emi.status === 'paid' && (
              <div className="text-sm mt-1 text-gray-400">
                {emi.paidDate && <span>{t('paidDate')}: {formatDate(emi.paidDate)}</span>}
                {emi.penalty > 0 && <span className="text-red-400 ml-2">+ {formatCurrency(emi.penalty)} {t('penalty')}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function EditContributionModal({ contributionId, onClose }: { contributionId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const contribution = store.contributions.find(c => c.id === contributionId);
  const [amount, setAmount] = useState(contribution?.amount || 0);
  const [paidDate, setPaidDate] = useState(contribution?.paidDate || '');
  const [penalty, setPenalty] = useState(contribution?.penalty || 0);
  const [status, setStatus] = useState<string>(contribution?.status || 'paid');
  if (!contribution) return null;
  const handleSave = () => {
    store.editContribution(contributionId, {
      amount: Number(amount),
      paidDate: paidDate || undefined,
      penalty: Number(penalty),
      status: status as 'paid' | 'pending' | 'overdue',
    });
    onClose();
  };
  return (
    <Modal title={`✏️ ${t('edit')} - ${contribution.memberName} (${contribution.month})`} onClose={onClose}>
      <div className="space-y-4">
        <div><label className="text-gray-400 text-sm">{t('amount')}</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div><label className="text-gray-400 text-sm">{t('paidDate')}</label>
          <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div><label className="text-gray-400 text-sm">{t('penalty')}</label>
          <input type="number" value={penalty} onChange={(e) => setPenalty(Number(e.target.value))} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div><label className="text-gray-400 text-sm">{t('status')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="paid" className="bg-slate-800">{t('paid')}</option>
            <option value="pending" className="bg-slate-800">{t('pending')}</option>
            <option value="overdue" className="bg-slate-800">{t('overdue')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className={`${'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'} text-white flex-1 py-3 rounded-xl font-semibold shadow-lg`}>{t('save')}</button>
          <button onClick={onClose} className={`${'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'} text-white px-6 py-3 rounded-xl font-semibold shadow-lg`}>{t('cancel')}</button>
        </div>
      </div>
    </Modal>
  );
}

function EditEMIModal({ loanId, emiId, onClose }: { loanId: string; emiId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const loan = store.loans.find(l => l.id === loanId);
  const emi = loan?.emiHistory.find(e => e.id === emiId);
  const [paidDate, setPaidDate] = useState(emi?.paidDate || '');
  const [penalty, setPenalty] = useState(emi?.penalty || 0);
  if (!loan || !emi) return null;
  const handleSave = () => {
    store.editEMI(loanId, emiId, {
      paidDate: paidDate || undefined,
      penalty: Number(penalty),
    });
    onClose();
  };
  return (
    <Modal title={`✏️ ${t('edit')} - EMI #${emi.emiNumber} (${loan.memberName})`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-gray-400 text-xs">{t('emiAmount')}: <span className="text-white font-bold">{formatCurrency(emi.amount)}</span></p>
        </div>
        <div><label className="text-gray-400 text-sm">{t('paidDate')}</label>
          <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div><label className="text-gray-400 text-sm">{t('penalty')}</label>
          <input type="number" value={penalty} onChange={(e) => setPenalty(Number(e.target.value))} className="w-full mt-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className={`${'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'} text-white flex-1 py-3 rounded-xl font-semibold shadow-lg`}>{t('save')}</button>
          <button onClick={onClose} className={`${'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'} text-white px-6 py-3 rounded-xl font-semibold shadow-lg`}>{t('cancel')}</button>
        </div>
      </div>
    </Modal>
  );
}
