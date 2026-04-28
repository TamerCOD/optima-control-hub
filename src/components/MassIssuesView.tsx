
import React, { useState, useEffect, useMemo } from 'react';
import { MassIssue, User, RoleDefinition, UserRole, IssueSeverity, IssueStatus, IssueSettings, CascadeNode, SeverityDefinition } from '../types';
import { 
    Plus, Search, CheckCircle, Clock, 
    Edit2, Trash2, X, Calendar,
    Activity, Send, Tag, AlertOctagon, Info, Settings, Save, List, Layers, MapPin, Cpu, RefreshCw,
    FileSpreadsheet, BarChart2,
    Check, Smartphone, Download, FileText, ChevronDown, ChevronUp, UploadCloud, Briefcase, Database
} from 'lucide-react';
import { runIssueAutomation } from '../utils/automation'; 
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import MassIssuesAnalytics from './MassIssuesAnalytics';

interface Props {
  issues: MassIssue[];
  settings: IssueSettings;
  currentUser: User;
  roles: RoleDefinition[];
  onCreateIssue: (issue: MassIssue) => void;
  onUpdateIssue: (issue: MassIssue) => void;
  onDeleteIssue: (id: string) => void;
  onSaveSettings: (settings: IssueSettings) => void;
}

type ListFilterTab = 'active' | 'scheduled' | 'resolved' | 'all';

// Default severities for backward compatibility
const DEFAULT_SEVERITIES: SeverityDefinition[] = [
    { id: 'info', label: 'Инфо', color: 'text-blue-500' },
    { id: 'minor', label: 'Незначительно', color: 'text-yellow-500' },
    { id: 'major', label: 'Серьезно', color: 'text-orange-500' },
    { id: 'critical', label: 'Критически', color: 'text-red-600' }
];

const COLOR_PRESETS = [
    { name: 'Red', value: 'text-red-600' },
    { name: 'Orange', value: 'text-orange-500' },
    { name: 'Yellow', value: 'text-yellow-500' },
    { name: 'Green', value: 'text-green-600' },
    { name: 'Blue', value: 'text-blue-500' },
    { name: 'Purple', value: 'text-purple-600' },
    { name: 'Gray', value: 'text-zinc-500' },
];

