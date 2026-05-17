import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType, formatNum } from './lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Cell
} from 'recharts';
import { 
  format, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, 
  endOfDay, endOfWeek, endOfMonth, endOfQuarter, endOfYear, isWithinInterval, differenceInDays
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronDown, Moon, Sun, Zap, Landmark, BarChart3, TrendingDown, TrendingUp, Activity, LineChart, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TIMEZONE = '+03:00';

interface Deal {
  account?: number;
  ticket: string;
  type: number | string; // 0 = Buy, 1 = Sell
  volume: number;
  price: number;
  time: number;
  profit: number;
  commission: number;
  swap: number;
  symbol: string;
  siteId?: string;
  isPublic?: boolean;
}

interface AccountConfig {
  account: number;
  label: string;
  logoUrl?: string;
  order: number;
  isHidden: boolean;
}

interface AppSettings {
  title?: string;
  logoUrl?: string;
  accounts?: Record<string, AccountConfig>;
  links?: {
    community?: string;
    broker?: string;
    tutorial?: string;
    contact?: string;
  };
  adminUsername?: string;
  adminPassword?: string;
}

type Timeframe = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
type Language = 'zh' | 'en';

const translations = {
  zh: {
    appTitle: 'MT5 績效監控系統',
    history: '歷史交易',
    simulation: '跟單試算',
    DAY: '每日',
    WEEK: '每週',
    MONTH: '每月',
    QUARTER: '每季',
    YEAR: '每年',
    ALL: '完整歷史',
    totalPL: '總損益',
    grossProfit: '毛利',
    winRate: '勝率',
    wins: '勝',
    losses: '負',
    profitFactor: '獲利因子',
    totalTrades: '總交易次數',
    historyTrades: '歷史總筆數',
    maxDrawdown: '最大浮虧',
    accVolume: '總手數',
    accTradeVolume: '累積交易手數',
    equityCurve: '累積收益曲線',
    totalProfitLoss: '累積盈虧',
    weeklyPL: '每週損益',
    monthlyPL: '每月損益',
    quarterlyPL: '每季損益',
    yearlyPL: '每年損益',
    dailyPL: '每日損益',
    latest10: '近 10 筆',
    type: '方向',
    symbol: '商品',
    volume: '手數',
    commission: '手續費',
    swap: '庫存費',
    netPL: '淨損益',
    closeTime: '平倉時間',
    period: '週期',
    trades: '交易次數',
    netPLPct: '淨損益 / %',
    profitVal: '盈/虧',
    depositWithdrawal: '出入金',
    balance: '餘額',
    total: '合計',
    noTradeRecord: '此期間無交易紀錄',
    copySimulationDesc: '根據策略歷史績效，試算不同資金與倍率下的預期盈虧、最大回撤與風控建議',
    simAmountLabel: '跟單本金',
    initialCapitalShared: '與複利模擬共用',
    simMultiplierLabel: '跟單倍率',
    simMultiplierDesc: 'x 原策略手數',
    maxTolerableDrawdown: '可承受最大虧損%',
    expectedProfit: '預期期間損益',
    expectedROI: '預期報酬率',
    estimatedMaxDD: '預估最大浮虧',
    recMaxMultiplier: '容許最大倍率',
    riskAssessment: '風險評估',
    lowRisk: '低風險',
    mediumRisk: '中風險',
    highRisk: '高風險',
    liquidationRisk: '注意：當前倍率超過容許最大倍率，請嚴謹評估風險！',
    basedOn: '基於可承受虧損',
    baseCompoundTotal: '以損益率複利累積，倍率 x',
    noCompoundTotal: '不使用複利，倍率 x',
    baseCapitalTotal: '相對本金',
    baseDrawdownTotal: '歷史浮虧率 26.61% x',
    simAmountLabelOld: '跟單金額',
    initialCapitalOld: '初始資金',
    compound: '每日獲利滾倉',
    compoundInterest: '複利計算',
    simResult: '試算結果金額',
    simROI: '試算收益率',
    projectedCurve: '預估收益曲線',
    date: '日期',
    dailyROI: '當日報酬率',
    simProfit: '試算獲利',
    simTotal: '試算總額',
    noSimData: '無試算資料',
    community: '加入社群',
    broker: '券商',
    server: '伺服器',
    tutorial: '跟單教學',
    contact: '聯繫客服',
    days: '天',
    adminLogin: '管理員登入',
    login: '登入',
    loginFailed: '登入失敗',
    settings: '系統設定',
    logout: '登出',
    loading: '載入中…',
    lastSync: '最後同步',
    monitoring: '即時監控中',
    saveSettings: '儲存設定',
    cancel: '取消',
    account: '帳戶',
    label: '標籤名稱',
    orderWeight: '排序權重 (越小越前)',
    logoUrl: '圖片連結 (Logo URL)',
    noAccountData: '尚無帳戶資料，連線後自動偵測',
    visible: '顯示中',
    hidden: '已隱藏',
    toggleTheme: '切換主題',
    toggleLanguage: '切換語言',
    profitDetail: '損益',
    accountInfo: '帳戶資訊',
    equity: '淨值',
    floatingPL: '浮動損益',
    overallPerformance: '整體績效',
    avgWin: '平均獲利',
    avgLoss: '平均虧損',
    maxWinStreak: '最長連勝',
    maxLossStreak: '最長連敗',
    drawdownAnalysis: '回撤分析',
    maxFloatingProfit: '最大浮盈',
    totalVolume: '總交易量',
    avgHoldTime: '平均持倉',
    recentTrades: '最新成交記錄',
    dealsSummary: '筆',
    notAvailable: '暫無資料',
    initialDeposit: '初始資金',
    totalDeposits: '總入金',
    totalWithdrawals: '總出金',
    bestTrade: '單筆最大獲利',
    worstTrade: '單筆最大虧損',
  },
  en: {
    appTitle: 'MT5 Performance Monitor',
    history: 'History',
    simulation: 'Simulation',
    DAY: 'Daily',
    WEEK: 'Weekly',
    MONTH: 'Monthly',
    QUARTER: 'Quarterly',
    YEAR: 'Yearly',
    ALL: 'All Time',
    totalPL: 'Total P/L',
    grossProfit: 'Gross Profit',
    winRate: 'Win Rate',
    wins: 'Wins',
    losses: 'Losses',
    profitFactor: 'PF',
    totalTrades: 'Total Trades',
    historyTrades: 'History Total',
    maxDrawdown: 'Max DD',
    accVolume: 'Total Vol',
    accTradeVolume: 'Accumulated Volume',
    equityCurve: 'Equity Curve',
    totalProfitLoss: 'Cumulative P/L',
    weeklyPL: 'Weekly P/L',
    monthlyPL: 'Monthly P/L',
    quarterlyPL: 'Quarterly P/L',
    yearlyPL: 'Yearly P/L',
    dailyPL: 'Daily P/L',
    latest10: 'Latest 10',
    type: 'Type',
    symbol: 'Symbol',
    volume: 'Volume',
    commission: 'Comm.',
    swap: 'Swap',
    netPL: 'Net P/L',
    closeTime: 'Close Time',
    period: 'Period',
    trades: 'Trades',
    netPLPct: 'Net P/L / %',
    profitVal: 'Profit/Loss',
    depositWithdrawal: 'In/Out',
    balance: 'Balance',
    total: 'Total',
    noTradeRecord: 'No records found',
    copySimulationDesc: 'Calculate expected P/L, max DD and risk config based on historical performance',
    simAmountLabel: 'Copy Capital',
    initialCapitalShared: 'Shared with compound simulation',
    simMultiplierLabel: 'Copy Multiplier',
    simMultiplierDesc: 'x Base Strategy Lot',
    maxTolerableDrawdown: 'Max Tolerable DD %',
    expectedProfit: 'Expected Profit',
    expectedROI: 'Expected ROI',
    estimatedMaxDD: 'Estimated Max DD',
    recMaxMultiplier: 'Max Allowable Multiplier',
    riskAssessment: 'Risk Assessment',
    lowRisk: 'Low Risk',
    mediumRisk: 'Medium Risk',
    highRisk: 'High Risk',
    liquidationRisk: 'Warning: Current multiplier exceeds max allowable, high risk of liquidation!',
    basedOn: 'Based on tolerable DD',
    baseCompoundTotal: 'Compound ROI, Multiplier x',
    noCompoundTotal: 'No Compound, Multiplier x',
    baseCapitalTotal: 'Relative to Capital',
    baseDrawdownTotal: 'Base DD 26.61% x',
    simAmountLabelOld: 'Copy Amount',
    initialCapitalOld: 'Initial Capital',
    compound: 'Daily Compound',
    compoundInterest: 'Compound',
    simResult: 'Simulation Result',
    simROI: 'Simulation ROI',
    projectedCurve: 'Projected Curve',
    date: 'Date',
    dailyROI: 'Daily ROI',
    simProfit: 'Projected Profit',
    simTotal: 'Projected Total',
    noSimData: 'No Data',
    community: 'Community',
    broker: 'Broker',
    server: 'Server',
    tutorial: 'Tutorial',
    contact: 'Contact',
    days: 'DAYS',
    adminLogin: 'Admin Login',
    login: 'Login',
    loginFailed: 'Login Failed',
    settings: 'Settings',
    logout: 'Logout',
    loading: 'Loading...',
    lastSync: 'Last Sync',
    monitoring: 'Monitoring',
    saveSettings: 'Save Settings',
    cancel: 'Cancel',
    account: 'Account',
    label: 'Label',
    orderWeight: 'Weight',
    logoUrl: 'Logo URL',
    noAccountData: 'No account data found',
    visible: 'Visible',
    hidden: 'Hidden',
    toggleTheme: 'Toggle Theme',
    toggleLanguage: 'Language',
    profitDetail: 'Profit',
    accountInfo: 'Account Info',
    equity: 'Equity',
    floatingPL: 'Floating P/L',
    overallPerformance: 'Overall Performance',
    avgWin: 'Avg Win',
    avgLoss: 'Avg Loss',
    maxWinStreak: 'Max Win Streak',
    maxLossStreak: 'Max Loss Streak',
    drawdownAnalysis: 'Drawdown Analysis',
    maxFloatingProfit: 'Max Peak Profit',
    totalVolume: 'Total Volume',
    avgHoldTime: 'Avg Hold Time',
    recentTrades: 'Recent Trades',
    dealsSummary: 'Trades',
    notAvailable: 'N/A',
    initialDeposit: 'Initial Deposit',
    totalDeposits: 'Total Deposits',
    totalWithdrawals: 'Total Withdrawals',
    bestTrade: 'Best Trade',
    worstTrade: 'Worst Trade',
  }
};

const parseImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }
  return url;
};

export default function App() {
  const SITE_ID = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const querySiteId = params.get('siteId');
    if (querySiteId) return querySiteId;

    const hostname = window.location.hostname;
    // For local development or AI studio preview, we might want a default siteId if no path
    if (hostname.includes('localhost') || hostname.includes('run.app') || hostname.includes('webcontainer')) {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && !['history', 'simulation', 'settings'].includes(pathParts[0])) {
        return hostname.replace(/\./g, '_') + '_' + pathParts[0].replace(/-/g, '_');
      }
      // If we are on dev and no path, default to a known site for testing if needed
      // but let's stick to hostname for now
      return hostname.replace(/\./g, '_');
    }

    const host = hostname.replace(/\./g, '_');
    const path = window.location.pathname.split('/').filter(Boolean)[0] || '';
    let id = host;
    if (path && !['history', 'simulation', 'settings'].includes(path)) {
      id += '_' + path.replace(/-/g, '_');
    }
    return id;
  }, []);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('DAY');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [user, setUser] = useState<any>(null); // Kept state variable signature for code consistency
  const [settings, setSettings] = useState<AppSettings>({ title: '', logoUrl: '' });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tempSettings, setTempSettings] = useState<AppSettings>({ title: '', logoUrl: '' });
  const [accountStatsMap, setAccountStatsMap] = useState<Record<string, { maxDrawdownPct: number, maxDrawdownVal: number, broker?: string, server?: string, avgHoldSeconds?: number }>>({});
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'history' | 'simulation'>('history');
  const [simAmount, setSimAmount] = useState<number>(1000);
  const [simCompound, setSimCompound] = useState<boolean>(true);
  const [simMultiplier, setSimMultiplier] = useState<number>(1.0);
  const [maxDrawdownInput, setMaxDrawdownInput] = useState<number>(50);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('mt5-theme') as 'light' | 'dark') || 'dark'; // Defaulting to dark as the base was mostly dark before
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('mt5-lang') as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('mt5-lang', lang);
  }, [lang]);

  const t = (key: keyof typeof translations.zh) => {
    return translations[lang][key] || translations.zh[key];
  };

  const timeframeLabels = useMemo(() => ({
    DAY: t('DAY'),
    WEEK: t('WEEK'),
    MONTH: t('MONTH'),
    QUARTER: t('QUARTER'),
    YEAR: t('YEAR'),
    ALL: t('ALL')
  }), [lang]);

  useEffect(() => {
    localStorage.setItem('mt5-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (settings.title) {
      document.title = settings.title;
    }
    if (settings.logoUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = parseImageUrl(settings.logoUrl);
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = parseImageUrl(settings.logoUrl);
        document.head.appendChild(newLink);
      }
    }
  }, [settings.title, settings.logoUrl]);

  const orderedAccounts = useMemo(() => {
    if (settings.accounts && Object.keys(settings.accounts).length > 0) {
      return (Object.values(settings.accounts) as AccountConfig[])
        .filter(a => !a.isHidden)
        .sort((a, b) => a.order - b.order);
    }
    const detected = Array.from(new Set<string>(deals.filter(d => d.account != null).map(d => d.account!.toString())));
    return detected.map((accStr: string, i: number) => ({
      account: parseInt(accStr, 10),
      label: accStr,
      isHidden: false,
      order: i
    } as AccountConfig));
  }, [settings.accounts, deals]);

  useEffect(() => {
    if (orderedAccounts.length > 0) {
      if (!selectedAccount || !orderedAccounts.find(a => a.account.toString() === selectedAccount)) {
        setSelectedAccount(orderedAccounts[0].account.toString());
      }
    }
  }, [orderedAccounts, selectedAccount]);

  const visibleDeals = useMemo(() => {
    if (!selectedAccount) return [];
    return deals.filter(d => d.account?.toString() === selectedAccount);
  }, [deals, selectedAccount]);