const MassIssuesView: React.FC<Props> = ({ issues, settings, currentUser, roles, onCreateIssue, onUpdateIssue, onDeleteIssue, onSaveSettings }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'settings'>('list');
  const [activeListTab, setActiveListTab] = useState<ListFilterTab>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MassIssue | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  // Cascade Manager State
  const [, setIsCascadeManagerOpen] = useState(false);
  // Export State
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSeverity, setFormSeverity] = useState<IssueSeverity>('minor');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formZones, setFormZones] = useState<string[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  
  // New Form Fields
  const [formResponsibleDept, setFormResponsibleDept] = useState('');
  const [formCascade, setFormCascade] = useState<{l1:string, l2:string, l3:string, l4:string, l5:string}>({l1:'',l2:'',l3:'',l4:'',l5:''});

  const [localSettings, setLocalSettings] = useState<IssueSettings>({ 
    categories: { 'Общее': ['Прочее'] }, 
    zones: [], 
    responsibleDepartments: [],
    cascadeData: [],
    severities: DEFAULT_SEVERITIES,
    telegram: { botToken: '', chats: [] }
  });

  useEffect(() => {
      if (settings) {
          setLocalSettings({
              categories: settings.categories || { 'Общее': ['Прочее'] },
              zones: settings.zones || [],
              responsibleDepartments: settings.responsibleDepartments || [],
              cascadeData: settings.cascadeData || [],
              severities: settings.severities && settings.severities.length > 0 ? settings.severities : DEFAULT_SEVERITIES,
              telegram: settings.telegram || { botToken: '', chats: [] }
          });
      }
  }, [settings]);

  useEffect(() => {
      const unsub = db.collection('settings').doc('heartbeat').onSnapshot(doc => {
          if (doc.exists) setLastHeartbeat(doc.data()?.lastRun || null);
      });
      return () => unsub();
  }, []);

  const processedIssues = useMemo(() => {
      const now = new Date();
      return issues.map(issue => {
          const start = issue.scheduledStart ? new Date(issue.scheduledStart) : null;
          const end = issue.scheduledEnd ? new Date(issue.scheduledEnd) : null;
          let visualStatus: IssueStatus = issue.status;
          if (issue.status === 'scheduled' && start && start <= now) {
             visualStatus = (end && end <= now) ? 'resolved' : 'open';
          } else if ((issue.status === 'open' || issue.status === 'investigating') && end && end <= now) {
             visualStatus = 'resolved';
          }
          return { ...issue, visualStatus };
      });
  }, [issues]);

  const tabCounts = useMemo(() => ({
    all: processedIssues.length,
    active: processedIssues.filter(i => i.visualStatus === 'open' || i.visualStatus === 'investigating').length,
    scheduled: processedIssues.filter(i => i.visualStatus === 'scheduled').length,
    resolved: processedIssues.filter(i => i.visualStatus === 'resolved').length
  }), [processedIssues]);

  const filteredAndSortedIssues = useMemo(() => {
    return processedIssues
      .filter(i => {
          const matchesTab = 
            activeListTab === 'all' ? true :
            activeListTab === 'active' ? (i.visualStatus === 'open' || i.visualStatus === 'investigating') :
            activeListTab === 'scheduled' ? (i.visualStatus === 'scheduled') :
            activeListTab === 'resolved' ? (i.visualStatus === 'resolved') : true;
          return matchesTab && (i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.readableId.toLowerCase().includes(searchTerm.toLowerCase()));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [processedIssues, activeListTab, searchTerm]);

  const hasPermission = (permId: string) => {
    if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
    return currentUser.roles.some(rId => roles.find(rd => rd.id === rId)?.permissionIds.includes(permId));
  };
  const canManage = hasPermission('issue_manage');

  // Lookup helpers using dynamic settings
  const getSeverityLabel = (s: IssueSeverity) => { 
      const found = localSettings.severities?.find(def => def.id === s);
      return found ? found.label : s; 
  };
  const getSeverityColor = (s: IssueSeverity) => { 
      const found = localSettings.severities?.find(def => def.id === s);
      return found ? found.color : 'text-zinc-500'; 
  };

  const getExportData = () => {
      let data = [...issues];
      
      if (exportStart) {
          data = data.filter(i => new Date(i.scheduledStart || i.createdAt) >= new Date(exportStart));
      }
      if (exportEnd) {
          const endDate = new Date(exportEnd);
          data = data.filter(i => new Date(i.scheduledStart || i.createdAt) <= endDate);
      }

      // Sort by Start Date (Ascending)
      return data.sort((a, b) => new Date(a.scheduledStart || a.createdAt).getTime() - new Date(b.scheduledStart || b.createdAt).getTime());
  };

  // Helper for loading images and fonts
  const loadAsset = async (url: string, type: 'blob' | 'arraybuffer'): Promise<Blob | ArrayBuffer> => {
      const res = await fetch(url);
      if (type === 'blob') return res.blob();
      return res.arrayBuffer();
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
  }

  const formatCascadePath = (vals?: any) => {
      if (!vals) return '—';
      // Support both key formats just in case
      const parts = [
          vals.l1 || vals.level1, 
          vals.l2 || vals.level2, 
          vals.l3 || vals.level3, 
          vals.l4 || vals.level4, 
          vals.l5 || vals.level5
      ].filter(Boolean);
      
      if (parts.length === 0) return '—';
      return parts.join(' - ');
  };

  const handleExportExcel = () => {
      setIsExporting(true);
      try {
          const dataToExport = getExportData();
          const wb = XLSX.utils.book_new();
          
          const now = new Date();
          const exportDateStr = now.toLocaleDateString('ru-RU');
          const currentYear = now.getFullYear();

          // Header Branding Rows
          const brandingRows = [
              ["Платформа: Optima Control Hub"],
              [`Выгрузка отчета за: ${exportDateStr}`],
              ["Отдел Поддержки Партнеров, департамент: ДРиВПП"],
              [], // Spacer
          ];

          // Data Headers
          const tableHeaders = [
              "ID", "Заголовок", "Описание", "Важность", "Категория", "Зоны Влияния", "Статус", "Автор", 
              "Ответств. Отдел", "Детализация (Каскад)",
              "Дата Занесения (Создания)", "Дата Начала (План/Факт)", "Дата Завершения (План/Факт)"
          ];

          const dataRows = dataToExport.map(i => [
              i.readableId,
              i.title,
              i.description,
              getSeverityLabel(i.severity),
              `${i.category} / ${i.subcategory}`,
              i.affectedZones.join(', '),
              i.status === 'resolved' ? 'Решено' : i.status === 'scheduled' ? 'Запланировано' : 'Активно',
              i.authorName,
              i.responsibleDepartment || '—',
              formatCascadePath(i.cascadeValues),
              new Date(i.createdAt).toLocaleString('ru-RU'),
              i.scheduledStart ? new Date(i.scheduledStart).toLocaleString('ru-RU') : '—',
              (i.resolvedAt || i.scheduledEnd) ? new Date(i.resolvedAt || i.scheduledEnd!).toLocaleString('ru-RU') : '—'
          ]);

          // Footer Rows
          const footerRows = [
              [], // Spacer
              [`Бишкек / Optima Bank / ${currentYear}`]
          ];

          // Combine all rows
          const finalData = [...brandingRows, tableHeaders, ...dataRows, ...footerRows];

          const ws = XLSX.utils.aoa_to_sheet(finalData);
          
          // Styling Column Widths
          ws['!cols'] = [
              {wch:15}, {wch:35}, {wch:60}, {wch:15}, {wch:25}, {wch:30}, {wch:15}, {wch:25}, 
              {wch:25}, {wch:40}, {wch:25}, {wch:25}, {wch:25}
          ];
          
          XLSX.utils.book_append_sheet(wb, ws, "Инциденты");
          XLSX.writeFile(wb, `MassIssues_${new Date().toISOString().slice(0,10)}.xlsx`);
      } catch (e) {
          alert('Ошибка экспорта в Excel');
          console.error(e);
      } finally {
          setIsExporting(false);
      }
  };

  const handleExportPDF = async () => {
      setIsExporting(true);
      try {
          const dataToExport = getExportData();
          const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

          const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
          const fontBuffer = await loadAsset(fontUrl, 'arraybuffer');
          const fontBase64 = arrayBufferToBase64(fontBuffer as ArrayBuffer);
          
          doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
          doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
          doc.setFont("Roboto");

          try {
              const logoBlob = await loadAsset('/pict.png', 'blob');
              const logoBase64 = await blobToBase64(logoBlob as Blob);
              doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25); // x, y, w, h
          } catch (err) {
              console.warn("Logo pict.png not found, skipping image.");
          }

          const now = new Date();
          const dateStr = now.toLocaleDateString('ru-RU');
          const year = now.getFullYear();

          doc.setFontSize(18);
          doc.setTextColor(227, 6, 19); // Optima Red
          doc.text("Optima Control Hub", 45, 20);
          
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`Отдел Поддержки Партнеров, департамент: ДРиВПП`, 45, 26);
          doc.text(`Выгрузка отчета за: ${dateStr}`, 45, 31);

          const head = [[
              "ID", "Заголовок", "Важность", "Отв. Отдел", "Каскад", "Статус", 
              "Создано", "Начало", "Конец"
          ]];

          const body = dataToExport.map(i => [
              i.readableId,
              i.title,
              getSeverityLabel(i.severity),
              i.responsibleDepartment || '—',
              formatCascadePath(i.cascadeValues),
              i.status === 'resolved' ? 'Решено' : 'Активно',
              new Date(i.createdAt).toLocaleDateString('ru-RU') + '\n' + new Date(i.createdAt).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}),
              i.scheduledStart ? new Date(i.scheduledStart).toLocaleDateString('ru-RU') + '\n' + new Date(i.scheduledStart).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : '—',
              (i.resolvedAt || i.scheduledEnd) ? new Date(i.resolvedAt || i.scheduledEnd!).toLocaleDateString('ru-RU') + '\n' + new Date(i.resolvedAt || i.scheduledEnd!).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : '—'
          ]);

          autoTable(doc, {
              startY: 45,
              head: head,
              body: body,
              styles: { 
                  font: "Roboto", // Use the custom font
                  fontSize: 7,
                  overflow: 'linebreak', // Ensure text wraps in cells
                  cellPadding: 2,
              },
              headStyles: { 
                  fillColor: [227, 6, 19],
                  textColor: 255,
                  fontStyle: 'bold'
              },
              theme: 'grid',
              columnStyles: {
                  0: { cellWidth: 20 }, // ID
                  1: { cellWidth: 35 }, // Title
                  3: { cellWidth: 25 }, // Dept
                  4: { cellWidth: 40 }, // Cascade
              },
              didDrawPage: (data) => {
                  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                  doc.setFontSize(8);
                  doc.setTextColor(100);
                  const str = `Бишкек / Optima Bank / ${year}`;
                  doc.text(str, data.settings.margin.left, pageHeight - 10);
                  const pageStr = 'Страница ' + doc.getNumberOfPages();
                  doc.text(pageStr, doc.internal.pageSize.width - 25, pageHeight - 10);
              }
          });

          doc.save(`MassIssues_${new Date().toISOString().slice(0,10)}.pdf`);
      } catch (e: any) {
          alert('Ошибка экспорта в PDF: ' + e.message);
          console.error(e);
      } finally {
          setIsExporting(false);
      }
  };

  const formatToLocalDatetime = (isoString?: string) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenModal = (issue?: MassIssue) => {
      if (issue) {
          setEditingIssue(issue);
          setFormTitle(issue.title); setFormDesc(issue.description); setFormSeverity(issue.severity);
          setFormCategory(issue.category); setFormSubcategory(issue.subcategory);
          setFormStart(formatToLocalDatetime(issue.scheduledStart)); 
          setFormEnd(formatToLocalDatetime(issue.scheduledEnd));
          setFormZones(issue.affectedZones || []); setFormTags(issue.tags || []);
          setNotifyTelegram(issue.notifyTelegram);
          setFormResponsibleDept(issue.responsibleDepartment || '');
          // Map stored values to form state keys (l1, l2...)
          const cv = issue.cascadeValues as any || {};
          setFormCascade({
              l1: cv.l1 || cv.level1 || '',
              l2: cv.l2 || cv.level2 || '',
              l3: cv.l3 || cv.level3 || '',
              l4: cv.l4 || cv.level4 || '',
              l5: cv.l5 || cv.level5 || ''
          });
      } else {
          setEditingIssue(null); setFormTitle(''); setFormDesc(''); 
          // Default to first severity if available
          setFormSeverity(localSettings.severities?.[0]?.id || 'minor');
          const firstCat = Object.keys(localSettings.categories)[0] || '';
          setFormCategory(firstCat); setFormSubcategory(localSettings.categories[firstCat]?.[0] || '');
          setFormStart(''); setFormEnd(''); setFormZones([]); setFormTags([]);
          setNotifyTelegram(true);
          setFormResponsibleDept('');
          setFormCascade({l1:'',l2:'',l3:'',l4:'',l5:''});
      }
      setIsModalOpen(true);
  };

  const handleManualCheck = async () => {
      setIsChecking(true);
      try { const res = await runIssueAutomation(); alert(res.message); } catch (e) { alert('Ошибка'); } finally { setIsChecking(false); }
  };

  const handleTestTg = async () => {
      if (!localSettings.telegram?.botToken || !localSettings.telegram?.chats || localSettings.telegram.chats.length === 0) return alert('Telegram не настроен');
      setIsTestingTg(true);
      try {
          await fetch('/api/issues/notify', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({
                  issue: {
                      id:'test_1', 
                      title:'Тест связи', 
                      description:'Проверка интеграции', 
                      status:'open', 
                      severity:'info', 
                      category:'System', 
                      notifyTelegram:true, 
                      authorName:currentUser.name
                  },
                  eventType: 'created'
              })
          });
          alert('Запрос отправлен');
      } catch (e) { alert('Ошибка'); } finally { setIsTestingTg(false); }
  };

  const addTag = () => {
    if (tagInput.trim() && !formTags.includes(tagInput.trim())) {
        setFormTags([...formTags, tagInput.trim()]);
        setTagInput('');
    }
  };

  const removeTag = (t: string) => setFormTags(formTags.filter(x => x !== t));

  const toggleZone = (z: string) => {
      setFormZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);
  };

  // --- CASCADE LOGIC ---
  
  const getCascadeOptions = (level: number) => {
      if (level === 1) return localSettings.cascadeData || [];
      
      // Traverse down based on selection
      let currentNodes = localSettings.cascadeData || [];
      if (level > 1 && formCascade.l1) {
          const n = currentNodes.find(x => x.value === formCascade.l1);
          if (n && n.children) currentNodes = n.children; else return [];
      }
      if (level > 2 && formCascade.l2) {
          const n = currentNodes.find(x => x.value === formCascade.l2);
          if (n && n.children) currentNodes = n.children; else return [];
      }
      if (level > 3 && formCascade.l3) {
          const n = currentNodes.find(x => x.value === formCascade.l3);
          if (n && n.children) currentNodes = n.children; else return [];
      }
      if (level > 4 && formCascade.l4) {
          const n = currentNodes.find(x => x.value === formCascade.l4);
          if (n && n.children) currentNodes = n.children; else return [];
      }
      return currentNodes;
  };

  const handleCascadeChange = (level: number, value: string) => {
      const newCascade = { ...formCascade };
      if (level === 1) { newCascade.l1 = value; newCascade.l2=''; newCascade.l3=''; newCascade.l4=''; newCascade.l5=''; }
      if (level === 2) { newCascade.l2 = value; newCascade.l3=''; newCascade.l4=''; newCascade.l5=''; }
      if (level === 3) { newCascade.l3 = value; newCascade.l4=''; newCascade.l5=''; }
      if (level === 4) { newCascade.l4 = value; newCascade.l5=''; }
      if (level === 5) { newCascade.l5 = value; }
      setFormCascade(newCascade);
  };

  const handleCascadeTemplate = () => {
      const wb = XLSX.utils.book_new();
      const data = [
          ["Уровень 1", "Уровень 2", "Уровень 3", "Уровень 4", "Уровень 5"],
          ["Банкоматы", "Hardware", "Диспенсер", "Замятие", "Критично"],
          ["Банкоматы", "Software", "Сбой ПО", "Зависание", "Высокий"],
          ["POS-терминалы", "Связь", "Нет сигнала", "3G Модем", "Средний"]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "CascadeTemplate");
      XLSX.writeFile(wb, "Cascade_Import_Template.xlsx");
  };

  // Recursively merges a path into the existing tree. Returns true if something new was added.
  const mergeCascadePath = (tree: CascadeNode[], path: string[]): boolean => {
      if (path.length === 0) return false;
      const currentVal = path[0].trim();
      if (!currentVal) return false;

      let node = tree.find(n => n.value === currentVal);
      let added = false;

      if (!node) {
          node = { value: currentVal, children: [] };
          tree.push(node);
          added = true;
      }

      // Recursive step for remaining path
      if (path.length > 1) {
          if (!node.children) node.children = [];
          const childAdded = mergeCascadePath(node.children, path.slice(1));
          if (childAdded) added = true;
      }
      return added;
  };

  const handleCascadeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          try {
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
              
              // Deep copy existing tree to mutate
              const currentTree: CascadeNode[] = JSON.parse(JSON.stringify(localSettings.cascadeData || []));
              
              let addedCount = 0;
              let duplicatesCount = 0;

              // Skip header if needed
              const startRow = (data[0] && data[0][0] && String(data[0][0]).includes('Уровень')) ? 1 : 0;

              for (let i = startRow; i < data.length; i++) {
                  const row = data[i];
                  if (!row || row.length === 0) continue;
                  
                  // Extract levels 1-5
                  const path = [];
                  for (let col = 0; col < 5; col++) {
                      if (row[col]) path.push(String(row[col]));
                  }
                  
                  if (path.length > 0) {
                      const wasAdded = mergeCascadePath(currentTree, path);
                      if (wasAdded) addedCount++; else duplicatesCount++;
                  }
              }
              
              setLocalSettings(prev => ({...prev, cascadeData: currentTree}));
              alert(`Импорт завершен.\nДобавлено уникальных путей: ${addedCount}\nПропущено дубликатов: ${duplicatesCount}`);
          } catch (err) {
              console.error(err);
              alert("Ошибка импорта Excel. Проверьте формат.");
          }
          e.target.value = '';
      };
      reader.readAsBinaryString(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const now = new Date();
      const start = formStart ? new Date(formStart) : now;
      const end = formEnd ? new Date(formEnd) : undefined;
      let status: IssueStatus = 'open';
      if (end && end < now) status = 'resolved';
      else if (start > now) status = 'scheduled';

      let resolvedAt = editingIssue ? editingIssue.resolvedAt : undefined;
      if (status === 'resolved' && !resolvedAt) {
          resolvedAt = end ? end.toISOString() : now.toISOString();
      }

      const notifiedEvents = editingIssue ? (editingIssue.notifiedEvents || []) : ['created'];
      if (status === 'open' && !notifiedEvents.includes('auto_start')) {
          notifiedEvents.push('auto_start');
      }

      // Ensure we send the label, not just the ID if it's custom, 
      // but payload must match MassIssue type. 
      // We'll also pass 'severityLabel' in the webhook body manually below for GAS.
      const payload: MassIssue = {
          id: editingIssue ? editingIssue.id : `issue_${Date.now()}`,
          readableId: editingIssue ? editingIssue.readableId : `ISS-${Date.now().toString().slice(-6)}`,
          title: formTitle, description: formDesc, severity: formSeverity, category: formCategory, subcategory: formSubcategory,
          tags: formTags, affectedZones: formZones, status, 
          scheduledStart: start.toISOString(), scheduledEnd: end?.toISOString(),
          notifyTelegram, 
          responsibleDepartment: formResponsibleDept,
          // Pass as is, the script will handle 'l1' keys
          cascadeValues: {
              level1: formCascade.l1,
              level2: formCascade.l2,
              level3: formCascade.l3,
              level4: formCascade.l4,
              level5: formCascade.l5
          },
          createdAt: editingIssue ? editingIssue.createdAt : now.toISOString(), 
          updatedAt: now.toISOString(), 
          createdBy: editingIssue ? editingIssue.createdBy : currentUser.id, 
          authorName: currentUser.name,
          notifiedEvents,
          resolvedAt,
          telegramMessageId: editingIssue ? editingIssue.telegramMessageId : undefined
      };

      if (editingIssue) onUpdateIssue(payload); else onCreateIssue(payload);
      if (localSettings.telegram?.botToken && localSettings.telegram?.chats?.length > 0) {
          const severityLabel = getSeverityLabel(formSeverity);
          fetch('/api/issues/notify', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({
                  issue: { ...payload, severityLabel },
                  eventType: editingIssue ? 'updated' : 'created'
              })
          });
      }
      setIsModalOpen(false);
  };

  const handleCloseIssue = (issue: MassIssue) => {
      if(!window.confirm('Завершить инцидент?')) return;
      const now = new Date().toISOString();
      const notified = issue.notifiedEvents || [];
      const updated: MassIssue = { 
          ...issue, 
          status: 'resolved', 
          resolvedAt: now, 
          updatedAt: now,
          notifiedEvents: Array.from(new Set([...notified, 'auto_end'])) 
      };
      onUpdateIssue(updated);
      if (localSettings.telegram?.botToken && localSettings.telegram?.chats?.length > 0) {
          const severityLabel = getSeverityLabel(updated.severity);
          fetch('/api/issues/notify', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                issue: { ...updated, severityLabel },
                eventType: 'auto_end'
            })
          });
      }
  };

  const TelegramPreview = () => {
    const now = new Date();
    const start = formStart ? new Date(formStart) : now;
    const end = formEnd ? new Date(formEnd) : undefined;

    const formatD = (d: any) => d ? new Date(d).toLocaleString("ru-RU", {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : "-";
    const cascadeStr = formatCascadePath(formCascade);
    const sevLabel = getSeverityLabel(formSeverity);
    const sevColor = getSeverityColor(formSeverity);

    return (
        <div className="w-full max-w-[340px] bg-[#6ea1d4] dark:bg-[#1c2b3a] rounded-[2rem] p-3 font-sans shadow-2xl animate-fade-in sticky top-0">
            <div className="flex items-center gap-2 mb-3 px-2">
                <Smartphone size={14} className="text-white opacity-60"/>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Telegram Preview</span>
            </div>
            <div className="bg-white dark:bg-[#24313f] rounded-2xl p-3 shadow-sm border-b-2 border-zinc-200 dark:border-black/20">
                <div className="text-zinc-900 dark:text-white text-sm leading-snug space-y-3">
                    
                    {/* Header Block */}
                    <div className="text-center pb-2 border-b border-zinc-200 dark:border-white/10">
                        <div className="font-black text-lg uppercase underline decoration-2 underline-offset-4 tracking-tight">
                            {formTitle || "ЗАГОЛОВОК"}
                        </div>
                        <div className="flex justify-center items-center gap-2 mt-1 text-xs">
                            <span className={`font-bold ${sevColor}`}>
                                {sevLabel.toUpperCase()}
                            </span>
                            <span className="text-zinc-300">|</span>
                            <span className="font-bold text-zinc-600 dark:text-zinc-300">
                                {formCategory || "КАТЕГОРИЯ"}
                            </span>
                        </div>
                    </div>

                    {/* Meta Info Block */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">ID Инцидента:</span>
                            <code className="font-mono font-bold text-sm text-zinc-900 dark:text-white bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
                                {editingIssue?.readableId || "ISS-XXXXXX"}
                            </code>
                        </div>

                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="font-bold text-zinc-500">Начало:</span>
                                <span>{formatD(start)}</span>
                            </div>
                            {end && (
                                <div className="flex justify-between">
                                    <span className="font-bold text-zinc-500">План. устр.:</span>
                                    <span>{formatD(end)}</span>
                                </div>
                            )}
                            {formResponsibleDept && (
                                <div className="flex justify-between pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700 mt-1">
                                    <span className="font-bold text-zinc-500">Ответств.:</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{formResponsibleDept}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-xs pt-1">
                            <span className="font-bold text-zinc-500 block mb-0.5">Зоны влияния:</span>
                            <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 rounded block text-zinc-700 dark:text-zinc-300">
                                {formZones.length > 0 ? formZones.join(", ") : "Все системы"}
                            </code>
                        </div>
                    </div>

                    {/* Description Block */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
                            {formDesc || "Техническое описание проблемы..."}
                        </pre>
                    </div>

                    {/* Marked Subject (Cascade) */}
                    {cascadeStr !== '—' && (
                        <div className="text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="font-bold text-zinc-500 block mb-0.5">Отмечаемая тематика:</span>
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30 text-[11px]">
                                {cascadeStr}
                            </div>
                        </div>
                    )}

                    {/* Footer Tags */}
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium pt-1">
                        {formTags.map(t => `#${t.replace(/\s+/g,'')}`).join(" ")} #OptimaStatus #Hub
                    </div>
                </div>
                <div className="text-[10px] text-zinc-400 text-right mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2,'0')}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="pb-20 space-y-10 reveal">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-surface2 pb-8 gap-6">
            <div>
                <h2 className="text-4xl font-black text-text flex items-center gap-4 font-headline tracking-tighter">
                    <div className="p-3 bg-red/10 rounded-2xl text-red shadow-[0_0_20px_rgba(230,57,70,0.2)]">
                        <Activity size={32} />
                    </div>
                    Массовые Инциденты
                </h2>
                <div className="flex items-center gap-3 mt-3">
                    <p className="text-muted font-black uppercase text-[10px] tracking-[0.3em] font-headline">Мониторинг аварий и плановых работ</p>
                    <div className="flex items-center gap-3 ml-4 bg-surface2 px-4 py-1.5 rounded-full border border-surface3">
                        {canManage && (<span className="flex items-center gap-2 text-[10px] font-black bg-red/10 text-red px-3 py-1 rounded-full font-headline uppercase tracking-wider"><Cpu size={12} /> Browser Bot</span>)}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase text-white font-headline tracking-wider ${lastHeartbeat ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-muted'}`}>Система активна</span>
                    </div>
                </div>
            </div>
            {canManage && (
                <div className="flex gap-2 bg-surface2 p-1.5 rounded-2xl border border-surface3">
                    <button onClick={() => setActiveTab('list')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all font-headline flex items-center gap-2 ${activeTab === 'list' ? 'bg-red text-white shadow-lg shadow-red/20' : 'text-muted hover:text-text'}`}><List size={18}/> Список</button>
                    <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all font-headline flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-red text-white shadow-lg shadow-red/20' : 'text-muted hover:text-text'}`}><BarChart2 size={18}/> Аналитика</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all font-headline flex items-center gap-2 ${activeTab === 'settings' ? 'bg-red text-white shadow-lg shadow-red/20' : 'text-muted hover:text-text'}`}><Settings size={18}/> Настройки</button>
                </div>
            )}
        </div>

        {activeTab === 'analytics' ? (
            <MassIssuesAnalytics issues={issues} />
        ) : activeTab === 'list' ? (
            <>
                {/* Filters & Actions */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap gap-4 border-b border-surface2">
                        {[{ id: 'active', label: 'Активные', icon: Activity, count: tabCounts.active }, { id: 'scheduled', label: 'План', icon: Clock, count: tabCounts.scheduled }, { id: 'resolved', label: 'Завершено', icon: CheckCircle, count: tabCounts.resolved }, { id: 'all', label: 'Все', icon: List, count: tabCounts.all }].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveListTab(tab.id as any)} 
                                className={`flex items-center gap-3 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] border-b-2 transition-all font-headline ${activeListTab === tab.id ? 'border-red text-text' : 'border-transparent text-muted hover:text-text'}`}
                                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                            >
                                <tab.icon size={16}/> {tab.label} 
                                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black ${activeListTab === tab.id ? 'bg-red text-white' : 'bg-surface2 text-muted'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                    
                    {/* Search & Main Actions */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted"/>
                            <input 
                                type="text" 
                                placeholder="Поиск по названию или ID..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full pl-14 pr-6 py-4 clay-input font-headline font-bold text-sm text-text"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowExportPanel(!showExportPanel)} 
                                className={`px-6 py-4 premium-card flex items-center gap-3 text-[11px] font-black uppercase tracking-widest font-headline transition-all ${showExportPanel ? 'bg-surface3 border-red/30 text-text' : 'text-muted hover:text-text'}`}
                                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                            >
                                <FileSpreadsheet size={18}/> Отчеты {showExportPanel ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                            {canManage && (
                                <>
                                    <button 
                                        onClick={handleManualCheck} 
                                        className="px-6 py-4 premium-card flex items-center gap-3 text-[11px] font-black uppercase tracking-widest font-headline text-muted hover:text-text transition-all"
                                        onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                    >
                                        <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''}/> Проверить
                                    </button>
                                    <button 
                                        onClick={() => handleOpenModal()} 
                                        className="px-8 py-4 btn-primary flex items-center gap-3 text-[11px] font-black uppercase tracking-widest font-headline"
                                        onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                    >
                                        <Plus size={18}/> Создать
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Export Panel (Collapsible) */}
                    {showExportPanel && (
                        <div className="premium-card p-6 bg-surface2/50 border-surface3 animate-fade-in">
                            <div className="flex flex-col md:flex-row gap-8 items-end">
                                <div className="space-y-3 flex-1">
                                    <label className="text-[10px] font-black text-muted uppercase ml-2 tracking-widest font-headline">Дата начала периода</label>
                                    <input type="datetime-local" value={exportStart} onChange={e => setExportStart(e.target.value)} className="w-full p-3 clay-input text-xs font-bold text-text font-headline" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <label className="text-[10px] font-black text-muted uppercase ml-2 tracking-widest font-headline">Дата конца периода</label>
                                    <input type="datetime-local" value={exportEnd} onChange={e => setExportEnd(e.target.value)} className="w-full p-3 clay-input text-xs font-bold text-text font-headline" />
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleExportExcel} 
                                        disabled={isExporting} 
                                        className="px-8 py-4 bg-green-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest font-headline shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                        onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                    >
                                        <FileSpreadsheet size={18}/> Excel
                                    </button>
                                    <button 
                                        onClick={handleExportPDF} 
                                        disabled={isExporting} 
                                        className="px-8 py-4 bg-red text-white rounded-2xl text-[11px] font-black uppercase tracking-widest font-headline shadow-lg hover:bg-red-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                        onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                    >
                                        <FileText size={18}/> PDF
                                    </button>
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] font-black text-muted uppercase tracking-wider font-headline">* Если даты не указаны, будет выгружена полная история.</p>
                        </div>
                    )}
                </div>

                <div className="grid gap-6">
                    {filteredAndSortedIssues.map(issue => (
                        <div key={issue.id} className="premium-card p-6 relative overflow-hidden group hover:bg-surface2 transition-all duration-500">
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${getSeverityColor(issue.severity).replace('text-', 'bg-')} shadow-[0_0_15px_rgba(0,0,0,0.2)]`}/>
                            <div className="flex flex-col md:flex-row justify-between gap-8">
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full font-headline tracking-widest ${getSeverityColor(issue.severity)} bg-surface2 border border-surface3`}>
                                            {getSeverityLabel(issue.severity)}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border font-headline tracking-widest ${issue.visualStatus === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : issue.visualStatus === 'scheduled' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red/10 text-red border-red/20'}`}>
                                            {issue.visualStatus === 'resolved' ? 'Решено' : issue.visualStatus === 'scheduled' ? 'План' : 'Активен'}
                                        </span>
                                        <span className="text-[10px] font-black text-muted font-headline tracking-widest">#{issue.readableId}</span>
                                        {issue.responsibleDepartment && (
                                            <span className="text-[10px] font-black text-text bg-surface3 px-3 py-1 rounded-full flex items-center gap-2 font-headline tracking-widest">
                                                <Briefcase size={12} className="text-red"/> {issue.responsibleDepartment}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-text font-headline leading-none">{issue.title}</h3>
                                    <p className="text-sm font-medium text-muted line-clamp-2 leading-relaxed">{issue.description}</p>
                                    
                                    {issue.cascadeValues && issue.cascadeValues.level1 && (
                                        <div className="text-[10px] text-muted font-black uppercase tracking-widest bg-surface2 px-4 py-2 rounded-xl border border-surface3 inline-block font-headline">
                                            {formatCascadePath(issue.cascadeValues)}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-6 pt-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] font-headline"><Calendar size={14} className="text-red"/> {new Date(issue.scheduledStart || issue.createdAt).toLocaleString('ru-RU')}</div>
                                        {issue.scheduledEnd && <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] font-headline"><Clock size={14} className="text-red"/> До: {new Date(issue.scheduledEnd).toLocaleString('ru-RU')}</div>}
                                    </div>
                                </div>
                                {canManage && (
                                    <div className="flex flex-row md:flex-col gap-3 shrink-0">
                                        {issue.visualStatus !== 'resolved' && (
                                            <button 
                                                onClick={() => handleCloseIssue(issue)} 
                                                className="p-3 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10"
                                                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                            >
                                                <CheckCircle size={24}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleOpenModal(issue)} 
                                            className="p-3 bg-surface2 text-muted hover:text-text rounded-2xl border border-surface3 hover:bg-surface3 transition-all"
                                            onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                            onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                        >
                                            <Edit2 size={22}/>
                                        </button>
                                        <button 
                                            onClick={() => {if(window.confirm('Удалить инцидент?')) onDeleteIssue(issue.id)}} 
                                            className="p-3 bg-surface2 text-muted hover:text-red rounded-2xl border border-surface3 hover:bg-red/10 transition-all"
                                            onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                            onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                                        >
                                            <Trash2 size={22}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredAndSortedIssues.length === 0 && (
                        <div className="p-24 text-center text-muted font-black uppercase tracking-[0.4em] border-2 border-dashed border-surface3 rounded-[3rem] font-headline bg-surface1/30">
                            Инцидентов нет
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="space-y-10 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Категории */}
                    <div className="premium-card p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                                <Layers size={24} className="text-red"/> Категории
                            </h3>
                            <button 
                                onClick={() => {const n=prompt('Название категории:'); if(n) setLocalSettings({...localSettings, categories:{...localSettings.categories, [n]:['Общее']}})}} 
                                className="p-3 bg-surface2 rounded-2xl border border-surface3 hover:bg-surface3 transition-all"
                                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                            >
                                <Plus size={20}/>
                            </button>
                        </div>
                        <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {(Object.entries(localSettings.categories) as [string, string[]][]).map(([cat, subs]) => (
                                <div key={cat} className="p-6 bg-surface2/50 rounded-3xl border border-surface3 group/cat relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-black uppercase text-text font-headline tracking-widest">{cat}</span>
                                        <div className="flex gap-2 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                            <button onClick={() => {const n=prompt('Добавить подкатегорию:'); if(n) setLocalSettings({...localSettings, categories:{...localSettings.categories, [cat]:[...subs, n]}})}} className="px-3 py-1.5 bg-red text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red/20">+ Подкат.</button>
                                            <button onClick={() => {if(window.confirm('Удалить категорию?')) {const n={...localSettings.categories}; delete n[cat]; setLocalSettings({...localSettings, categories:n})}}} className="p-1.5 bg-surface3 rounded-xl border border-surface3 text-red hover:bg-red/10"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {subs.map(s => (
                                            <span key={s} className="px-4 py-2 bg-surface3 border border-surface3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-3 font-headline text-muted">
                                                {s} 
                                                <button onClick={() => setLocalSettings({...localSettings, categories:{...localSettings.categories, [cat]:subs.filter(x=>x!==s)}})} className="hover:text-red transition-colors">
                                                    <X size={12}/>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Зоны влияния */}
                    <div className="premium-card p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                                <MapPin size={24} className="text-red"/> Зоны Влияния
                            </h3>
                            <button 
                                onClick={() => {const n=prompt('Добавить зону:'); if(n) setLocalSettings({...localSettings, zones:[...localSettings.zones, n]})}} 
                                className="p-3 bg-surface2 rounded-2xl border border-surface3 hover:bg-surface3 transition-all"
                                onMouseEnter={() => document.body.classList.add('cursor-hover')}
                                onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                            >
                                <Plus size={20}/>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {localSettings.zones.map(z => (
                                <span key={z} className="px-6 py-3 bg-surface2 border border-surface3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-4 shadow-sm font-headline text-text group/zone">
                                    {z} 
                                    <button onClick={() => setLocalSettings({...localSettings, zones:localSettings.zones.filter(x=>x!==z)})} className="text-muted hover:text-red transition-colors">
                                        <X size={16}/>
                                    </button>
                                </span>
                            ))}
                            {localSettings.zones.length === 0 && <p className="text-muted text-xs font-black uppercase tracking-widest p-4 font-headline italic">Список зон пуст</p>}
                        </div>
                    </div>

                    {/* Настройка Уровней Серьезности (New) */}
                    <div className="premium-card p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                                <AlertOctagon size={24} className="text-red"/> Уровни Серьезности
                            </h3>
                            <button onClick={() => {
                                const newId = `custom_${Date.now()}`;
                                const newDef: SeverityDefinition = { id: newId, label: 'Новый уровень', color: 'text-muted' };
                                setLocalSettings(prev => ({...prev, severities: [...(prev.severities || []), newDef]}));
                            }} className="p-3 bg-surface2 rounded-2xl border border-surface3 hover:bg-surface3 transition-all">
                                <Plus size={20}/>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {(localSettings.severities || DEFAULT_SEVERITIES).map((sev, idx) => (
                                <div key={sev.id} className="flex gap-4 items-center p-4 bg-surface2/50 rounded-2xl border border-surface3">
                                    <input 
                                        className="bg-transparent border-b-2 border-transparent hover:border-surface3 focus:border-red outline-none font-black text-sm w-40 text-text font-headline uppercase tracking-widest"
                                        value={sev.label}
                                        onChange={(e) => {
                                            const updated = [...(localSettings.severities || [])];
                                            updated[idx].label = e.target.value;
                                            setLocalSettings(prev => ({...prev, severities: updated}));
                                        }}
                                    />
                                    <select 
                                        className="bg-surface3 text-[10px] font-black uppercase tracking-widest outline-none border border-surface3 px-3 py-1.5 rounded-xl text-muted font-headline"
                                        value={sev.color}
                                        onChange={(e) => {
                                            const updated = [...(localSettings.severities || [])];
                                            updated[idx].color = e.target.value;
                                            setLocalSettings(prev => ({...prev, severities: updated}));
                                        }}
                                    >
                                        {COLOR_PRESETS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                    </select>
                                    <div className={`w-6 h-6 rounded-full ${sev.color.replace('text-', 'bg-')} shadow-lg`}></div>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Удалить этот уровень?')) {
                                                const updated = (localSettings.severities || []).filter(s => s.id !== sev.id);
                                                setLocalSettings(prev => ({...prev, severities: updated}));
                                            }
                                        }}
                                        className="ml-auto text-muted hover:text-red transition-colors"
                                    >
                                        <Trash2 size={20}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ответственные отделы (NEW) */}
                    <div className="premium-card p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                                <Briefcase size={24} className="text-red"/> Ответственные Отделы
                            </h3>
                            <button onClick={() => {const n=prompt('Название отдела:'); if(n) setLocalSettings({...localSettings, responsibleDepartments:[...(localSettings.responsibleDepartments||[]), n]})}} className="p-3 bg-surface2 rounded-2xl border border-surface3 hover:bg-surface3 transition-all">
                                <Plus size={20}/>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {(localSettings.responsibleDepartments || []).map(z => (
                                <span key={z} className="px-6 py-3 bg-surface2 border border-surface3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-4 shadow-sm font-headline text-text group/dept">
                                    {z} 
                                    <button onClick={() => setLocalSettings({...localSettings, responsibleDepartments:(localSettings.responsibleDepartments||[]).filter(x=>x!==z)})} className="text-muted hover:text-red transition-colors">
                                        <X size={16}/>
                                    </button>
                                </span>
                            ))}
                            {(!localSettings.responsibleDepartments || localSettings.responsibleDepartments.length === 0) && <p className="text-muted text-xs font-black uppercase tracking-widest p-4 font-headline italic">Список отделов пуст</p>}
                        </div>
                    </div>

                    {/* Настройка Каскада (NEW) */}
                    <div className="premium-card p-8 space-y-8">
                        <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                            <List size={24} className="text-red"/> 5-Уровневый Каскад
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="p-6 bg-surface2/50 rounded-3xl border border-surface3">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black uppercase text-muted tracking-[0.2em] font-headline">Статус базы данных</span>
                                    <button onClick={() => setIsCascadeManagerOpen(true)} className="px-5 py-2.5 bg-text text-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3 font-headline">
                                        <Database size={14}/> Управление базой
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`w-4 h-4 rounded-full shadow-lg ${localSettings.cascadeData?.length ? 'bg-green-500 shadow-green-500/20' : 'bg-red shadow-red/20'}`}></div>
                                    <span className="text-sm font-black uppercase tracking-widest text-text font-headline">
                                        {localSettings.cascadeData?.length ? `Загружено корней: ${localSettings.cascadeData.length}` : 'База пуста'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={handleCascadeTemplate} className="flex-1 py-4 border-2 border-dashed border-surface3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted hover:text-text hover:border-red/30 transition-all flex items-center justify-center gap-3 font-headline">
                                    <Download size={18}/> Шаблон
                                </button>
                                <label className="flex-1 py-4 bg-surface2 border border-surface3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-text hover:bg-surface3 transition-all flex items-center justify-center gap-3 cursor-pointer font-headline shadow-sm">
                                    <UploadCloud size={18}/> Импорт (Merge)
                                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleCascadeImport} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Главная интеграция */}
                    <div className="lg:col-span-2 premium-card p-8 space-y-8">
                        <h3 className="text-xl font-black uppercase tracking-tight text-text flex items-center gap-3 font-headline">
                            <Send size={24} className="text-red"/> Настройка Telegram
                        </h3>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted uppercase ml-4 tracking-[0.3em] font-headline">Токен Бота</label>
                                <input value={localSettings.telegram?.botToken || ''} onChange={e=>setLocalSettings({...localSettings, telegram: {...(localSettings.telegram || {chats:[]}), botToken: e.target.value}})} className="w-full p-4 clay-input text-xs font-mono text-text" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-muted uppercase ml-4 tracking-[0.3em] font-headline">Группы (Чаты)</label>
                                    <button onClick={() => setLocalSettings({...localSettings, telegram: {...(localSettings.telegram || {botToken:''}), chats: [...(localSettings.telegram?.chats || []), {chatId:'', threadId:''}]}})} className="text-[10px] font-black text-red uppercase tracking-widest hover:underline font-headline">+ Добавить чат</button>
                                </div>
                                <div className="space-y-3">
                                    {(localSettings.telegram?.chats || []).map((chat, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 items-center p-4 bg-surface2/50 rounded-2xl border border-surface3">
                                            <div className="col-span-5">
                                                <input value={chat.chatId} onChange={e => {
                                                    const newChats = [...(localSettings.telegram?.chats || [])];
                                                    newChats[idx].chatId = e.target.value;
                                                    setLocalSettings({...localSettings, telegram: {...localSettings.telegram, chats: newChats}});
                                                }} className="w-full p-3 clay-input text-xs font-mono text-text" placeholder="ID Чата (-100...)" />
                                            </div>
                                            <div className="col-span-6">
                                                <input value={chat.threadId || ''} onChange={e => {
                                                    const newChats = [...(localSettings.telegram?.chats || [])];
                                                    newChats[idx].threadId = e.target.value;
                                                    setLocalSettings({...localSettings, telegram: {...localSettings.telegram, chats: newChats}});
                                                }} className="w-full p-3 clay-input text-xs font-mono text-text" placeholder="ID Топика (опц.)" />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button onClick={() => {
                                                    const newChats = [...(localSettings.telegram?.chats || [])];
                                                    newChats.splice(idx, 1);
                                                    setLocalSettings({...localSettings, telegram: {...localSettings.telegram, chats: newChats}});
                                                }} className="p-2.5 text-muted hover:text-red hover:bg-red/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {(!localSettings.telegram?.chats || localSettings.telegram.chats.length === 0) && (
                                    <div className="text-xs text-muted font-black uppercase tracking-widest px-4 font-headline italic">Нет добавленных чатов.</div>
                                )}
                            </div>
                            <button onClick={handleTestTg} disabled={isTestingTg} className="w-full btn-primary py-5 text-[11px] font-black uppercase tracking-[0.3em] font-headline flex items-center justify-center gap-4">
                                {isTestingTg ? <RefreshCw className="animate-spin" size={20}/> : <Send size={20}/>} Тест Telegram
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-8">
                    <button onClick={() => {onSaveSettings(localSettings); alert('Настройки сохранены')}} className="btn-primary px-16 py-6 text-sm font-black uppercase tracking-[0.4em] font-headline flex items-center gap-4 shadow-2xl">
                        <Save size={24}/> Сохранить всё
                    </button>
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-bg/80 backdrop-blur-2xl p-4 overflow-y-auto">
                <div className="premium-card w-full max-w-[95vw] max-h-[95vh] flex flex-col border-4 border-surface3 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden reveal">
                    <div className="p-8 border-b-2 border-surface2 bg-surface1 flex justify-between items-center">
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-text font-headline">
                            {editingIssue ? 'Правка инцидента' : 'Новое сообщение'}
                        </h3>
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            className="p-3 text-muted hover:text-red transition-colors"
                            onMouseEnter={() => document.body.classList.add('cursor-hover')}
                            onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                        >
                            <X size={40}/>
                        </button>
                    </div>
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                        {/* FORM SIDE */}
                        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-bg border-r border-surface2">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Заголовок</label>
                                <input required value={formTitle} onChange={e=>setFormTitle(e.target.value)} className="w-full p-5 clay-input text-2xl font-black text-text uppercase font-headline tracking-tight"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Описание</label>
                                <textarea required value={formDesc} onChange={e=>setFormDesc(e.target.value)} className="w-full p-5 clay-input h-48 resize-none text-sm font-bold text-text font-headline leading-relaxed"/>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-surface2/50 rounded-[2.5rem] border border-surface3">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Ответственный отдел</label>
                                    <input list="depts" value={formResponsibleDept} onChange={e=>setFormResponsibleDept(e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline" placeholder="Выберите или введите..." />
                                    <datalist id="depts">
                                        {(localSettings.responsibleDepartments || []).map(d => <option key={d} value={d} />)}
                                    </datalist>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Уровень 1 (Каскад)</label>
                                    <select value={formCascade.l1} onChange={e=>handleCascadeChange(1, e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline">
                                        <option value="">Не выбрано</option>
                                        {(getCascadeOptions(1)).map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Уровень 2</label>
                                    <select disabled={!formCascade.l1} value={formCascade.l2} onChange={e=>handleCascadeChange(2, e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline disabled:opacity-30">
                                        <option value="">Не выбрано</option>
                                        {(getCascadeOptions(2)).map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Уровень 3</label>
                                    <select disabled={!formCascade.l2} value={formCascade.l3} onChange={e=>handleCascadeChange(3, e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline disabled:opacity-30">
                                        <option value="">Не выбрано</option>
                                        {(getCascadeOptions(3)).map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Уровень 4</label>
                                    <select disabled={!formCascade.l3} value={formCascade.l4} onChange={e=>handleCascadeChange(4, e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline disabled:opacity-30">
                                        <option value="">Не выбрано</option>
                                        {(getCascadeOptions(4)).map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Уровень 5</label>
                                    <select disabled={!formCascade.l4} value={formCascade.l5} onChange={e=>handleCascadeChange(5, e.target.value)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline disabled:opacity-30">
                                        <option value="">Не выбрано</option>
                                        {(getCascadeOptions(5)).map(n => <option key={n.value} value={n.value}>{n.value}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3"><label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Дата начала</label><input type="datetime-local" value={formStart} onChange={e=>setFormStart(e.target.value)} className="w-full p-4 clay-input text-xs font-black text-text font-headline"/></div>
                                <div className="space-y-3"><label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Дата конца (опц)</label><input type="datetime-local" value={formEnd} onChange={e=>setFormEnd(e.target.value)} className="w-full p-4 clay-input text-xs font-black text-text font-headline"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3"><label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Категория</label><select value={formCategory} onChange={e=>{setFormCategory(e.target.value); setFormSubcategory(localSettings.categories[e.target.value]?.[0] || '');}} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline outline-none focus:border-red">{Object.keys(localSettings.categories).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                                <div className="space-y-3"><label className="text-[11px] font-black text-muted uppercase ml-4 tracking-[0.2em] font-headline">Серьезность</label><select value={formSeverity} onChange={e=>setFormSeverity(e.target.value as any)} className="w-full p-4 clay-input text-xs font-black uppercase text-text font-headline outline-none focus:border-red">
                                    {(localSettings.severities || DEFAULT_SEVERITIES).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select></div>
                            </div>
                            
                            {/* TAGS INPUT */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-muted uppercase ml-4 flex items-center gap-3 font-headline tracking-[0.2em]"><Tag size={14} className="text-red"/> Теги (Хэштеги)</label>
                                <div className="flex gap-4">
                                    <input 
                                        value={tagInput} 
                                        onChange={e => setTagInput(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Введите тег и нажмите Enter..." 
                                        className="flex-1 p-4 clay-input text-xs font-bold text-text font-headline"
                                    />
                                    <button type="button" onClick={addTag} className="p-4 bg-text text-bg rounded-2xl shadow-xl hover:scale-105 transition-all"><Plus size={24}/></button>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-4">
                                    {formTags.map(t => (
                                        <span key={t} className="px-4 py-2 bg-red/10 text-red border border-red/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 font-headline">
                                            #{t} 
                                            <button onClick={() => removeTag(t)} className="hover:text-text transition-colors"><X size={14}/></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* MULTI-ZONE SELECTOR */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-muted uppercase ml-4 flex items-center gap-3 font-headline tracking-[0.2em]"><MapPin size={14} className="text-red"/> Зоны влияния</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-surface2/50 p-6 rounded-[2.5rem] border border-surface3 max-h-60 overflow-y-auto custom-scrollbar">
                                    {localSettings.zones.map(z => {
                                        const isSelected = formZones.includes(z);
                                        return (
                                            <button 
                                                key={z} 
                                                type="button" 
                                                onClick={() => toggleZone(z)}
                                                className={`p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-between font-headline ${isSelected ? 'bg-red border-red text-white shadow-xl shadow-red/20' : 'bg-surface3 border-surface3 text-muted hover:border-red/30'}`}
                                            >
                                                {z} {isSelected && <Check size={14}/>}
                                            </button>
                                        );
                                    })}
                                    {localSettings.zones.length === 0 && <p className="col-span-full text-center text-muted text-[10px] font-black uppercase py-8 font-headline tracking-widest">Список зон пуст</p>}
                                </div>
                            </div>

                            <div className="flex gap-8 pt-8 border-t border-surface2">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${notifyTelegram ? 'bg-red border-red shadow-lg shadow-red/20' : 'border-surface3 group-hover:border-red/50'}`}>
                                        {notifyTelegram && <Check size={16} className="text-white"/>}
                                    </div>
                                    <input type="checkbox" checked={notifyTelegram} onChange={e=>setNotifyTelegram(e.target.checked)} className="hidden"/>
                                    <span className="text-xs font-black uppercase tracking-widest text-text font-headline">Уведомить в Telegram</span>
                                </label>
                            </div>
                        </form>

                        {/* PREVIEW SIDE */}
                        <div className="hidden lg:flex lg:w-[450px] bg-surface1 p-10 flex-col items-center justify-start overflow-y-auto custom-scrollbar">
                            <TelegramPreview />
                            <div className="mt-10 p-6 premium-card bg-surface2/50 border-red/20 text-[11px] font-medium text-muted leading-relaxed shadow-xl">
                                <div className="flex items-center gap-3 text-red font-black uppercase mb-4 font-headline tracking-widest"><Info size={18}/> Совет</div>
                                Это превью того, как сообщение увидят сотрудники в Telegram. Проверьте зоны влияния и детализацию описания перед публикацией.
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-t-2 border-surface2 flex justify-end gap-6 bg-surface1">
                        <button 
                            onClick={()=>setIsModalOpen(false)} 
                            className="px-10 py-4 text-xs font-black uppercase tracking-widest text-muted hover:text-text transition-colors font-headline"
                            onMouseEnter={() => document.body.classList.add('cursor-hover')}
                            onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            className="px-16 py-5 btn-primary text-xs font-black uppercase tracking-[0.3em] font-headline shadow-2xl"
                            onMouseEnter={() => document.body.classList.add('cursor-hover')}
                            onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                        >
                            Опубликовать в HUB
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default MassIssuesView;