// Removed auth listener for temporary public access overrides

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', SITE_ID),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `settings/${SITE_ID}`);
      }
    );
    return () => unsubSettings();
  }, [SITE_ID]);

  useEffect(() => {
    // Fetch all accounts but filter/process based on SITE_ID if data is tagged
    const q = collection(db, 'accounts');
    const unsubAccounts = onSnapshot(
      q,
      (snapshot) => {
        const stats: Record<string, { maxDrawdownPct: number, maxDrawdownVal: number, broker?: string, server?: string, avgHoldSeconds?: number }> = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.account) {
            // If the account doc has a siteId, it must match current SITE_ID.
            // If it doesn't have a siteId, we allow it (global/legacy).
            if (!data.siteId || data.siteId === SITE_ID) {
              stats[data.account.toString()] = {
                maxDrawdownPct: data.maxDrawdownPct || 0,
                maxDrawdownVal: data.maxDrawdown || 0,
                broker: data.broker,
                server: data.server,
                avgHoldSeconds: data.avgHoldSeconds
              };
            }
          }
        });
        setAccountStatsMap(stats);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'accounts');
      }
    );
    return () => unsubAccounts();
  }, [SITE_ID]);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', SITE_ID), tempSettings, { merge: true });
      setShowSettingsModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${SITE_ID}`);
    }
  };

  const prepareSettings = () => {
    const detectedAccounts = new Set(deals.filter(d => d.account != null).map(d => d.account!.toString()));
    let initialAccounts: Record<string, AccountConfig> = { ...settings.accounts };
    let orderCounter = Object.keys(initialAccounts).length;
    detectedAccounts.forEach((accStr: string) => {
      if (!initialAccounts[accStr]) {
        initialAccounts[accStr] = {
          account: parseInt(accStr, 10),
          label: accStr,
          isHidden: false,
          order: orderCounter++
        };
      }
    });
    return { 
      title: settings.title || '', 
      logoUrl: settings.logoUrl || '', 
      accounts: initialAccounts, 
      links: settings.links || {},
      adminUsername: settings.adminUsername || '',
      adminPassword: settings.adminPassword || ''
    };
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = settings.adminUsername || 'admin';
    const targetPass = settings.adminPassword || 'admin';

    if (loginUser === targetUser && loginPass === targetPass) {
      setIsAdminLoggedIn(true);
      setShowLoginModal(false);
      setTempSettings(prepareSettings());
      setShowSettingsModal(true);
      setLoginError('');
      setLoginUser('');
      setLoginPass('');
    } else {
      setLoginError(t('loginFailed'));
    }
  };

  const handleOpenSettings = () => {
    if (isAdminLoggedIn) {
      setTempSettings(prepareSettings());
      setShowSettingsModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      // Basic public query
      const dealsQuery = query(
        collection(db, 'deals'),
        where('isPublic', '==', true)
      );
      
      const querySnapshot = await getDocs(dealsQuery);
      let fetchedDeals: Deal[] = [];
      
      // Get list of accounts for this site from settings to filter untagged deals
      const siteAccounts = settings.accounts ? Object.keys(settings.accounts).map(String) : [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Deal;
        const dealAccount = data.account?.toString();
        
        // Logical filter for "Independence":
        // 1. If deal is specifically tagged with SITE_ID, it belongs here.
        // 2. If deal has NO siteId, check if its account is listed in this site's settings.
        // 3. Fallback: If site has NO accounts configured yet, show all untagged data (backwards compatibility).
        const isTargeted = data.siteId === SITE_ID;
        const isMatchingAccount = dealAccount && siteAccounts.includes(dealAccount);
        const isLegacyGlobal = !data.siteId && siteAccounts.length === 0;

        if (isTargeted || isMatchingAccount || isLegacyGlobal) {
          fetchedDeals.push(data);
        }
      });

      fetchedDeals.sort((a, b) => a.time - b.time);
      setDeals(fetchedDeals);
      setLastSync(new Date());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [SITE_ID, settings.accounts]); // Re-fetch if site or its configured accounts change

  const dealsWithBalance = useMemo(() => {
    let currentBal = 0;
    return visibleDeals.map(d => {
      const net = d.profit + d.commission + d.swap;
      currentBal += net;
      return { ...d, balance: currentBal, net };
    });
  }, [visibleDeals]);

  const tradeDeals = useMemo(() => dealsWithBalance.filter(d => d.type === 0 || d.type === 1 || d.type === '0' || d.type === '1'), [dealsWithBalance]);

  const enrichedTradeDeals = useMemo(() => {
    const inventory: Record<string, { type: number, volume: number, time: number }[]> = {};
    const result: (Deal & { openTime?: number, durationString?: string, net: number })[] = [];

    // process chronologically 
    for (const deal of tradeDeals) {
      const symbol = deal.symbol;
      const currentType = (deal.type === 0 || deal.type === '0') ? 0 : 1;
      // MT5: Buy=0, Sell=1. To close a Buy, we Sell.
      const oppType = currentType === 0 ? 1 : 0;
      
      let remainingVol = Number(deal.volume);
      let firstOpenTime: number | undefined = undefined;

      if (!inventory[symbol]) inventory[symbol] = [];
      const inv = inventory[symbol];
      
      // Match opposite type inventory (FIFO)
      while (remainingVol > 0.00001 && inv.length > 0 && inv[0].type === oppType) {
        if (firstOpenTime === undefined) {
          firstOpenTime = inv[0].time;
        }
        
        if (inv[0].volume <= remainingVol + 0.00001) {
          remainingVol -= inv[0].volume;
          inv.shift();
        } else {
          inv[0].volume -= remainingVol;
          remainingVol = 0;
        }
      }
      
      // If there is still volume left, it's (partly or fully) an IN deal
      if (remainingVol > 0.00001) {
        inv.push({
          type: currentType,
          volume: remainingVol,
          time: deal.time
        });
      }

      let durationString = '';
      if (firstOpenTime !== undefined) {
        const diffS = Math.floor((deal.time - firstOpenTime) / 1000);
        const m = Math.floor(diffS / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (d > 0) durationString = `${d}d ${h % 24}h`;
        else if (h > 0) durationString = `${h}h ${m % 60}m`;
        else durationString = `${m}m`;
      }

      result.push({
        ...deal,
        openTime: firstOpenTime,
        durationString,
        net: (deal as any).net ?? (deal.profit + deal.commission + deal.swap)
      });
    }
    return result;
  }, [tradeDeals]);

  const aggregatedTableData = useMemo(() => {
    const map = new Map<string, any>();

    dealsWithBalance.forEach(deal => {
      let periodKey = '';
      let periodDisplay = '';
      let periodDisplayMobile = '';

      switch (timeframe) {
        case 'DAY':
          periodKey = formatInTimeZone(deal.time, TIMEZONE, 'yyyy-MM-dd');
          periodDisplay = formatInTimeZone(deal.time, TIMEZONE, 'yyyy.MM.dd');
          break;
        case 'WEEK': {
          const [y, m, d] = formatInTimeZone(deal.time, TIMEZONE, 'yyyy-MM-dd').split('-').map(Number);
          const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          const dayOfWeek = utcDate.getUTCDay();
          const diffToMonday = (dayOfWeek + 6) % 7;
          const startOfWeekMs = utcDate.getTime() - diffToMonday * 86400000;
          const endOfWeekMs = startOfWeekMs + 6 * 86400000;
          
          const formatUTC = (ms: number) => {
            const dt = new Date(ms);
            const yy = dt.getUTCFullYear();
            const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dt.getUTCDate()).padStart(2, '0');
            return `${yy}.${mm}.${dd}`;
          };

          const formatUTCMobile = (ms: number) => {
            const dt = new Date(ms);
            const yy = String(dt.getUTCFullYear()).slice(2);
            const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dt.getUTCDate()).padStart(2, '0');
            return `${yy}${mm}${dd}`;
          };
          
          periodKey = formatUTC(startOfWeekMs).replace(/\./g, '-');
          periodDisplay = `${formatUTC(startOfWeekMs)}~${formatUTC(endOfWeekMs)}`;
          periodDisplayMobile = `${formatUTCMobile(startOfWeekMs)}~${formatUTCMobile(endOfWeekMs)}`;
          break;
        }
        case 'MONTH':
          periodKey = formatInTimeZone(deal.time, TIMEZONE, 'yyyy-MM');
          periodDisplay = formatInTimeZone(deal.time, TIMEZONE, 'yyyy.MM');
          break;
        case 'QUARTER': {
          const year = formatInTimeZone(deal.time, TIMEZONE, 'yyyy');
          const month = parseInt(formatInTimeZone(deal.time, TIMEZONE, 'MM'), 10);
          const q = Math.ceil(month / 3);
          periodKey = `${year}-Q${q}`;
          periodDisplay = `${year} Q${q}`;
          break;
        }
        case 'YEAR':
          periodKey = formatInTimeZone(deal.time, TIMEZONE, 'yyyy');
          periodDisplay = `${formatInTimeZone(deal.time, TIMEZONE, 'yyyy')}年`;
          break;
      }

      if (!map.has(periodKey)) {
        map.set(periodKey, {
          id: periodKey,
          period: periodDisplay,
          periodMobile: periodDisplayMobile || periodDisplay,
          trades: 0,
          volume: 0,
          netProfit: 0,
          grossProfit: 0,
          grossLoss: 0,
          wins: 0,
          losses: 0,
          depositsWithdrawals: 0,
          isSingle: false,
          periodKey,
          startingBalance: deal.balance - deal.net,
          balance: 0
        });
      }

      const st = map.get(periodKey)!;
      
      const isTrade = deal.type === 0 || deal.type === 1 || deal.type === '0' || deal.type === '1';
      if (isTrade) {
        st.volume += Number(deal.volume) || 0;
        st.netProfit += Number(deal.net) || 0;
        
        // Count trades, wins, losses only for exit deals (profit !== 0)
        if (deal.profit !== 0 || (deal.profit === 0 && deal.swap !== 0)) {
          st.trades++;
          if (deal.net > 0) {
            st.wins++;
          } else if (deal.net < 0) {
            st.losses++;
          }
        }
        
        if (deal.net > 0) {
          st.grossProfit += Number(deal.net) || 0;
        } else {
          st.grossLoss += Math.abs(Number(deal.net) || 0);
        }
      } else if (deal.type === 2 || deal.type === '2') {
        st.depositsWithdrawals += Number(deal.net) || 0;
      }

      st.balance = deal.balance; // Always update with latest balance in period
    });

    // Return all periods that have any activity
    const periodSummaries = Array.from(map.values());
    
    return periodSummaries.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
  }, [dealsWithBalance, tradeDeals, timeframe]);

  const stats = useMemo(() => {
    let totalProfit = 0;
    let totalCommission = 0;
    let totalSwap = 0;
    let totalVolume = 0;
    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let maxDrawdown = 0;
    let maxDrawdownPct = 0;
    
    let peakBalance = 0;
    let isFirst = true;

    let initialBalance = 0;
    let totalInOut = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    dealsWithBalance.forEach(deal => {
      if (deal.type === 2 || deal.type === '2') {
        totalInOut += deal.net;
        if (deal.net > 0) totalDeposits += deal.net;
        else totalWithdrawals += deal.net;
      }
      
      if (isFirst) {
        peakBalance = deal.balance - deal.net;
        initialBalance = peakBalance;
        isFirst = false;
      }
      
      if (deal.type === 2 || deal.type === '2') {
        peakBalance += deal.net;
      } else {
        if (deal.balance > peakBalance) {
          peakBalance = deal.balance;
        } else {
          const drawdown = peakBalance - deal.balance;
          const pct = peakBalance > 0 ? (drawdown / peakBalance) * 100 : 0;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
          if (pct > maxDrawdownPct) maxDrawdownPct = pct;
        }
      }
    });

    let currentEquity = 0;
    let exitedTrades = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    tradeDeals.forEach(deal => {
      const net = deal.profit + deal.commission + deal.swap;
      totalProfit += net;
      totalCommission += deal.commission;
      totalSwap += deal.swap;
      totalVolume += Number(deal.volume) || 0;

      if (net > bestTrade) bestTrade = net;
      if (net < worstTrade) worstTrade = net;

      currentEquity += net;

      // Count trades, wins, losses only for exit deals (profit !== 0)
      if (deal.profit !== 0 || (deal.profit === 0 && deal.swap !== 0)) {
        exitedTrades++;
        if (net > 0) {
          wins++;
        } else if (net < 0) {
          losses++;
        }
      }

      if (net > 0) {
        grossProfit += net;
      } else if (net < 0) {
        grossLoss += Math.abs(net);
      }
    });

    const totalTrades = exitedTrades;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    return {
      totalProfit,
      totalCommission,
      totalSwap,
      totalTrades,
      totalVolume,
      winRate,
      profitFactor,
      maxDrawdown,
      maxDrawdownPct,
      grossProfit,
      grossLoss,
      wins,
      losses,
      totalInOut,
      initialBalance,
      totalDeposits,
      totalWithdrawals,
      bestTrade,
      worstTrade
    };
  }, [tradeDeals, dealsWithBalance]);

  const extendedStats = useMemo(() => {
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let peakBal = dealsWithBalance.length > 0 ? (dealsWithBalance[0].balance - dealsWithBalance[0].net) : 0;
    const initBal = peakBal;
    
    tradeDeals.forEach(deal => {
      const net = deal.profit + deal.commission + deal.swap;
      
      if (net > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (net < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
      
      if (deal.balance > peakBal) {
        peakBal = deal.balance;
      }
    });

    const maxFloatingProfit = peakBal - initBal;
    const avgWin = stats.wins > 0 ? stats.grossProfit / stats.wins : 0;
    const avgLoss = stats.losses > 0 ? stats.grossLoss / stats.losses : 0;
    const latestBalance = dealsWithBalance.length > 0 ? dealsWithBalance[dealsWithBalance.length - 1].balance : 0;

    // Approximate average hold time? Not possible exactly without entry time, 
    // we'll leave it as '-' or calculate a placeholder if we want to show the UI
    return {
      maxWinStreak,
      maxLossStreak,
      maxFloatingProfit: maxFloatingProfit > 0 ? maxFloatingProfit : 0,
      avgWin,
      avgLoss,
      latestBalance
    };
  }, [tradeDeals, dealsWithBalance, stats]);

  const equityCurve = useMemo(() => {
    const dailyMap = new Map<string, number>();
    
    tradeDeals.forEach(deal => {
      const dateKey = formatInTimeZone(deal.time, TIMEZONE, 'yy/MM/dd');
      const net = deal.profit + deal.commission + deal.swap;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + net);
    });

    let currentEquity = 0;
    const sortedData = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, dailyNet]) => {
        currentEquity += dailyNet;
        return {
          time: date,
          value: currentEquity
        };
      });
      
    if (sortedData.length > 0) {
      sortedData.unshift({ time: 'Start', value: 0 });
    }
    
    return sortedData;
  }, [tradeDeals]);

  const chartData = useMemo(() => {
    return aggregatedTableData.slice().reverse().map(row => ({
      date: row.periodKey,
      net: row.netProfit,
      display: row.period
    }));
  }, [aggregatedTableData]);

  const chartTitle = useMemo(() => {
    switch (timeframe) {
      case 'WEEK': return t('weeklyPL');
      case 'MONTH': return t('monthlyPL');
      case 'QUARTER': return t('quarterlyPL');
      case 'YEAR': return t('yearlyPL');
      default: return t('dailyPL');
    }
  }, [timeframe, lang]);

  const aggregatedRowPctTotal = useMemo(() => {
    return aggregatedTableData.reduce((acc, row) => {
      const pct = row.startingBalance !== 0 ? (row.netProfit / row.startingBalance) * 100 : 0;
      return acc + pct;
    }, 0);
  }, [aggregatedTableData]);

  const dailyAggregatedData = useMemo(() => {
    const map = new Map<string, any>();
    dealsWithBalance.forEach(deal => {
      const periodKey = formatInTimeZone(deal.time, TIMEZONE, 'yyyy-MM-dd');
      const periodDisplay = formatInTimeZone(deal.time, TIMEZONE, 'yyyy.MM.dd');

      if (!map.has(periodKey)) {
         map.set(periodKey, {
           periodKey,
           periodDisplay,
           netProfit: 0,
           trades: 0,
           startingBalance: deal.balance - deal.net,
         });
      }
      const st = map.get(periodKey)!;
      const isTrade = deal.type === 0 || deal.type === 1 || deal.type === '0' || deal.type === '1';
      if (isTrade) {
        if (deal.profit !== 0 || (deal.profit === 0 && deal.swap !== 0)) {
           st.trades++;
           st.netProfit += Number(deal.net) || 0;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  }, [dealsWithBalance]);

  const simMetrics = useMemo(() => {
    const baseDrawdown = 26.61;
    const currentMultiplier = Math.max(0, simMultiplier || 0);
    const validMaxDrawdownInput = Math.max(0, maxDrawdownInput || 0);

    const estMaxDrawdown = baseDrawdown * currentMultiplier;
    const recMaxMultiplier = baseDrawdown > 0 && validMaxDrawdownInput > 0 ? validMaxDrawdownInput / baseDrawdown : 0;
    
    // Risk progress (0 to 1) 
    // 若 25% 為低風險，往上指數增長。用 (estMaxDrawdown / validMaxDrawdownInput)^2 來呈現指數增長感。
    let riskProgress = 0;
    if (validMaxDrawdownInput > 0) {
      riskProgress = Math.pow(estMaxDrawdown / validMaxDrawdownInput, 2);
    } else {
      riskProgress = estMaxDrawdown > 0 ? 1 : 0;
    }
    
    if (riskProgress > 1) riskProgress = 1;
    if (riskProgress < 0) riskProgress = 0;

    let riskColor = 'from-green-neon to-green-400';
    let riskLevel = 0; // 0: low, 1: medium, 2: high

    // 25% 為低風險
    if (estMaxDrawdown <= 25) {
      riskLevel = 0;
      riskColor = 'from-green-neon to-green-400';
    } else {
      if (validMaxDrawdownInput > 0 && estMaxDrawdown > validMaxDrawdownInput * 0.8) {
        riskColor = 'from-red-500 to-red-neon';
        riskLevel = 2; // high risk
      } else {
        riskColor = 'from-yellow-400 to-orange-400';
        riskLevel = 1; // medium risk
      }
    }
    
    if (validMaxDrawdownInput > 0 && estMaxDrawdown > validMaxDrawdownInput) {
       riskLevel = 2;
       riskColor = 'from-red-500 to-red-neon';
    }

    return {
      baseDrawdown,
      estMaxDrawdown,
      recMaxMultiplier,
      riskProgress,
      riskColor,
      riskLevel
    };
  }, [simMultiplier, maxDrawdownInput]);

  const simulationResults = useMemo(() => {
    let totalDaysElapsed = 0;
    if (dealsWithBalance.length > 0) {
      const firstTrade = dealsWithBalance[0];
      totalDaysElapsed = Math.max(1, differenceInDays(new Date(), new Date(firstTrade.time)));
    }

    if (dailyAggregatedData.length === 0) return { curve: [{ time: 'Start', balance: simAmount }], total: simAmount, rows: [], totalDaysElapsed };
    
    let currentSimCapital = simAmount || 0;
    let currentSimProfit = 0;
    const curve: any[] = [{ time: 'Start', balance: currentSimCapital }];
    const rows: any[] = [];
    
    for (const row of dailyAggregatedData) {
      if (row.trades === 0) continue;
      
      const pct = (row.startingBalance > 0 ? row.netProfit / row.startingBalance : 0) * simMultiplier;
      
      let dayProfitForSim = 0;
      if (simCompound) {
        dayProfitForSim = currentSimCapital * pct;
        currentSimCapital += dayProfitForSim;
      } else {
        dayProfitForSim = (simAmount || 0) * pct;
        currentSimProfit += dayProfitForSim;
      }
      
      const dayTotalBal = simCompound ? currentSimCapital : (simAmount || 0) + currentSimProfit;
      
      curve.push({ time: row.periodDisplay, balance: dayTotalBal });
      rows.push({
        date: row.periodDisplay,
        pct: pct * 100,
        profit: dayProfitForSim,
        balance: dayTotalBal
      });
    }

    return { 
      curve, 
      total: simCompound ? currentSimCapital : (simAmount || 0) + currentSimProfit, 
      rows: rows.reverse(),
      totalDaysElapsed
    };
  }, [dailyAggregatedData, simAmount, simCompound, dealsWithBalance, simMultiplier]);

  return (
    <div className="relative min-h-screen text-text font-sans pb-20">
      <div className="noise-overlay" />
      <div className="glow-bg" />
      
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8">
        
        {/* HEADER */}
        <header className="pt-4 md:pt-8 pb-4 md:pb-7 border-b border-wire flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-5 w-full md:w-auto">
            <div className="relative w-10 h-10 md:w-24 md:h-24 shrink-0 rounded-xl md:rounded-2xl grid place-items-center bg-ink-2 overflow-hidden shadow-sm border border-wire">
              <div className="absolute inset-1 bg-gradient-to-br from-cyan-glow/10 to-transparent z-0" />
              {settings.logoUrl ? (
                <img src={parseImageUrl(settings.logoUrl)} alt="Logo" className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-display font-medium text-[20px] md:text-[40px] text-cyan-glow relative z-10 leading-none">M</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[16px] xs:text-[18px] sm:text-[20px] md:text-[34px] tracking-tight md:tracking-[0.06em] text-bright leading-tight uppercase drop-shadow-sm font-bold md:font-medium">
                {settings.title || t('appTitle')}
              </h1>
            </div>
          </div>
          <div className="text-left md:text-right flex flex-col md:items-end w-full md:w-auto">
            <div className="flex items-center justify-between md:justify-end gap-3 mb-2 md:mb-5">
              {orderedAccounts.length > 0 && (
                <div className="relative z-50">
                  <button
                    onClick={() => setIsAccountDropdownOpen(p => !p)}
                    onBlur={() => setTimeout(() => setIsAccountDropdownOpen(false), 200)}
                    className={`flex items-center justify-between transition-all duration-300 appearance-none bg-ink-2/80 backdrop-blur-md border ${isAccountDropdownOpen ? 'border-cyan-glow/50 ring-2 ring-cyan-glow/20' : 'border-wire/80 hover:border-dim/50'} text-bright text-[12px] sm:text-[13px] rounded-lg font-sans tracking-wide pl-1.5 pr-3 h-10 focus:outline-none cursor-pointer min-w-[200px] sm:min-w-[240px] max-w-[280px] shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={selectedAccount}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {orderedAccounts.find(a => a.account.toString() === selectedAccount)?.logoUrl ? (
                            <img 
                              src={parseImageUrl(orderedAccounts.find(a => a.account.toString() === selectedAccount)!.logoUrl!)} 
                              alt="Account Logo" 
                              className="w-7 h-7 rounded-md object-cover shadow-sm bg-ink-3 shrink-0 border border-wire/30" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-md shadow-sm bg-ink-3 shrink-0 border border-wire/30 flex items-center justify-center">
                              <span className="font-mono text-[10px] text-dim">{orderedAccounts.find(a => a.account.toString() === selectedAccount)?.label?.charAt(0) || selectedAccount.charAt(0)}</span>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                      <span className="truncate text-left font-medium">
                        {orderedAccounts.find(a => a.account.toString() === selectedAccount)?.label || selectedAccount}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isAccountDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-1"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-dim transition-colors hover:text-bright shrink-0" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {isAccountDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 md:right-0 md:left-auto mt-1.5 w-full min-w-[200px] sm:min-w-[240px] bg-ink-1/95 border border-wire/60 rounded-xl shadow-[0_16px_40px_rgb(0,0,0,0.3)] overflow-hidden z-[100] backdrop-blur-xl"
                      >
                        <div className="flex flex-col py-1.5 max-h-[250px] overflow-y-auto w-full">
                          {orderedAccounts.map(acc => (
                            <button
                              key={acc.account}
                              onClick={() => {
                                setSelectedAccount(acc.account.toString());
                                setIsAccountDropdownOpen(false);
                              }}
                              className={`relative text-left px-2 py-2 text-[12px] sm:text-[13px] font-sans transition-colors whitespace-nowrap outline-none flex items-center justify-between w-full group ${
                                selectedAccount === acc.account.toString()
                                  ? 'bg-cyan-glow/15 text-cyan-glow font-medium'
                                  : 'text-dim hover:bg-ink-3 hover:text-bright'
                              }`}
                            >
                              {selectedAccount === acc.account.toString() && (
                                <motion.div layoutId="account-active-indicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-glow" />
                              )}
                              <div className="flex items-center gap-2.5 truncate ml-1">
                                {acc.logoUrl ? (
                                  <img 
                                    src={parseImageUrl(acc.logoUrl)} 
                                    alt="Account Logo" 
                                    className={`w-7 h-7 rounded-md object-cover shadow-sm bg-ink-3 shrink-0 transition-all ${selectedAccount === acc.account.toString() ? 'border shadow-[0_0_8px_var(--color-cyan-glow)] border-cyan-glow/50' : 'opacity-80 group-hover:opacity-100 border border-wire/30'}`} 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className={`w-7 h-7 rounded-md shadow-sm bg-ink-2 shrink-0 flex items-center justify-center transition-all ${selectedAccount === acc.account.toString() ? 'border shadow-[0_0_8px_var(--color-cyan-glow)] border-cyan-glow/50' : 'opacity-80 group-hover:opacity-100 border border-wire/30'}`}>
                                    <span className={`font-mono text-[10px] ${selectedAccount === acc.account.toString() ? 'text-cyan-glow' : 'text-dim'}`}>{acc.label?.charAt(0) || acc.account.toString().charAt(0)}</span>
                                  </div>
                                )}
                                <span className="truncate">{acc.label || acc.account.toString()}</span>
                              </div>
                              {selectedAccount === acc.account.toString() && (
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-glow ml-2 flex-shrink-0 mr-1" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-lg border border-wire bg-ink-2 text-dim hover:text-bright transition-colors overflow-hidden"
                  title={t('toggleTheme')}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={theme}
                      initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </motion.div>
                  </AnimatePresence>
                </button>
                <button
                  onClick={() => setLang(prev => prev === 'zh' ? 'en' : 'zh')}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-lg border border-wire bg-ink-2 text-dim hover:text-bright transition-colors font-mono text-[11px] font-bold overflow-hidden"
                  title={t('toggleLanguage')}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={lang}
                      initial={{ opacity: 0, y: 15, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      exit={{ opacity: 0, y: -15, rotateX: 90 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      {lang === 'zh' ? 'EN' : '中'}
                    </motion.div>
                  </AnimatePresence>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-start md:justify-end gap-1.5 font-mono text-[9px] md:text-[11px] tracking-[0.12em] text-muted uppercase opacity-70">
              <span 
                onClick={handleOpenSettings}
                className={`w-1.5 h-1.5 rounded-full cursor-pointer hover:scale-150 transition-transform shadow-[0_0_6px_var(--color-green-neon)] ${loading ? 'bg-gold animate-pulse shadow-[0_0_6px_var(--color-gold)]' : 'bg-green-neon'}`} 
              />
              {loading ? t('loading') : lastSync ? `${t('lastSync')}: ${formatInTimeZone(lastSync, TIMEZONE, 'HH:mm:ss')}` : t('monitoring')}
            </div>
          </div>
        </header>

        {loading && deals.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-wire border-t-cyan-glow rounded-full animate-spin" />
            <div className="font-mono text-[13px] tracking-[0.1em] text-muted text-center uppercase">{t('loading')}</div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedAccount}-${lang}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* KPI STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mt-7">
              <KPIBox 
                accent="bg-cyan-glow" 
                label={t('totalPL')} 
                value={`$${formatNum(stats.totalProfit)}`} 
                isPositive={stats.totalProfit >= 0}
                sub={`${t('grossProfit')}: $${formatNum(stats.grossProfit)}`}
                bg="P/L" 
              />
              <KPIBox 
                accent="bg-green-neon" 
                label={t('winRate')} 
                value={`${formatNum(stats.winRate)}%`} 
                sub={`${stats.wins} ${t('wins')} / ${stats.losses} ${t('losses')}`}
                bg="%" 
                colorClass="text-bright"
              />
              <KPIBox 
                accent="bg-gold" 
                label={t('profitFactor')} 
                value={formatNum(stats.profitFactor)} 
                sub={t('profitFactor')}
                bg="PF" 
                colorClass="text-bright"
              />
              <KPIBox 
                accent="bg-blue-500" 
                label={t('totalTrades')} 
                value={stats.totalTrades.toString()} 
                sub={t('historyTrades')}
                bg="#" 
                colorClass="text-bright"
              />
              <KPIBox 
                accent="bg-purple-glow" 
                label={t('accVolume')} 
                value={formatNum(stats.totalVolume)} 
                sub={t('accTradeVolume')}
                bg="L" 
                colorClass="text-bright"
              />
              <KPIBox 
                accent="bg-red-neon" 
                label={t('maxDrawdown')} 
                value={
                  <div className="flex flex-col">
                    <span>${formatNum(accountStatsMap[selectedAccount]?.maxDrawdownVal || stats.maxDrawdown)}</span>
                    <span className="text-[13px] xs:text-[15px] sm:text-[18px] lg:text-[20px] opacity-80 mt-0.5">({formatNum(accountStatsMap[selectedAccount]?.maxDrawdownPct || stats.maxDrawdownPct)}%)</span>
                  </div>
                }
                sub={t('maxDrawdown')}
                isPositive={false}
                bg="DD" 
              />
            </div>

            {/* LEFT SIDEBAR STATS (MOVED UP) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              {/* ACCOUNT INFO */}
              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex items-center gap-3 border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <Landmark className="w-4 h-4 text-blue-400" />
                  <span className="font-display tracking-[0.05em] text-bright font-medium text-[14px]">{t('accountInfo')}</span>
                </div>
                <div className="flex flex-col gap-3.5 relative z-10">
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('balance')}</span>
                    <span className="font-mono text-[14px] text-blue-400 tabular-nums">${formatNum(extendedStats.latestBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('equity')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">${formatNum(extendedStats.latestBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('floatingPL')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">+0.00</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('totalDeposits')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">${formatNum(stats.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('totalWithdrawals')}</span>
                    <span className="font-mono text-[14px] text-red-neon tabular-nums">-${formatNum(Math.abs(stats.totalWithdrawals))}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('broker')}</span>
                    <span className="font-mono text-[14px] text-muted">{accountStatsMap[selectedAccount]?.broker || settings.links?.broker || t('notAvailable')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('server')}</span>
                    <span className="font-mono text-[14px] text-muted">{accountStatsMap[selectedAccount]?.server || t('notAvailable')}</span>
                  </div>
                </div>
              </div>

              {/* OVERALL PERFORMANCE */}
              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex items-center gap-3 border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="font-display tracking-[0.05em] text-bright font-medium text-[14px]">{t('overallPerformance')}</span>
                </div>
                <div className="flex flex-col gap-3.5 relative z-10">
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('totalPL')}</span>
                    <span className={`font-mono text-[14px] tabular-nums ${stats.totalProfit >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                      {stats.totalProfit >= 0 ? '+' : ''}{formatNum(stats.totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('winRate')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">
                      <span className="text-muted text-[12px] mr-1">({stats.wins}{t('wins')} / {stats.losses}{t('losses')})</span> {formatNum(stats.winRate)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('profitFactor')}</span>
                    <span className="font-mono text-[14px] text-cyan-glow tabular-nums">{formatNum(stats.profitFactor)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('avgWin')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">+{formatNum(extendedStats.avgWin)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('avgLoss')}</span>
                    <span className="font-mono text-[14px] text-red-neon tabular-nums">-{formatNum(extendedStats.avgLoss)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('maxWinStreak')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">{extendedStats.maxWinStreak} {t('dealsSummary')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('maxLossStreak')}</span>
                    <span className="font-mono text-[14px] text-red-neon tabular-nums">{extendedStats.maxLossStreak} {t('dealsSummary')}</span>
                  </div>
                </div>
              </div>

              {/* DRAWDOWN ANALYSIS */}
              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex items-center gap-3 border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="font-display tracking-[0.05em] text-bright font-medium text-[14px]">{t('drawdownAnalysis')}</span>
                </div>
                <div className="flex flex-col gap-3.5 relative z-10">
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('maxDrawdown')}</span>
                    <span className="font-mono text-[14px] text-red-neon tabular-nums">-${formatNum(accountStatsMap[selectedAccount]?.maxDrawdownVal || stats.maxDrawdown)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('maxFloatingProfit')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">+{formatNum(extendedStats.maxFloatingProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('bestTrade')}</span>
                    <span className="font-mono text-[14px] text-green-neon tabular-nums">${formatNum(stats.bestTrade)}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('worstTrade')}</span>
                    <span className="font-mono text-[14px] text-red-neon tabular-nums">-${formatNum(Math.abs(stats.worstTrade))}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('totalTrades')}</span>
                    <span className="font-mono text-[14px] text-cyan-glow tabular-nums">{stats.totalTrades} {t('dealsSummary')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('totalVolume')}</span>
                    <span className="font-mono text-[14px] text-gold tabular-nums">{formatNum(stats.totalVolume)} {t('volume')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="font-mono text-[13px] text-dim group-hover:text-bright transition-colors">{t('avgHoldTime')}</span>
                    <span className="font-mono text-[14px] text-muted tabular-nums">
                      {accountStatsMap[selectedAccount]?.avgHoldSeconds != null ? (
                        `${Math.floor(accountStatsMap[selectedAccount].avgHoldSeconds! / 3600)}h ${Math.floor((accountStatsMap[selectedAccount].avgHoldSeconds! % 3600) / 60)}m`
                      ) : t('notAvailable')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CHARTS GRID TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col h-[340px]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex justify-between items-start border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <LineChart className="w-4 h-4 text-green-400" />
                    <span className="font-mono tracking-[0.05em] text-bright font-medium text-[14px]">{t('equityCurve')}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono tabular-nums text-[24px] tracking-[0.02em] ${stats.totalProfit >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                      ${formatNum(stats.totalProfit)}
                    </div>
                    <div className="font-mono text-[12px] text-dim mt-0.5 text-right">{t('totalPL')}</div>
                  </div>
                </div>
                <div className="flex-1 w-full relative z-10 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-cyan-glow)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="var(--color-cyan-glow)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-wire)" vertical={false} />
                      <XAxis dataKey="time" stroke="var(--color-dim)" tick={{ fill: 'var(--color-dim)', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} minTickGap={30} />
                      <YAxis stroke="var(--color-dim)" tick={{ fill: 'var(--color-dim)', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${formatNum(val)}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-wire)', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                        itemStyle={{ color: 'var(--color-cyan-glow)' }}
                        formatter={(value: number) => [`$${formatNum(value)}`, t('totalPL')]}
                      />
                      <Area type="monotone" dataKey="value" stroke="var(--color-cyan-glow)" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col h-[340px]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex items-center gap-3 border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono tracking-[0.05em] text-bright font-medium text-[14px]">{chartTitle}</span>
                </div>
                <div className="flex-1 w-full relative z-10 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-wire)" vertical={false} />
                      <XAxis dataKey="display" stroke="var(--color-dim)" tick={{ fill: 'var(--color-dim)', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} minTickGap={10} />
                      <Tooltip 
                        cursor={{fill: 'var(--color-wire)', opacity: 0.5}}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const val = Number(payload[0].value);
                            const isWin = val >= 0;
                            return (
                              <div className="bg-ink-3 border border-wire rounded-lg p-2.5 shadow-sm font-mono text-[13px]">
                                <div className="text-dim mb-1">{label}</div>
                                <div style={{ color: isWin ? 'var(--color-green-neon)' : 'var(--color-red-neon)' }}>
                                  {t('profitDetail')} : ${formatNum(val)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.net >= 0 ? "var(--color-green-neon)" : "var(--color-red-neon)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECENT TRADES (MOVED) */}
              <div className="bg-ink-2 border border-wire rounded-xl shadow-sm p-5 lg:p-6 relative overflow-hidden flex flex-col h-[340px]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,200,224,0.04),transparent)] pointer-events-none" />
                <div className="flex flex-wrap gap-3 items-center justify-between border-b border-wire/40 pb-4 mb-4 relative z-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="font-mono tracking-[0.05em] text-bright font-medium text-[14px]">{t('recentTrades')}</span>
                  </div>
                  <div className="px-3 py-1 bg-cyan-glow/10 border border-cyan-glow/20 rounded-full font-mono text-[11px] text-cyan-glow">
                    {t('latest10')}
                  </div>
                </div>
                <div className="flex flex-col divide-y divide-wire/20 overflow-y-auto flex-1 relative z-10 -mx-5 lg:-mx-6">
                  {tradeDeals.length === 0 && (
                    <div className="p-10 text-center font-mono text-[13px] text-muted">
                      {t('noTradeRecord')}
                    </div>
                  )}
                  {[...enrichedTradeDeals].filter(d => d.openTime !== undefined).reverse().slice(0, 10).map((deal, i) => {
                    const net = deal.net ?? (deal.profit + deal.commission + deal.swap);
                    const isWin = net >= 0;
                    return (
                      <div key={i} className="flex justify-between items-center py-2.5 px-4 relative hover:bg-ink-3 border-b border-wire/20 transition-colors group shrink-0">
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? 'bg-green-neon shadow-[0_0_8px_var(--color-green-neon)]' : 'bg-red-neon shadow-[0_0_8px_var(--color-red-neon)]'}`} />
                        <div className="flex flex-col gap-0.5 pl-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[13px] text-bright font-bold">
                              {deal.type === 0 || deal.type === '0' ? 'Buy' : 'Sell'} {deal.volume}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                              <span>#{deal.ticket}</span>
                              <span>{deal.symbol}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-dim whitespace-nowrap opacity-80">
                            <span>{deal.openTime ? formatInTimeZone(deal.openTime, TIMEZONE, 'MM-dd HH:mm') : ''} → {formatInTimeZone(deal.time, TIMEZONE, 'MM-dd HH:mm')}</span>
                            {deal.durationString && (
                              <>
                                <span>·</span>
                                <span>{deal.durationString}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={`font-mono text-[14px] font-bold tracking-tight text-right shrink-0 ml-4 ${isWin ? 'text-green-neon' : 'text-red-neon'}`}>
                          {isWin ? '+' : ''}{formatNum(net)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MAIN TABS */}
            <div className="flex items-center justify-center mt-12 mb-8">
              <div className="inline-grid grid-cols-2 p-1.5 bg-ink-3/80 backdrop-blur-md border border-wire rounded-full shadow-inner relative isolation-auto w-full max-w-md">
                <div 
                  className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-500 ease-out z-0"
                  style={{ 
                    transform: mainTab === 'history' ? 'translateX(6px)' : 'translateX(calc(100% + 6px))',
                    backgroundColor: mainTab === 'history' ? 'var(--color-cyan-glow)' : 'var(--color-green-neon)',
                    boxShadow: mainTab === 'history' ? '0 0 20px rgba(0, 200, 224, 0.4)' : '0 0 20px rgba(50, 255, 100, 0.4)'
                  }}
                />
                <button
                  onClick={() => setMainTab('history')}
                  className={`relative z-10 py-2.5 rounded-full font-display text-[16px] md:text-[18px] tracking-[0.06em] whitespace-nowrap transition-colors duration-300 ${mainTab === 'history' ? 'text-white dark:text-ink drop-shadow-sm font-semibold' : 'text-dim hover:text-bright'}`}
                >
                  {t('history')}
                </button>
                <button
                  onClick={() => setMainTab('simulation')}
                  className={`relative z-10 py-2.5 rounded-full font-display text-[16px] md:text-[18px] tracking-[0.06em] whitespace-nowrap transition-colors duration-300 ${mainTab === 'simulation' ? 'text-white dark:text-ink drop-shadow-sm font-semibold' : 'text-dim hover:text-bright'}`}
                >
                  {t('simulation')}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mainTab === 'history' ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full"
                >
                <div className="grid grid-cols-1 gap-6 mb-8 w-full">
                  
                  {/* FULL WIDTH: History List */}
                  <div className="flex flex-col gap-6 w-full">
                    
                    {/* TIMEFRAME SELECTOR CARDS - COMPACT ROW */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full">
                      {(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] as Timeframe[]).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf as Timeframe)}
                          className={`relative group flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl border transition-all duration-300 ${
                            timeframe === tf 
                              ? 'bg-ink-3 border-cyan-glow/60 shadow-[0_0_12px_rgba(0,200,224,0.08)]' 
                              : 'bg-ink-2/50 border-wire/40 hover:border-dim/30'
                          }`}
                        >
                          {timeframe === tf && (
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-glow/5 to-transparent rounded-xl pointer-events-none" />
                          )}
                          <span className={`font-display text-[12px] sm:text-[14px] tracking-tight transition-colors ${timeframe === tf ? 'text-cyan-glow font-semibold' : 'text-dim group-hover:text-bright'}`}>
                            {timeframeLabels[tf as Timeframe]}
                          </span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={timeframe}
                        initial={{ opacity: 0, scale: 0.98, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -5 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="w-full"
                      >
                        {/* MOBILE VIEW LIST - COMPACT ROW BASED */}
                        <div className="block md:hidden bg-ink-2/30 border border-wire/60 rounded-2xl overflow-hidden mb-8 shadow-sm w-full">
                          <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 bg-ink-3/50 font-mono text-[10px] text-muted tracking-wider uppercase border-b border-wire/40">
                            <div>{t('period')}</div>
                            <div className="text-right px-2">{t('netPL')}</div>
                          </div>
                          <div className="divide-y divide-wire/10 w-full">
                            {aggregatedTableData.map((row) => {
                              const isWin = row.netProfit >= 0;
                              const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : 0;
                              const pct = row.startingBalance !== 0 ? (row.netProfit / row.startingBalance) * 100 : 0;
                              return (
                                <div key={row.id} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 items-center hover:bg-ink-3/20 transition-colors relative group">
                                  {/* Left Accent */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? 'bg-green-neon shadow-[0_0_8px_var(--color-green-neon)]' : 'bg-red-neon shadow-[0_0_8px_var(--color-red-neon)]'}`} />
                                  
                                  <div className="flex flex-col min-w-0 pl-1">
                                    <div className="flex items-center gap-0 mb-1.5 flex-nowrap">
                                      <span className="font-mono text-[14px] text-bright font-medium tabular-nums tracking-tight leading-tight min-w-[125px] shrink-0">{row.periodMobile}</span>
                                      {!row.isSingle && (
                                        <span className="font-mono text-[10px] text-dim bg-ink-4/50 px-1.5 py-[1px] rounded border border-wire/40 shrink-0">
                                          {t('trades')} {row.trades}
                                        </span>
                                      )}
                                    </div>
                                    {row.isSingle ? (
                                      <div className="flex items-center gap-2 font-mono text-[11px] whitespace-nowrap mt-0.5">
                                        <span className={Number(row.dealType) === 0 ? 'text-blue-400' : 'text-orange-400'}>
                                          {Number(row.dealType) === 0 ? 'BUY' : 'SELL'} {row.symbol}
                                        </span>
                                        <span className="opacity-20 text-muted">|</span>
                                        <span className="text-muted">Lot: {row.volume}</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-nowrap items-center gap-0 font-mono text-[11px] mt-0.5 whitespace-nowrap overflow-x-visible">
                                        <div className="flex items-center justify-start gap-1.5 min-w-[108px] w-[108px] shrink-0">
                                          <span className="text-muted shrink-0">{t('winRate')}</span>
                                          <span className={`min-w-[46px] text-right tabular-nums shrink-0 ${isWin ? 'text-green-neon' : 'text-red-neon'}`}>
                                            {formatNum(winRate)}%
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                                          <span className="text-muted">{t('balance')}</span>
                                          <span className="text-cyan-glow/80 tabular-nums">${formatNum(row.balance)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-end min-w-[85px] pl-2 justify-center">
                                    <div className={`font-mono font-bold text-[14px] leading-none mb-1.5 ${isWin ? 'text-green-neon' : 'text-red-neon'}`}>
                                      {isWin ? '+' : ''}{formatNum(row.netProfit)}
                                    </div>
                                    <div className={`font-mono text-[10px] leading-none ${isWin ? 'text-green-neon/70' : 'text-red-neon/70'}`}>
                                      {pct >= 0 ? '+' : ''}{formatNum(pct)}%
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {aggregatedTableData.length === 0 && (
                            <div className="text-center py-14 font-mono text-[13px] text-muted bg-ink-2/30">{t('noTradeRecord')}</div>
                          )}
                        </div>

                        <div className="hidden md:block overflow-auto max-h-[70vh] md:max-h-none md:overflow-visible border border-wire/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-ink-2/80 backdrop-blur-md w-full">
                          <table className="w-full border-collapse min-w-[700px] relative">
                            <thead className="sticky top-0 z-20">
                              <tr className="bg-ink-3/95 backdrop-blur-sm border-b border-wire shadow-sm">
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim pl-5 pr-4 py-3 text-left font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('period')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('trades')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('volume')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('netPLPct')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('winRate')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('profitVal')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('depositWithdrawal')}</th>
                                <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-3 text-right font-normal uppercase pr-5 whitespace-nowrap">{t('balance')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aggregatedTableData.map((row) => {
                                const isWin = row.netProfit >= 0;
                                const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : 0;
                                const pct = row.startingBalance !== 0 ? (row.netProfit / row.startingBalance) * 100 : 0;

                                return (
                                  <tr 
                                    key={row.id} 
                                    className="border-b border-wire/60 transition-colors hover:bg-[rgba(0,200,224,0.025)] last:border-b-0 relative group"
                                  >
                                    <td className="relative px-5 py-2 text-left border-r border-wire/30">
                                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? 'bg-green-neon shadow-[0_0_8px_var(--color-green-neon)]' : 'bg-red-neon shadow-[0_0_8px_var(--color-red-neon)]'}`} />
                                      <div className="font-mono tabular-nums text-[13px] sm:text-[14px] tracking-tight text-bright whitespace-nowrap">{row.period}</div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[14px] text-body text-right whitespace-nowrap border-r border-wire/30">
                                      {row.trades}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[14px] text-dim text-right whitespace-nowrap border-r border-wire/30">
                                      {formatNum(row.volume)}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[14px] border-r border-wire/30 align-middle">
                                      <div className={`flex items-center justify-end font-medium whitespace-nowrap ${isWin ? 'text-green-neon' : 'text-red-neon'}`}>
                                        <span className="w-[75px] text-right">{isWin ? '+' : ''}{formatNum(row.netProfit)}</span>
                                        <span className="mx-2 text-dim font-normal">/</span>
                                        <span className="w-[65px] text-right">{pct >= 0 ? '+' : ''}{formatNum(pct)}%</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[14px] text-body text-right whitespace-nowrap border-r border-wire/30">
                                      {formatNum(winRate)}%
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[14px] border-r border-wire/30 align-middle">
                                      <div className="flex items-center justify-end whitespace-nowrap">
                                        <span className="w-[75px] text-right text-green-neon">+{formatNum(row.grossProfit)}</span>
                                        <span className="mx-2 text-dim font-normal">/</span>
                                        <span className="w-[75px] text-right text-red-neon">-{formatNum(row.grossLoss)}</span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 font-mono text-[14px] text-right whitespace-nowrap border-r border-wire/30 ${row.depositsWithdrawals >= 0 ? (row.depositsWithdrawals > 0 ? 'text-blue-400' : 'text-dim') : 'text-red-neon'}`}>
                                      {row.depositsWithdrawals > 0 ? '+' : ''}{formatNum(row.depositsWithdrawals)}
                                    </td>
                                    <td className={`pr-5 pl-4 py-2 font-mono text-[14px] text-right whitespace-nowrap ${Number(formatNum(row.balance)) >= 0 ? "text-cyan-glow" : "text-red-neon"}`}>
                                      ${formatNum(row.balance)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {aggregatedTableData.length > 0 && (
                                <tr className="border-t-2 border-wire bg-[rgba(0,200,224,0.03)] font-medium">
                                  <>
                                    <td className="px-5 py-3 text-left border-r border-wire/30 font-display text-[15px] tracking-[0.04em] text-bright">
                                      {t('total')}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[14px] text-body text-right whitespace-nowrap border-r border-wire/30">
                                      {stats.totalTrades}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[14px] text-body text-right whitespace-nowrap border-r border-wire/30">
                                      {formatNum(stats.totalVolume)}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[14px] border-r border-wire/30 align-middle">
                                      <div className={`flex items-center justify-end font-medium whitespace-nowrap ${stats.totalProfit >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                                        <span className="w-[75px] text-right">{stats.totalProfit >= 0 ? '+' : ''}{formatNum(stats.totalProfit)}</span>
                                        <span className="mx-2 text-dim font-normal">/</span>
                                        <span className="w-[65px] text-right">{aggregatedRowPctTotal >= 0 ? '+' : ''}{formatNum(aggregatedRowPctTotal)}%</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[14px] text-body text-right whitespace-nowrap border-r border-wire/30">
                                      {formatNum(stats.winRate)}%
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[14px] border-r border-wire/30 align-middle">
                                      <div className="flex items-center justify-end whitespace-nowrap">
                                        <span className="w-[75px] text-right text-green-neon">+{formatNum(stats.grossProfit)}</span>
                                        <span className="mx-2 text-dim font-normal">/</span>
                                        <span className="w-[75px] text-right text-red-neon">-{formatNum(stats.grossLoss)}</span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-3 font-mono text-[14px] text-right whitespace-nowrap border-r border-wire/30 ${stats.totalInOut >= 0 ? (stats.totalInOut > 0 ? 'text-blue-400' : 'text-dim') : 'text-red-neon'}`}>
                                      {stats.totalInOut > 0 ? '+' : ''}{formatNum(stats.totalInOut)}
                                    </td>
                                    <td className="pr-5 pl-4 py-3 font-mono text-[14px] text-right whitespace-nowrap">
                                    </td>
                                  </>
                                </tr>
                              )}
                              {aggregatedTableData.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="py-[60px] px-4 text-center">
                                    <div className="font-mono text-[13px] tracking-[0.1em] text-muted mt-2.5">{t('noTradeRecord')}</div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
        </motion.div>
          ) : (
                <motion.div
                  key="simulation"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="mt-2 flex flex-col gap-6"
                >
                <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 border border-wire/60 rounded-2xl bg-ink-2/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  <div className="relative z-10 font-mono text-[11px] sm:text-[13px] text-dim">{t('copySimulationDesc')}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                    <div className="flex flex-col">
                      <label className="block font-mono text-[12px] tracking-[0.1em] text-dim mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {t('simAmountLabel')}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group/toggle">
                          <input 
                            type="checkbox" 
                            checked={simCompound}
                            onChange={(e) => setSimCompound(e.target.checked)}
                            className="sr-only" 
                          />
                          <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center transition-colors ${simCompound ? 'bg-green-neon border-green-neon' : 'bg-transparent border-wire'}`}>
                            {simCompound && <svg className="w-2.5 h-2.5 text-ink-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span>{t('compoundInterest')}</span>
                        </label>
                      </label>
                      <div className="relative group/input">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-neon/40 to-cyan-glow/40 rounded-xl blur opacity-0 group-focus-within/input:opacity-30 transition duration-500"></div>
                        <input 
                          type="number" min="0"
                          value={simAmount}
                          onChange={(e) => setSimAmount(Math.max(0, Number(e.target.value)))}
                          className="w-full relative z-10 bg-ink-4/80 border border-wire rounded-xl px-5 py-3.5 font-mono text-[18px] text-bright focus:outline-none focus:border-green-neon/50 focus:bg-ink-3 transition-colors shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="block font-mono text-[12px] tracking-[0.1em] text-dim mb-3 flex items-center gap-2">
                        {t('simMultiplierLabel')} <span className="text-muted">({t('simMultiplierDesc')})</span>
                      </label>
                      <div className="relative group/input">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-neon/40 to-cyan-glow/40 rounded-xl blur opacity-0 group-focus-within/input:opacity-30 transition duration-500"></div>
                        <input 
                          type="number" step="0.1" min="0"
                          value={simMultiplier}
                          onChange={(e) => setSimMultiplier(Math.max(0, Number(e.target.value)))}
                          className="w-full relative z-10 bg-ink-4/80 border border-wire rounded-xl px-5 py-3.5 font-mono text-[18px] text-bright focus:outline-none focus:border-green-neon/50 focus:bg-ink-3 transition-colors shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="block font-mono text-[12px] tracking-[0.1em] text-dim mb-3 flex items-center gap-2">
                        {t('maxTolerableDrawdown')}
                      </label>
                      <div className="relative group/input">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-neon/40 to-cyan-glow/40 rounded-xl blur opacity-0 group-focus-within/input:opacity-30 transition duration-500"></div>
                        <input 
                          type="number" min="0" max="100"
                          value={maxDrawdownInput}
                          onChange={(e) => setMaxDrawdownInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full relative z-10 bg-ink-4/80 border border-wire rounded-xl px-5 py-3.5 font-mono text-[18px] text-bright focus:outline-none focus:border-green-neon/50 focus:bg-ink-3 transition-colors shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10 mt-2">
                    <div className="flex flex-col border border-wire/60 bg-ink-3/50 rounded-xl p-3 sm:p-4">
                      <div className="font-mono text-[11px] sm:text-[12px] tracking-[0.1em] text-dim mb-1 sm:mb-2">{t('expectedProfit')}</div>
                      <div className={`font-display text-[18px] sm:text-[24px] tracking-wide mb-1 ${(simulationResults.total - (simAmount || 1)) >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                        {(simulationResults.total - (simAmount || 1)) > 0 ? '+' : ''}{formatNum(simulationResults.total - (simAmount || 0))}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-muted line-clamp-1 truncate">{simCompound ? t('baseCompoundTotal') : t('noCompoundTotal')} {simMultiplier.toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col border border-wire/60 bg-ink-3/50 rounded-xl p-3 sm:p-4">
                      <div className="font-mono text-[11px] sm:text-[12px] tracking-[0.1em] text-dim mb-1 sm:mb-2">{t('expectedROI')}</div>
                      <div className={`font-display text-[18px] sm:text-[24px] tracking-wide mb-1 ${(simulationResults.total / (simAmount || 1)) > 1 ? 'text-green-neon' : 'text-red-neon'}`}>
                        {(simulationResults.total / (simAmount || 1) * 100 - 100) > 0 ? '+' : ''}{((simulationResults.total / (simAmount || 1) * 100) - 100).toFixed(2)}%
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-muted line-clamp-1 truncate">{t('baseCapitalTotal')}</div>
                    </div>

                    <div className="flex flex-col border border-wire/60 bg-ink-3/50 rounded-xl p-3 sm:p-4">
                      <div className="font-mono text-[11px] sm:text-[12px] tracking-[0.1em] text-dim mb-1 sm:mb-2">{t('estimatedMaxDD')}</div>
                      <div className="font-display text-[18px] sm:text-[24px] tracking-wide mb-1 text-red-neon">
                        -{simMetrics.estMaxDrawdown.toFixed(2)}%
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-muted line-clamp-1 truncate">{t('baseDrawdownTotal')} {simMultiplier.toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col border border-wire/60 bg-ink-3/50 rounded-xl p-3 sm:p-4">
                      <div className="font-mono text-[11px] sm:text-[12px] tracking-[0.1em] text-dim mb-1 sm:mb-2">{t('recMaxMultiplier')}</div>
                      <div className="font-display text-[18px] sm:text-[24px] tracking-wide mb-1 text-yellow-400">
                        {simMetrics.recMaxMultiplier.toFixed(2)}x
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-muted line-clamp-1 truncate">{t('basedOn')}</div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-3">
                    <div className="font-mono text-[12px] tracking-[0.1em] text-dim mb-3">{t('riskAssessment')}</div>
                    <div className="w-full h-3 bg-ink-4 border border-wire/50 rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${simMetrics.riskColor} transition-all duration-700 ease-out`} 
                        style={{ width: `${simMetrics.riskProgress * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 font-mono text-[11px] text-muted">
                      <span>{t('lowRisk')}</span>
                      <span className={`font-medium ${simMetrics.riskLevel === 2 ? 'text-red-neon' : (simMetrics.riskLevel === 1 ? 'text-yellow-400' : 'text-green-neon')}`}>
                        {simMetrics.riskLevel === 2 ? t('highRisk') : (simMetrics.riskLevel === 1 ? t('mediumRisk') : t('lowRisk'))}
                      </span>
                      <span>{t('highRisk')}</span>
                    </div>
                  </div>

                  {simMultiplier > simMetrics.recMaxMultiplier && simMetrics.recMaxMultiplier > 0 && (
                    <div className="relative z-10 mt-2 p-3 bg-red-neon/10 border border-red-neon/30 rounded-xl text-red-neon text-[13px] flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{t('liquidationRisk')}</span>
                    </div>
                  )}
                </div>

                <div className="bg-ink-2/80 backdrop-blur-md border border-wire/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-5 lg:p-6 relative overflow-hidden h-[340px] flex flex-col">
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-neon/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <div className="font-display text-[16px] tracking-[0.14em] text-bright uppercase">{t('projectedCurve')}</div>
                    </div>
                    <div className="font-mono text-[12px] tracking-widest text-dim bg-ink-3 px-3 py-1 rounded-full border border-wire/50">
                      {simulationResults.totalDaysElapsed} {t('days')}
                    </div>
                  </div>
                  <div className="flex-1 relative z-10 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simulationResults.curve} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-green-neon)" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="var(--color-green-neon)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-wire)" vertical={false} />
                        <XAxis dataKey="time" stroke="var(--color-dim)" tick={{ fill: 'var(--color-dim)', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} minTickGap={30} />
                        <YAxis width={85} stroke="var(--color-dim)" domain={['auto', 'auto']} tick={{ fill: 'var(--color-dim)', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${formatNum(val)}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-wire)', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                          itemStyle={{ color: 'var(--color-green-neon)' }}
                          formatter={(value: number) => [`$${formatNum(value)}`, t('balance')]}
                        />
                        <Area type="monotone" dataKey="balance" stroke="var(--color-green-neon)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSim)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* MOBILE VIEW LIST - COMPACT */}
                <div className="block md:hidden bg-ink-2/30 border border-wire/60 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 bg-ink-3/50 font-mono text-[10px] text-muted tracking-wider uppercase border-b border-wire/40">
                    <div>{t('date')}</div>
                    <div className="text-right">{t('simProfit')}</div>
                    <div className="text-right pl-2 w-[85px]">{t('simTotal')}</div>
                  </div>
                  <div className="divide-y divide-wire/10">
                    {simulationResults.rows.map((row: any, i: number) => {
                      const isWin = row.profit >= 0;
                      return (
                        <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 items-center hover:bg-ink-3/20 transition-colors relative group">
                          {/* Left Accent */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? 'bg-green-neon shadow-[0_0_8px_var(--color-green-neon)]' : 'bg-red-neon shadow-[0_0_8px_var(--color-red-neon)]'}`} />
                          
                          <div className="flex flex-col min-w-0 pl-1">
                            <div className="font-mono text-[14px] text-bright font-medium tabular-nums tracking-tight truncate leading-tight mb-0.5">
                              {row.date}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap mt-0.5">
                              <span className="text-muted">{t('dailyROI')}</span>
                              <span className={isWin ? 'text-green-neon' : 'text-red-neon'}>
                                {row.pct >= 0 ? '+' : ''}{formatNum(row.pct, 2)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className={`font-mono font-bold text-[14px] text-right min-w-[50px] ${isWin ? 'text-green-neon' : 'text-red-neon'}`}>
                            {isWin ? '+' : ''}${formatNum(row.profit, 2)}
                          </div>
                          
                          <div className={`font-mono text-[13px] text-right pl-2 w-[85px] ${row.balance >= (simAmount || 0) ? 'text-cyan-glow/90' : 'text-red-neon/90'}`}>
                            ${formatNum(row.balance, 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {simulationResults.rows.length === 0 && (
                    <div className="text-center py-14 font-mono text-[13px] text-muted bg-ink-2/30">{t('noSimData')}</div>
                  )}
                </div>

                <div className="hidden md:block overflow-auto max-h-[70vh] md:max-h-none md:overflow-visible border border-wire/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-ink-2/80 backdrop-blur-md">
                  <table className="w-full border-collapse min-w-[500px] relative">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-ink-3/95 backdrop-blur-sm border-b border-wire shadow-sm">
                        <th className="font-mono text-[11px] tracking-[0.14em] text-dim pl-6 pr-4 py-4 text-left font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('date')}</th>
                        <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-4 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('dailyROI')}</th>
                        <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-4 text-right font-normal border-r border-wire/30 uppercase whitespace-nowrap">{t('simProfit')}</th>
                        <th className="font-mono text-[11px] tracking-[0.14em] text-dim px-4 py-4 text-right font-normal uppercase pr-6 whitespace-nowrap">{t('simTotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResults.rows.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-wire/40 transition-colors hover:bg-[rgba(50,255,100,0.03)] last:border-b-0 relative group">
                          <td className="px-6 py-3 text-left border-r border-wire/30 font-display tabular-nums text-[15px] tracking-[0.04em] text-bright relative">
                            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${row.pct >= 0 ? 'bg-green-neon shadow-[0_0_8px_var(--color-green-neon)]' : 'bg-red-neon shadow-[0_0_8px_var(--color-red-neon)]'}`} />
                            {row.date}
                          </td>
                          <td className={`px-4 py-3 font-mono text-[15px] text-right whitespace-nowrap border-r border-wire/30 ${row.pct >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                            {row.pct >= 0 ? '+' : ''}{formatNum(row.pct, 2)}%
                          </td>
                          <td className={`px-4 py-3 font-mono text-[15px] text-right whitespace-nowrap border-r border-wire/30 ${row.profit >= 0 ? 'text-green-neon' : 'text-red-neon'}`}>
                            {row.profit >= 0 ? '+' : ''}${formatNum(row.profit, 2)}
                          </td>
                          <td className={`pr-6 pl-4 py-3 font-mono text-[15px] text-right whitespace-nowrap ${row.balance >= (simAmount || 0) ? 'text-bright font-medium' : 'text-red-neon font-medium'}`}>
                            ${formatNum(row.balance, 2)}
                          </td>
                        </tr>
                      ))}
                      {simulationResults.rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-[40px] px-4 text-center">
                            <div className="font-mono text-[13px] tracking-[0.1em] text-muted">{t('noSimData')}</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
              )}
            </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        )}

        <footer className="mt-8 md:mt-12 pt-6 pb-4 border-t border-wire flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[11px] md:text-[12px] text-muted tracking-[0.08em] uppercase">
          <span className="order-2 md:order-1">{t('lastSync') !== 'Last Sync' ? '© 2026 AION CAPITAL 保留所有權利' : '© 2026 AION CAPITAL. All Rights Reserved.'}</span>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 order-1 md:order-2">
            {settings.links?.community ? <a href={settings.links.community} target="_blank" rel="noreferrer" className="hover:text-cyan-glow transition-all border-b border-transparent hover:border-cyan-glow pb-0.5">{t('community')}</a> : <span className="opacity-40">{t('community')}</span>}
            {settings.links?.broker ? <a href={settings.links.broker} target="_blank" rel="noreferrer" className="hover:text-cyan-glow transition-all border-b border-transparent hover:border-cyan-glow pb-0.5">{t('broker')}</a> : <span className="opacity-40">{t('broker')}</span>}
            {settings.links?.tutorial ? <a href={settings.links.tutorial} target="_blank" rel="noreferrer" className="hover:text-cyan-glow transition-all border-b border-transparent hover:border-cyan-glow pb-0.5">{t('tutorial')}</a> : <span className="opacity-40">{t('tutorial')}</span>}
            {settings.links?.contact ? <a href={settings.links.contact} target="_blank" rel="noreferrer" className="hover:text-cyan-glow transition-all border-b border-transparent hover:border-cyan-glow pb-0.5">{t('contact')}</a> : <span className="opacity-40">{t('contact')}</span>}
          </div>
        </footer>

        {/* LOGIN MODAL */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-ink-2 border border-wire rounded-2xl shadow-2xl w-full max-w-[400px] p-6 sm:p-8"
            >
              <h2 className="font-display text-xl text-bright mb-6 tracking-wider text-center uppercase">{t('adminLogin')}</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block font-mono text-[11px] tracking-[0.1em] text-muted mb-2 uppercase">{t('account')}</label>
                  <input 
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full bg-ink-4/50 border border-wire rounded-xl px-4 py-3 font-sans text-[14px] text-bright focus:outline-none focus:border-cyan-glow/50 focus:bg-ink-3 transition-colors"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] tracking-[0.1em] text-muted mb-2 uppercase">密碼 (Password)</label>
                  <input 
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full bg-ink-4/50 border border-wire rounded-xl px-4 py-3 font-sans text-[14px] text-bright focus:outline-none focus:border-cyan-glow/50 focus:bg-ink-3 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {loginError && (
                  <div className="text-red-neon text-[12px] font-mono text-center py-2 bg-red-neon/5 rounded-lg border border-red-neon/10">
                    {loginError}
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 py-3 bg-transparent border border-wire text-dim hover:text-bright rounded-xl font-mono text-[13px] uppercase transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-cyan-glow text-white rounded-xl font-mono text-[13px] font-bold uppercase hover:opacity-90 transition-all shadow-lg shadow-cyan-glow/20"
                  >
                    {t('login')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-ink-2 border border-wire rounded-xl shadow-xl w-full max-w-[500px] p-5 sm:p-8 relative max-h-[90vh] flex flex-col">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 text-dim hover:text-bright"
              >✕</button>
              <h2 className="font-display text-xl text-bright mb-6 tracking-wide flex items-center justify-between shrink-0">
                <div>{t('settings')}</div>
              </h2>
              <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2 flex-1">
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('label')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.title}
                    onChange={(e) => setTempSettings({...tempSettings, title: e.target.value})}
                    placeholder="MT5 Performance Monitor"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-sans text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('logoUrl')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.logoUrl}
                    onChange={(e) => setTempSettings({...tempSettings, logoUrl: e.target.value})}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('community')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.links?.community || ''}
                    onChange={(e) => setTempSettings({...tempSettings, links: {...tempSettings.links, community: e.target.value}})}
                    placeholder="https://example.com/community"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('broker')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.links?.broker || ''}
                    onChange={(e) => setTempSettings({...tempSettings, links: {...tempSettings.links, broker: e.target.value}})}
                    placeholder="https://example.com/broker"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('tutorial')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.links?.tutorial || ''}
                    onChange={(e) => setTempSettings({...tempSettings, links: {...tempSettings.links, tutorial: e.target.value}})}
                    placeholder="https://example.com/tutorial"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">{t('contact')}</label>
                  <input 
                    type="text" 
                    value={tempSettings.links?.contact || ''}
                    onChange={(e) => setTempSettings({...tempSettings, links: {...tempSettings.links, contact: e.target.value}})}
                    placeholder="https://example.com/contact"
                    className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                  />
                </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-wire pt-6 mt-2">
                    <div className="col-span-2 text-[11px] font-mono text-dim tracking-wider uppercase mb-1">管理權限 (Admin Credentials)</div>
                    <div>
                      <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">帳號 (Username)</label>
                      <input 
                        type="text" 
                        value={tempSettings.adminUsername || ''}
                        onChange={(e) => setTempSettings({...tempSettings, adminUsername: e.target.value})}
                        placeholder="admin"
                        className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] tracking-[0.1em] text-muted mb-2">密碼 (Password)</label>
                      <input 
                        type="text" 
                        value={tempSettings.adminPassword || ''}
                        onChange={(e) => setTempSettings({...tempSettings, adminPassword: e.target.value})}
                        placeholder="admin"
                        className="w-full bg-ink-3 border border-wire rounded-lg px-3 py-2 font-mono text-[14px] text-body focus:outline-none focus:ring-2 focus:ring-cyan-glow/30"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                  {tempSettings.accounts && (Object.values(tempSettings.accounts) as AccountConfig[]).sort((a,b) => a.order - b.order).map((acc, index) => (
                    <div key={acc.account} className="border border-wire p-3 bg-ink-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-xs text-bright">{t('account')}: {acc.account}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newAccs: Record<string, AccountConfig> = { ...tempSettings.accounts };
                              newAccs[acc.account.toString()].isHidden = !newAccs[acc.account.toString()].isHidden;
                              setTempSettings({ ...tempSettings, accounts: newAccs });
                            }}
                            className={`px-2 py-1 text-[12px] font-mono border ${acc.isHidden ? 'border-red-neon/30 text-red-neon' : 'border-green-neon/30 text-green-neon'}`}
                          >
                            {acc.isHidden ? t('hidden') : t('visible')}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-mono text-[11px] text-muted mb-1">{t('label')}</label>
                          <input 
                            type="text" 
                            value={acc.label}
                            onChange={(e) => {
                              const newAccs: Record<string, AccountConfig> = { ...tempSettings.accounts };
                              newAccs[acc.account.toString()].label = e.target.value;
                              setTempSettings({ ...tempSettings, accounts: newAccs });
                            }}
                            className="w-full bg-ink border border-wire px-2 py-1 font-mono text-[13px] text-body focus:outline-none focus:border-cyan-glow"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[11px] text-muted mb-1">{t('orderWeight')}</label>
                          <input 
                            type="number" 
                            value={acc.order}
                            onChange={(e) => {
                              const newAccs: Record<string, AccountConfig> = { ...tempSettings.accounts };
                              newAccs[acc.account.toString()].order = parseInt(e.target.value, 10) || 0;
                              setTempSettings({ ...tempSettings, accounts: newAccs });
                            }}
                            className="w-full bg-ink border border-wire px-2 py-1 font-mono text-[13px] text-body focus:outline-none focus:border-cyan-glow"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block font-mono text-[11px] text-muted mb-1">{t('logoUrl')}</label>
                          <input 
                            type="text" 
                            value={acc.logoUrl || ''}
                            onChange={(e) => {
                              const newAccs: Record<string, AccountConfig> = { ...tempSettings.accounts };
                              newAccs[acc.account.toString()].logoUrl = e.target.value;
                              setTempSettings({ ...tempSettings, accounts: newAccs });
                            }}
                            className="w-full bg-ink border border-wire px-2 py-1 font-mono text-[13px] text-body focus:outline-none focus:border-cyan-glow"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tempSettings.accounts || Object.keys(tempSettings.accounts).length === 0) && (
                    <div className="text-center font-mono text-[12px] text-muted py-4">
                      {t('noAccountData')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-between mt-4 pt-4 border-t border-wire shrink-0">
                <button 
                  onClick={() => {
                    setIsAdminLoggedIn(false);
                    setShowSettingsModal(false);
                  }}
                  className="px-4 py-2 bg-red-neon/10 border border-red-neon/30 text-red-neon rounded-lg font-mono text-[12px] hover:bg-red-neon/20 transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 ml-[-2px]" />
                  {t('logout')}
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="px-6 py-2 bg-transparent border border-wire text-dim hover:text-bright rounded-lg font-mono text-[14px]"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-cyan-glow text-white rounded-lg font-mono text-[14px] hover:opacity-90 transition-all"
                  >
                    {t('saveSettings')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function KPIBox({ 
  label, value, sub, bg, accent, isPositive, colorClass 
}: { 
  label: string, 
  value: React.ReactNode, 
  sub: string, 
  bg: string, 
  accent: string, 
  isPositive?: boolean, 
  colorClass?: string 
}) {
  let valColor = colorClass || 'text-bright';
  if (isPositive === true) valColor = 'text-green-neon';
  if (isPositive === false) valColor = 'text-red-neon';

  // Use a smaller baseline font and clamp so it naturally fits, avoiding truncations on long values.
  const isSuperLong = typeof value === 'string' && value.length > 10;

  return (
    <div className="bg-ink-2/80 backdrop-blur-md p-3.5 sm:p-5 relative overflow-hidden transition-colors hover:bg-ink-3 rounded-2xl border border-wire/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col justify-center min-h-[90px] sm:min-h-[110px]">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      <div className="font-mono text-[10px] sm:text-[12px] tracking-[0.05em] text-dim uppercase mb-1 sm:mb-2 truncate z-10 relative">
        {label}
      </div>
      <div className={`font-display font-semibold tabular-nums leading-tight tracking-tight ${valColor} break-all z-10 relative ${isSuperLong ? 'text-[15px] xs:text-[18px] sm:text-[22px] lg:text-[24px]' : 'text-[18px] xs:text-[22px] sm:text-[26px] lg:text-[28px]'}`}>
        {value}
      </div>
      <div className="mt-1.5 font-sans tabular-nums text-[10px] sm:text-[12px] text-dim break-all z-10 relative leading-tight">
        {sub}
      </div>
      <div className="absolute -right-2 -bottom-4 font-display font-bold text-[60px] sm:text-[80px] leading-none tracking-[0.02em] text-black/[0.02] pointer-events-none z-0">
        {bg}
      </div>
    </div>
  );
}

