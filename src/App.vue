<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// --- State & Config ---
const views = [
  { id: 'month', name: 'Mês' },
  { id: 'week', name: 'Semana' },
  { id: 'day', name: 'Dia' },
  { id: 'list', name: 'Agenda' }
]

const view = ref('month')
const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const searchQuery = ref('')
const searchInput = ref(null)
const isDarkMode = ref(false)

// --- Dynamic Categories Data (Default loaded/saved in LocalStorage) ---
const categoriesData = ref([
  {
    id: 'pessoal',
    name: 'Pessoal',
    colorCode: '#10b981', // Emerald green
    subcategories: [
      { id: 'lazer', name: 'Lazer' },
      { id: 'saude', name: 'Saúde' },
      { id: 'financas', name: 'Finanças' }
    ]
  },
  {
    id: 'trabalho',
    name: 'Trabalho',
    colorCode: '#3b82f6', // Blue
    subcategories: [
      { id: 'reuniao', name: 'Reunião' },
      { id: 'projeto', name: 'Projeto' },
      { id: 'desenvolvimento', name: 'Desenvolvimento' }
    ]
  }
])

// --- Filters State ---
const activeCategoryFilters = ref({
  'pessoal': true,
  'trabalho': true
})

const activeSubcategoryFilters = ref({
  'lazer': true,
  'saude': true,
  'financas': true,
  'reuniao': true,
  'projeto': true,
  'desenvolvimento': true
})

// Initialize filters dynamically when categories are loaded/created
const initializeFilters = () => {
  categoriesData.value.forEach(cat => {
    if (activeCategoryFilters.value[cat.id] === undefined) {
      activeCategoryFilters.value[cat.id] = true
    }
    cat.subcategories.forEach(sub => {
      if (activeSubcategoryFilters.value[sub.id] === undefined) {
        activeSubcategoryFilters.value[sub.id] = true
      }
    })
  })
}

// Reset filters to check all
const resetFilters = () => {
  categoriesData.value.forEach(cat => {
    activeCategoryFilters.value[cat.id] = true
    cat.subcategories.forEach(sub => {
      activeSubcategoryFilters.value[sub.id] = true
    })
  })
}

// --- Events State ---
const events = ref([])

// --- Modals Toggles ---
const showAddModal = ref(false)
const showEditModal = ref(false)
const showSettingsModal = ref(false)
const showRecurrenceConfirm = ref(false)
const recurrencePending = ref(null)
const isSidebarOpen = ref(window.innerWidth > 1024)

// --- Settings Environment Forms State ---
const newCategoryName = ref('')
const newCategoryColor = ref('#3b82f6')
const newSubcategoryNames = ref({}) // key: category.id, value: input string

const editingCategoryId = ref(null)
const editingCategoryName = ref('')

const editingSubcategoryId = ref(null)
const editingSubcategoryName = ref('')

const colorPalette = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#ec4899', // Pink
  '#ef4444', // Red
  '#eab308', // Yellow
  '#06b6d4'  // Cyan
]

// --- Form Fields ---
const eventForm = ref({
  id: null,
  title: '',
  description: '',
  date: '',
  timeStart: '09:00',
  timeEnd: '10:00',
  categoryId: 'trabalho',
  subcategoryId: 'reuniao',
  recurrence: null,
  exceptions: {}
})

const editingExceptionDate = ref(null)
const recurForm = ref({
  freq: 'none',
  interval: 1,
  endType: 'never',
  endCount: 10,
  endDate: '',
  byDay: [],
  byMonthDay: 1
})

// --- Helper Date Formatting (PT-BR) ---
const formatMonthYear = (date) => {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

const formatDateShort = (date) => {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

const formatDateFull = (date) => {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

const getWeekDayName = (dayIndex) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return days[dayIndex]
}

const toDateString = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const getNextRecurDate = (current, r) => {
  const d = new Date(current)
  if (r.freq === 'daily') {
    d.setDate(d.getDate() + r.interval)
  } else if (r.freq === 'weekly') {
    if (r.byDay && r.byDay.length > 0) {
      if (r.byDay.length === 7) {
        d.setDate(d.getDate() + r.interval)
        return d
      }
      const startWeek = Math.floor(current.getTime() / (7 * 86400000))
      for (let i = 1; i <= 14; i++) {
        const test = new Date(current)
        test.setDate(test.getDate() + i)
        if (r.byDay.includes(test.getDay())) {
          const testWeek = Math.floor(test.getTime() / (7 * 86400000))
          if ((testWeek - startWeek) % r.interval === 0) return test
        }
      }
    }
    d.setDate(d.getDate() + 7 * r.interval)
  } else if (r.freq === 'monthly') {
    d.setMonth(d.getMonth() + r.interval)
  } else if (r.freq === 'yearly') {
    d.setFullYear(d.getFullYear() + r.interval)
  }
  return d
}

const expandRecurrences = (event, rangeStart, rangeEnd) => {
  if (!event.recurrence) return [event]

  const r = event.recurrence
  const results = []
  const start = parseDate(event.date)
  const rangeStartD = parseDate(rangeStart)
  const rangeEndD = parseDate(rangeEnd)

  const maxFuture = new Date(start)
  maxFuture.setFullYear(maxFuture.getFullYear() + 1)

  let end = r.until ? parseDate(r.until) : new Date(maxFuture)
  if (end > maxFuture) end = maxFuture
  if (end > rangeEndD) end = rangeEndD
  if (end < start) return []

  let count = 0
  let current = new Date(start)

  while (current <= end) {
    const dStr = toDateString(current)
    count++

    if (dStr >= rangeStart) {
      const exc = event.exceptions?.[dStr]
      if (exc?.deleted) {
        // skip
      } else {
        results.push({
          ...event,
          ...exc,
          date: dStr,
          id: event.id + '_' + dStr.replace(/-/g, ''),
          _masterId: event.id,
          _isRecurringInstance: true
        })
      }
    }

    if (r.count && count >= r.count) break
    if (count > 1000) break

    current = getNextRecurDate(current, r)
  }

  return results
}

// --- Dynamic Styling & Badge Helpers ---
const getCategoryColor = (catId) => {
  const cat = categoriesData.value.find(c => c.id === catId)
  return cat ? cat.colorCode : '#3b82f6'
}

const getCategoryName = (catId) => {
  const cat = categoriesData.value.find(c => c.id === catId)
  return cat ? cat.name : 'Sem Categoria'
}

const getSubcategoryName = (catId, subId) => {
  const cat = categoriesData.value.find(c => c.id === catId)
  if (!cat) return 'Sem Subcategoria'
  const sub = cat.subcategories.find(s => s.id === subId)
  return sub ? sub.name : 'Outros'
}

const getEventStyle = (catId) => {
  const color = getCategoryColor(catId)
  const isDark = isDarkMode.value
  return {
    backgroundColor: isDark ? `${color}25` : `${color}12`,
    border: `1px solid ${isDark ? `${color}40` : `${color}25`}`,
    borderLeft: `3px solid ${color}`,
    color: color
  }
}

const getEventCardStyle = (catId) => {
  const color = getCategoryColor(catId)
  return {
    borderLeft: `4px solid ${color}`
  }
}

// --- Initialize Mock Data dynamically relative to "Today" ---
const generateMockEvents = () => {
  const today = new Date()
  const relativeDate = (offsetDays) => {
    const d = new Date(today)
    d.setDate(today.getDate() + offsetDays)
    return toDateString(d)
  }

  return [
    {
      id: 1,
      title: 'Revisão do MVP do Calendário',
      description: 'Apresentação das principais visualizações (mês, semana, dia) e filtros de categorias.',
      date: relativeDate(0),
      timeStart: '10:00',
      timeEnd: '11:30',
      categoryId: 'trabalho',
      subcategoryId: 'projeto'
    },
    {
      id: 2,
      title: 'Reunião de Alinhamento Semanal',
      description: 'Alinhamento rápido de metas semanais com a equipe e divisão de tarefas.',
      date: relativeDate(0),
      timeStart: '14:00',
      timeEnd: '15:00',
      categoryId: 'trabalho',
      subcategoryId: 'reuniao'
    },
    {
      id: 3,
      title: 'Consulta de Rotina - Dentista',
      description: 'Checkup anual na clínica OdontoClean.',
      date: relativeDate(1),
      timeStart: '09:00',
      timeEnd: '10:00',
      categoryId: 'pessoal',
      subcategoryId: 'saude'
    },
    {
      id: 4,
      title: 'Entrega do Relatório Financeiro',
      description: 'Enviar o fechamento do caixa e relatórios consolidados para a diretoria.',
      date: relativeDate(3),
      timeStart: '08:00',
      timeEnd: '09:30',
      categoryId: 'trabalho',
      subcategoryId: 'projeto'
    },
    {
      id: 5,
      title: 'Sessão de Yoga e Alongamento',
      description: 'Foco em meditação e postura corporal para recarregar as energias.',
      date: relativeDate(-2),
      timeStart: '17:30',
      timeEnd: '18:30',
      categoryId: 'pessoal',
      subcategoryId: 'lazer'
    },
    {
      id: 6,
      title: 'Jantar de Comemoração',
      description: 'Jantar especial com a família.',
      date: relativeDate(5),
      timeStart: '20:00',
      timeEnd: '23:00',
      categoryId: 'pessoal',
      subcategoryId: 'lazer'
    },
    {
      id: 7,
      title: 'Mentoria Técnica de Programação',
      description: 'Dar suporte com dúvidas de arquitetura Vue e estilização responsiva.',
      date: relativeDate(2),
      timeStart: '14:00',
      timeEnd: '15:30',
      categoryId: 'trabalho',
      subcategoryId: 'desenvolvimento'
    },
    {
      id: 8,
      title: 'Planejamento de Finanças Pessoais',
      description: 'Ajustar planilha de gastos mensais e investimentos.',
      date: relativeDate(-1),
      timeStart: '21:00',
      timeEnd: '22:00',
      categoryId: 'pessoal',
      subcategoryId: 'financas'
    }
  ]
}

// --- Lifecycle & Persistence ---
onMounted(() => {
  // Load Dark Mode Preference
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark')
  }

  // Load Categories
  const savedCategories = localStorage.getItem('sincronia_categories')
  if (savedCategories) {
    categoriesData.value = JSON.parse(savedCategories)
  } else {
    saveCategoriesToStorage()
  }
  
  // Initialize filters map
  initializeFilters()

  // Load Events from LocalStorage or generate Mock Events
  const savedEvents = localStorage.getItem('sincronia_events')
  if (savedEvents) {
    events.value = JSON.parse(savedEvents)
  } else {
    events.value = generateMockEvents()
    saveToStorage()
  }
})

const saveToStorage = () => {
  localStorage.setItem('sincronia_events', JSON.stringify(events.value))
}

const saveCategoriesToStorage = () => {
  localStorage.setItem('sincronia_categories', JSON.stringify(categoriesData.value))
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// --- Navigation Operations ---
const navigatePeriod = (direction) => {
  const offset = direction === 'next' ? 1 : -1
  
  if (view.value === 'month') {
    const d = new Date(currentDate.value)
    d.setMonth(d.getMonth() + offset)
    currentDate.value = d
  } else if (view.value === 'week') {
    const d = new Date(currentDate.value)
    d.setDate(d.getDate() + (offset * 7))
    currentDate.value = d
  } else if (view.value === 'day') {
    const d = new Date(currentDate.value)
    d.setDate(d.getDate() + offset)
    currentDate.value = d
    selectedDate.value = d
  } else {
    // List/Agenda view just shifts month
    const d = new Date(currentDate.value)
    d.setMonth(d.getMonth() + offset)
    currentDate.value = d
  }
}

const navigateToday = () => {
  currentDate.value = new Date()
  selectedDate.value = new Date()
}

// --- Grid Calculators ---
const monthDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const startDayOfWeek = firstDay.getDay()
  
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - startDayOfWeek)
  
  const cells = []
  const tempDate = new Date(startDate)
  
  for (let i = 0; i < 42; i++) {
    const dStr = toDateString(tempDate)
    const isToday = dStr === toDateString(new Date())
    
    cells.push({
      date: new Date(tempDate),
      dayNumber: tempDate.getDate(),
      isCurrentMonth: tempDate.getMonth() === month,
      isToday,
      dateString: dStr
    })
    tempDate.setDate(tempDate.getDate() + 1)
  }
  
  return cells
})

const weekDays = computed(() => {
  const current = new Date(currentDate.value)
  const currentDayOfWeek = current.getDay()
  
  const sunday = new Date(current)
  sunday.setDate(current.getDate() - currentDayOfWeek)
  
  const days = []
  const tempDate = new Date(sunday)
  
  for (let i = 0; i < 7; i++) {
    const dStr = toDateString(tempDate)
    const isToday = dStr === toDateString(new Date())
    
    days.push({
      date: new Date(tempDate),
      dayNumber: tempDate.getDate(),
      dayName: getWeekDayName(i),
      isToday,
      dateString: dStr
    })
    tempDate.setDate(tempDate.getDate() + 1)
  }
  
  return days
})

const miniCalendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const startDayOfWeek = firstDay.getDay()
  
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - startDayOfWeek)
  
  const cells = []
  const tempDate = new Date(startDate)
  
  for (let i = 0; i < 35; i++) {
    const dStr = toDateString(tempDate)
    cells.push({
      date: new Date(tempDate),
      dayNumber: tempDate.getDate(),
      isCurrentMonth: tempDate.getMonth() === month,
      dateString: dStr
    })
    tempDate.setDate(tempDate.getDate() + 1)
  }
  
  return cells
})

// --- Filtering Core logic ---
const filteredEvents = computed(() => {
  return events.value.filter(e => {
    // Category filter
    if (activeCategoryFilters.value[e.categoryId] === false) return false
    
    // Subcategory filter
    if (activeSubcategoryFilters.value[e.subcategoryId] === false) return false
    
    // Search query
    if (searchQuery.value.trim() !== '') {
      const q = searchQuery.value.toLowerCase()
      const titleMatch = e.title.toLowerCase().includes(q)
      const descMatch = e.description ? e.description.toLowerCase().includes(q) : false
      
      const cat = categoriesData.value.find(c => c.id === e.categoryId)
      const catMatch = cat ? cat.name.toLowerCase().includes(q) : false
      
      let subMatch = false
      if (cat) {
        const sub = cat.subcategories.find(s => s.id === e.subcategoryId)
        subMatch = sub ? sub.name.toLowerCase().includes(q) : false
      }
      
      if (!titleMatch && !descMatch && !catMatch && !subMatch) return false
    }
    
    return true
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.timeStart.localeCompare(b.timeStart)
  })
})

const groupedEvents = computed(() => {
  const groups = {}
  const today = new Date()
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstOfNext = new Date(year, month + 1, 1)
  const rangeStart = toDateString(firstOfMonth)
  const rangeEnd = toDateString(new Date(firstOfNext.getTime() - 1))

  filteredEvents.value.forEach(e => {
    const expanded = expandRecurrences(e, rangeStart, rangeEnd)
    expanded.forEach(inst => {
      if (!groups[inst.date]) {
        groups[inst.date] = []
      }
      groups[inst.date].push(inst)
    })
  })

  const sortedDates = Object.keys(groups).sort()
  const result = []

  sortedDates.forEach(dateStr => {
    groups[dateStr].sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    const d = new Date(dateStr + 'T00:00:00')
    result.push({
      dateString: dateStr,
      dateFormatted: formatDateFull(d),
      events: groups[dateStr]
    })
  })

  return result
})

const getEventsForDate = (dateStr) => {
  const result = []
  filteredEvents.value.forEach(e => {
    const expanded = expandRecurrences(e, dateStr, dateStr)
    expanded.forEach(inst => {
      if (inst.date === dateStr) result.push(inst)
    })
  })
  return result.sort((a, b) => a.timeStart.localeCompare(b.timeStart))
}

const hasEventsOnDate = (dateStr) => {
  return events.value.some(e => {
    if (!activeCategoryFilters.value[e.categoryId]) return false
    if (!activeSubcategoryFilters.value[e.subcategoryId]) return false
    if (e.date === dateStr) {
      const exc = e.exceptions?.[dateStr]
      if (exc?.deleted) return false
      return true
    }
    if (e.recurrence) {
      const expanded = expandRecurrences(e, dateStr, dateStr)
      return expanded.some(inst => inst.date === dateStr)
    }
    return false
  })
}

// --- CRUD Actions for Events ---
const openAddEventModal = (dateStr = null) => {
  const dStr = dateStr || toDateString(selectedDate.value)

  const defaultCatId = categoriesData.value[0]?.id || ''
  const defaultCat = categoriesData.value.find(c => c.id === defaultCatId)
  const defaultSubId = defaultCat?.subcategories[0]?.id || ''

  eventForm.value = {
    id: null,
    title: '',
    description: '',
    date: dStr,
    timeStart: '09:00',
    timeEnd: '10:00',
    categoryId: defaultCatId,
    subcategoryId: defaultSubId,
    recurrence: null,
    exceptions: {}
  }

  recurForm.value = {
    freq: 'none',
    interval: 1,
    endType: 'never',
    endCount: 10,
    endDate: '',
    byDay: [],
    byMonthDay: 1
  }

  showAddModal.value = true
}

const openEditEventModal = (event, e) => {
  if (e) e.stopPropagation()
  editingExceptionDate.value = null

  if (event._isRecurringInstance) {
    recurrencePending.value = { event, action: 'edit' }
    showRecurrenceConfirm.value = true
    return
  }

  eventForm.value = {
    ...event
  }

  if (event.recurrence) {
    const r = event.recurrence
    recurForm.value = {
      freq: r.freq,
      interval: r.interval,
      endType: r.until ? 'date' : (r.count ? 'count' : 'never'),
      endCount: r.count || 10,
      endDate: r.until || '',
      byDay: r.byDay || [],
      byMonthDay: r.byMonthDay || 1
    }
  } else {
    recurForm.value = {
      freq: 'none',
      interval: 1,
      endType: 'never',
      endCount: 10,
      endDate: '',
      byDay: [],
      byMonthDay: 1
    }
  }

  showEditModal.value = true
}

const buildRecurrence = () => {
  if (recurForm.value.freq === 'none') return null
  const r = {
    freq: recurForm.value.freq,
    interval: recurForm.value.interval || 1
  }
  if (recurForm.value.freq === 'weekly' && recurForm.value.byDay.length > 0) {
    r.byDay = [...recurForm.value.byDay]
  }
  if (recurForm.value.freq === 'monthly') {
    r.byMonthDay = recurForm.value.byMonthDay || 1
  }
  if (recurForm.value.endType === 'count') {
    r.count = recurForm.value.endCount || 10
  } else if (recurForm.value.endType === 'date') {
    r.until = recurForm.value.endDate
  }
  return r
}

const saveNewEvent = () => {
  if (!eventForm.value.title.trim()) return

  const newEv = {
    ...eventForm.value,
    id: Date.now(),
    recurrence: buildRecurrence(),
    exceptions: {}
  }

  events.value.push(newEv)
  saveToStorage()
  showAddModal.value = false
}

const saveEditedEvent = () => {
  if (!eventForm.value.title.trim()) return

  if (editingExceptionDate.value) {
    const master = events.value.find(e => e.id === eventForm.value.id)
    if (master) {
      if (!master.exceptions) master.exceptions = {}
      const overrideFields = ['title', 'description', 'date', 'timeStart', 'timeEnd', 'categoryId', 'subcategoryId']
      const exc = {}
      overrideFields.forEach(f => { exc[f] = eventForm.value[f] })
      master.exceptions[editingExceptionDate.value] = exc
      events.value = [...events.value]
      saveToStorage()
    }
    editingExceptionDate.value = null
    showEditModal.value = false
    return
  }

  const index = events.value.findIndex(e => e.id === eventForm.value.id)
  if (index !== -1) {
    events.value[index] = {
      ...eventForm.value,
      recurrence: buildRecurrence()
    }
    saveToStorage()
  }
  showEditModal.value = false
}

const deleteEvent = () => {
  if (!eventForm.value.id) return
  events.value = events.value.filter(e => e.id !== eventForm.value.id)
  saveToStorage()
  showEditModal.value = false
}

const handleRecurrenceConfirm = (choice) => {
  if (!recurrencePending.value) return
  const { event, action } = recurrencePending.value

  if (action === 'delete') {
    if (choice === 'all') {
      events.value = events.value.filter(e => e.id === event._masterId ? false : true)
    } else {
      const master = events.value.find(e => e.id === event._masterId)
      if (master) {
        if (!master.exceptions) master.exceptions = {}
        master.exceptions[event.date] = { deleted: true }
        events.value = [...events.value]
      }
    }
    saveToStorage()
    showEditModal.value = false
  } else if (action === 'edit') {
    if (choice === 'all') {
      const master = events.value.find(e => e.id === event._masterId)
      if (master) {
        eventForm.value = { ...master, recurrence: master.recurrence ? { ...master.recurrence } : null }
        if (master.recurrence) {
          const r = master.recurrence
          recurForm.value = {
            freq: r.freq,
            interval: r.interval,
            endType: r.until ? 'date' : (r.count ? 'count' : 'never'),
            endCount: r.count || 10,
            endDate: r.until || '',
            byDay: r.byDay || [],
            byMonthDay: r.byMonthDay || 1
          }
        } else {
          recurForm.value = { freq: 'none', interval: 1, endType: 'never', endCount: 10, endDate: '', byDay: [], byMonthDay: 1 }
        }
        showEditModal.value = true
      }
    } else {
      const master = events.value.find(e => e.id === event._masterId)
      if (master) {
        if (!master.exceptions) master.exceptions = {}
        eventForm.value = { ...master, ...master.exceptions[event.date], id: master.id, date: event.date }
        editingExceptionDate.value = event.date
        showEditModal.value = true
      }
    }
  }

  showRecurrenceConfirm.value = false
  recurrencePending.value = null
}

const handleDeleteClick = () => {
  if (editingExceptionDate.value) {
    const master = events.value.find(e => e.id === eventForm.value.id)
    if (master) {
      if (!master.exceptions) master.exceptions = {}
      master.exceptions[editingExceptionDate.value] = { deleted: true }
      events.value = [...events.value]
      saveToStorage()
    }
    editingExceptionDate.value = null
    showEditModal.value = false
    return
  }
  if (eventForm.value.recurrence) {
    recurrencePending.value = { event: { _masterId: eventForm.value.id, date: eventForm.value.date }, action: 'delete' }
    showRecurrenceConfirm.value = true
  } else {
    deleteEvent()
  }
}

const closeEditModal = () => {
  editingExceptionDate.value = null
  showEditModal.value = false
}

const selectDayInGrid = (cell) => {
  selectedDate.value = cell.date
  currentDate.value = cell.date
  
  if (view.value === 'month') {
    view.value = 'day'
  } else if (view.value === 'week') {
    view.value = 'day'
  }
}

const onFormCategoryChange = () => {
  const cat = categoriesData.value.find(c => c.id === eventForm.value.categoryId)
  if (cat && cat.subcategories.length > 0) {
    eventForm.value.subcategoryId = cat.subcategories[0].id
  } else {
    eventForm.value.subcategoryId = ''
  }
}

const getSubcategoriesForForm = () => {
  const cat = categoriesData.value.find(c => c.id === eventForm.value.categoryId)
  return cat ? cat.subcategories : []
}

const toggleDayChip = (idx) => {
  const byDay = recurForm.value.byDay
  const pos = byDay.indexOf(idx)
  if (pos === -1) {
    byDay.push(idx)
    byDay.sort()
  } else {
    byDay.splice(pos, 1)
  }
}

// --- CRUD Actions for Categories & Subcategories ---
const addCategory = () => {
  if (!newCategoryName.value.trim()) return
  const id = 'cat-' + Date.now()
  categoriesData.value.push({
    id,
    name: newCategoryName.value.trim(),
    colorCode: newCategoryColor.value,
    subcategories: []
  })
  activeCategoryFilters.value[id] = true
  newCategoryName.value = ''
  saveCategoriesToStorage()
}

const deleteCategory = (catId) => {
  if (categoriesData.value.length <= 1) {
    alert('Você deve manter pelo menos uma categoria principal!')
    return
  }
  
  if (confirm('Tem certeza que deseja excluir esta categoria? Todos os compromissos vinculados a ela serão redirecionados.')) {
    categoriesData.value = categoriesData.value.filter(c => c.id !== catId)
    delete activeCategoryFilters.value[catId]
    
    const fallbackCatId = categoriesData.value[0].id
    const fallbackSubId = categoriesData.value[0].subcategories[0]?.id || ''
    
    events.value.forEach(e => {
      if (e.categoryId === catId) {
        e.categoryId = fallbackCatId
        e.subcategoryId = fallbackSubId
      }
    })
    
    saveToStorage()
    saveCategoriesToStorage()
  }
}

const addSubcategory = (catId) => {
  const name = newSubcategoryNames.value[catId]?.trim()
  if (!name) return
  
  const cat = categoriesData.value.find(c => c.id === catId)
  if (cat) {
    const subId = 'sub-' + Date.now()
    cat.subcategories.push({
      id: subId,
      name: name
    })
    activeSubcategoryFilters.value[subId] = true
    newSubcategoryNames.value[catId] = ''
    saveCategoriesToStorage()
  }
}

const deleteSubcategory = (catId, subId) => {
  const cat = categoriesData.value.find(c => c.id === catId)
  if (cat) {
    if (confirm('Deseja realmente excluir esta subcategoria?')) {
      cat.subcategories = cat.subcategories.filter(s => s.id !== subId)
      delete activeSubcategoryFilters.value[subId]
      
      const fallbackSubId = cat.subcategories[0]?.id || ''
      events.value.forEach(e => {
        if (e.categoryId === catId && e.subcategoryId === subId) {
          e.subcategoryId = fallbackSubId
        }
      })
      saveToStorage()
      saveCategoriesToStorage()
    }
  }
}

const updateCategoryColor = (catId, color) => {
  const cat = categoriesData.value.find(c => c.id === catId)
  if (cat) {
    cat.colorCode = color
    saveCategoriesToStorage()
  }
}

const startEditCategory = (cat) => {
  editingCategoryId.value = cat.id
  editingCategoryName.value = cat.name
}

const saveEditCategory = () => {
  if (!editingCategoryName.value.trim()) return
  const cat = categoriesData.value.find(c => c.id === editingCategoryId.value)
  if (cat) {
    cat.name = editingCategoryName.value.trim()
    saveCategoriesToStorage()
  }
  editingCategoryId.value = null
}

const startEditSubcategory = (sub) => {
  editingSubcategoryId.value = sub.id
  editingSubcategoryName.value = sub.name
}

const saveEditSubcategory = (catId) => {
  if (!editingSubcategoryName.value.trim()) return
  const cat = categoriesData.value.find(c => c.id === catId)
  if (cat) {
    const sub = cat.subcategories.find(s => s.id === editingSubcategoryId.value)
    if (sub) {
      sub.name = editingSubcategoryName.value.trim()
      saveCategoriesToStorage()
    }
  }
  editingSubcategoryId.value = null
}
</script>

<template>
  <div class="app-container">
    
    <!-- SIDEBAR OVERLAY BACKDROP -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="sidebar-overlay-backdrop"></div>
    
    <!-- SIDEBAR PANEL -->
    <aside class="sidebar" :class="{ 'open': isSidebarOpen, 'closed': !isSidebarOpen }">
      <div class="logo-section">
        <div class="logo-icon">S</div>
        <span class="logo-text">Sincronia</span>
        <button @click="isSidebarOpen = false" class="sidebar-close-btn" title="Fechar Menu">
          &times;
        </button>
      </div>
      
      <!-- FILTERS PANEL -->
      <div class="filters-section">
        
        <!-- Filter by Categories and Subcategories -->
        <div class="filter-group">
          <div class="filter-group-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="filter-group-title" style="margin-bottom: 0;">Filtros de Agenda</span>
            <button @click="resetFilters" class="clear-filters-btn" style="background: none; border: none; color: var(--accent); font-size: 11px; font-weight: 600; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background-color 0.2s;">Marcar Todos</button>
          </div>
          
          <div class="categories-filter-tree" style="display: flex; flex-direction: column; gap: 14px;">
            <div v-for="cat in categoriesData" :key="cat.id" class="cat-filter-tree-node" style="display: flex; flex-direction: column; gap: 6px;">
              
              <!-- Main category checkbox -->
              <label class="filter-item main-cat-item" style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" v-model="activeCategoryFilters[cat.id]" style="display: none;" />
                <span class="custom-checkbox" :style="{ borderColor: cat.colorCode, backgroundColor: activeCategoryFilters[cat.id] ? cat.colorCode : 'transparent' }"></span>
                <span class="category-name-text" :style="{ color: cat.colorCode, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }">{{ cat.name }}</span>
              </label>
              
              <!-- Nested subcategories list -->
              <div v-if="activeCategoryFilters[cat.id]" class="subcategories-filter-list" style="display: flex; flex-direction: column; gap: 6px; padding-left: 20px; border-left: 1px dashed var(--border-color); margin-left: 6px; margin-top: 4px;">
                <label v-for="sub in cat.subcategories" :key="sub.id" class="filter-item sub-cat-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; color: var(--text-secondary);">
                  <input type="checkbox" v-model="activeSubcategoryFilters[sub.id]" style="display: none;" />
                  <span class="custom-checkbox sub-checkbox" :style="{ borderColor: cat.colorCode, backgroundColor: activeSubcategoryFilters[sub.id] ? cat.colorCode : 'transparent', transform: 'scale(0.85)' }"></span>
                  <span class="subcategory-name-text">{{ sub.name }}</span>
                </label>
                
                <span v-if="cat.subcategories.length === 0" class="no-subs-msg" style="font-size: 11px; color: var(--text-muted); font-style: italic;">Sem subcategorias</span>
              </div>
              
            </div>
          </div>
          
        </div>
      </div>
      
      <!-- SIDEBAR FOOTER & SYSTEM SETTINGS -->
      <footer class="sidebar-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="footer-buttons" style="display: flex; gap: 8px;">
          <button @click="toggleTheme" class="theme-toggle-btn" title="Alternar Tema Escuro/Claro">
            <!-- Light bulb or Sun icon depending on theme -->
            <svg v-if="isDarkMode" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          </button>
          
          <button @click="showSettingsModal = true" class="theme-toggle-btn" title="Configurações de Categorias">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
        
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">
          MVP v1.0
        </div>
      </footer>
    </aside>
    
    <!-- Sidebar edge toggle button (desktop) -->
    <button @click="isSidebarOpen = !isSidebarOpen" class="sidebar-toggle-edge" title="Recolher/Expandir">
      <svg v-if="isSidebarOpen" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m15 18-6-6 6-6"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m9 18 6-6-6-6"/></svg>
    </button>
    
    <!-- MAIN WORKSPACE DASHBOARD -->
    <main class="main-content">
      
      <!-- TOP NAVIGATION HEADER -->
      <header class="top-header">
        
        <!-- Mobile hamburger menu button -->
        <button @click="isSidebarOpen = !isSidebarOpen" class="nav-btn hamburger-btn" title="Abrir/Fechar Filtros">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        
        <!-- Period Navigation (Prev, Today, Next) -->
        <div class="view-navigator">
          <button @click="navigatePeriod('prev')" class="nav-btn" title="Anterior">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button @click="navigateToday" class="btn-secondary today-btn" style="padding: 6px 14px; font-size: 13px;">
            <svg class="today-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span class="today-text">Hoje</span>
          </button>
          <button @click="navigatePeriod('next')" class="nav-btn" title="Próximo">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        
        <!-- Large Context Title -->
        <h2 class="current-period-title">
          <span v-if="view === 'month' || view === 'list'">{{ formatMonthYear(currentDate) }}</span>
          <span v-else-if="view === 'week'">
            {{ formatDateShort(weekDays[0].date) }} — {{ formatDateShort(weekDays[6].date) }}
          </span>
          <span v-else-if="view === 'day'">{{ formatDateFull(selectedDate) }}</span>
        </h2>
        
        <!-- Search box -->
        <div class="search-box" @click="searchInput?.focus()">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          <input 
            ref="searchInput"
            type="text" 
            placeholder="Buscar compromisso..." 
            v-model="searchQuery"
            class="search-input"
          />
        </div>
        
        <!-- View selector tabs -->
        <div class="view-selector-tabs">
          <button 
            v-for="v in views" 
            :key="v.id"
            @click="view = v.id"
            class="tab-btn"
            :class="{ active: view === v.id }"
          >
            {{ v.name }}
          </button>
        </div>
        
      </header>
      
      <!-- CALENDAR VIEWS WRAPPER -->
      <section class="calendar-workspace">
        
        <!-- 1. MONTH VIEW -->
        <div v-if="view === 'month'" class="month-view-grid" style="animation: fadeIn 0.2s ease;">
          <div class="grid-weekdays-header">
            <div class="weekday-header-cell" data-short="Dom">Dom</div>
            <div class="weekday-header-cell" data-short="Seg">Seg</div>
            <div class="weekday-header-cell" data-short="Ter">Ter</div>
            <div class="weekday-header-cell" data-short="Qua">Qua</div>
            <div class="weekday-header-cell" data-short="Qui">Qui</div>
            <div class="weekday-header-cell" data-short="Sex">Sex</div>
            <div class="weekday-header-cell" data-short="Sáb">Sáb</div>
          </div>
          
          <div class="grid-days-body">
            <div 
              v-for="cell in monthDays" 
              :key="cell.dateString"
              class="day-cell"
              :class="{ 
                'outside-month': !cell.isCurrentMonth,
                'is-today': cell.isToday
              }"
              @click="selectDayInGrid(cell)"
            >
              <div class="day-cell-header">
                <span class="day-number">{{ cell.dayNumber }}</span>
                <button 
                  @click.stop="openAddEventModal(cell.dateString)" 
                  class="add-event-inline-btn"
                  title="Criar evento neste dia"
                >
                  +
                </button>
              </div>
              
              <div class="day-cell-events-container">
                <div 
                  v-for="ev in getEventsForDate(cell.dateString)" 
                  :key="ev.id"
                  class="event-capsule"
                  :style="getEventStyle(ev.categoryId)"
                  @click="openEditEventModal(ev, $event)"
                  :title="`${ev.timeStart} ${ev.title} - ${getCategoryName(ev.categoryId)} (${getSubcategoryName(ev.categoryId, ev.subcategoryId)})`"
                >
                  <span class="event-time-badge">{{ ev.timeStart }}</span>
                  <span class="event-title-text">{{ ev.title }}</span>
                  <span v-if="ev.recurrence || ev._isRecurringInstance" class="recur-icon">⟳</span>
                </div>
                
                <!-- Dynamic dots indicator for mobile screens -->
                <div class="mobile-dots-indicator">
                  <span 
                    v-for="ev in getEventsForDate(cell.dateString)" 
                    :key="ev.id"
                    class="mobile-dot"
                    :style="{ backgroundColor: getCategoryColor(ev.categoryId) }"
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 2. WEEK VIEW -->
        <div v-else-if="view === 'week'" class="week-view-container" style="animation: fadeIn 0.2s ease;">
          <div 
            v-for="day in weekDays" 
            :key="day.dateString"
            class="week-column"
            :class="{ 'is-today': day.isToday }"
          >
            <div class="week-column-header">
              <span class="week-day-name">{{ day.dayName }}</span>
              <div class="week-day-number-bubble">{{ day.dayNumber }}</div>
            </div>
            
            <div class="week-events-list">
              <div 
                v-for="ev in getEventsForDate(day.dateString)" 
                :key="ev.id"
                class="event-card"
                :style="getEventCardStyle(ev.categoryId)"
                @click="openEditEventModal(ev, $event)"
              >
                <div class="event-card-header" style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                  <span class="event-card-title">{{ ev.title }}</span>
                  <span v-if="ev.recurrence || ev._isRecurringInstance" class="recur-icon">⟳</span>
                  <div class="category-badges" style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <span class="category-tag-badge" :style="{ backgroundColor: getCategoryColor(ev.categoryId), color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }">
                      {{ getCategoryName(ev.categoryId) }}
                    </span>
                    <span class="subcategory-tag-badge" :style="{ border: `1px solid ${getCategoryColor(ev.categoryId)}`, color: getCategoryColor(ev.categoryId), fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }">
                      {{ getSubcategoryName(ev.categoryId, ev.subcategoryId) }}
                    </span>
                  </div>
                </div>
                
                <span class="event-card-time">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {{ ev.timeStart }} - {{ ev.timeEnd }}
                </span>
                
                <p v-if="ev.description" class="event-card-desc">
                  {{ ev.description }}
                </p>
              </div>
              
              <!-- Quick Add placeholder at column bottom -->
              <div @click="openAddEventModal(day.dateString)" class="week-add-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 3. DAY VIEW -->
        <div v-else-if="view === 'day'" class="day-view-container" style="animation: fadeIn 0.2s ease;">
          
          <!-- Mini navigation sidebar -->
          <div class="day-sidebar-nav">
            <span class="mini-calendar-title">{{ formatMonthYear(currentDate) }}</span>
            <div class="mini-grid-days">
              <!-- Weekday initials -->
              <div v-for="wd in ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']" :key="wd" style="font-size: 11px; font-weight: 700; color: var(--text-muted);">
                {{ wd }}
              </div>
              <!-- Days cells -->
              <div 
                v-for="cell in miniCalendarDays" 
                :key="cell.dateString"
                class="mini-day-cell"
                :class="{ 
                  active: toDateString(selectedDate) === cell.dateString,
                  'has-events': hasEventsOnDate(cell.dateString)
                }"
                @click="selectedDate = cell.date; currentDate = cell.date;"
              >
                {{ cell.dayNumber }}
              </div>
            </div>
            
            <button @click="openAddEventModal()" class="btn-primary" style="margin-top: 12px; width: 100%;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5v14"/></svg>
              <span>Agendar Compromisso</span>
            </button>
          </div>
          
          <!-- Dynamic focus agenda list -->
          <div class="day-focus-agenda">
            <div class="agenda-header">
              <div class="agenda-date-details">
                <span class="agenda-day-title">{{ selectedDate.getDate() }}</span>
                <span class="agenda-day-subtitle">{{ formatDateFull(selectedDate) }}</span>
              </div>
              
              <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">
                {{ getEventsForDate(toDateString(selectedDate)).length }} Compromisso(s)
              </span>
            </div>
            
            <!-- Empty state for day -->
            <div v-if="getEventsForDate(toDateString(selectedDate)).length === 0" class="agenda-empty-state">
              <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
              <h4 class="empty-state-title">Nenhum compromisso agendado</h4>
              <p style="font-size: 13px;">Aproveite o dia livre ou crie um novo compromisso clicando no botão abaixo.</p>
              <button @click="openAddEventModal()" class="btn-secondary" style="margin-top: 8px;">
                Adicionar Compromisso
              </button>
            </div>
            
            <!-- Timed list of events -->
            <div v-else class="agenda-timeline">
              <div 
                v-for="ev in getEventsForDate(toDateString(selectedDate))" 
                :key="ev.id"
                class="agenda-time-row"
              >
                <div class="agenda-time-label">
                  <div>{{ ev.timeStart }}</div>
                  <div style="font-size: 10px; color: var(--text-muted); font-weight: 500;">Até {{ ev.timeEnd }}</div>
                </div>
                
                <div 
                  class="event-card"
                  :style="getEventCardStyle(ev.categoryId)"
                  @click="openEditEventModal(ev, $event)"
                >
                  <div class="event-card-header" style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                    <span class="event-card-title" style="font-size: 15px;">{{ ev.title }}</span>
                    <span v-if="ev.recurrence || ev._isRecurringInstance" class="recur-icon">⟳</span>
                    <div class="category-badges" style="display: flex; gap: 4px; flex-wrap: wrap;">
                      <span class="category-tag-badge" :style="{ backgroundColor: getCategoryColor(ev.categoryId), color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }">
                        {{ getCategoryName(ev.categoryId) }}
                      </span>
                      <span class="subcategory-tag-badge" :style="{ border: `1px solid ${getCategoryColor(ev.categoryId)}`, color: getCategoryColor(ev.categoryId), fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }">
                        {{ getSubcategoryName(ev.categoryId, ev.subcategoryId) }}
                      </span>
                    </div>
                  </div>
                  
                  <p v-if="ev.description" class="event-card-desc" style="font-size: 12px;">
                    {{ ev.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- 4. LIST/AGENDA VIEW -->
        <div v-else-if="view === 'list'" class="list-view-container" style="animation: fadeIn 0.2s ease;">
          <div v-if="groupedEvents.length === 0" class="agenda-empty-state" style="background-color: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--card-shadow);">
            <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <h4 class="empty-state-title">Nenhum compromisso encontrado</h4>
            <p style="font-size: 13px;">Experimente redefinir os filtros ou buscar por outro termo.</p>
          </div>
          
          <div 
            v-for="group in groupedEvents" 
            :key="group.dateString"
            class="list-view-group"
          >
            <div class="list-group-date-header">
              <span class="list-group-date-dot"></span>
              <span>{{ group.dateFormatted }}</span>
            </div>
            
            <div class="list-events-cards">
              <div 
                v-for="ev in group.events" 
                :key="ev.id"
                class="list-event-card-wide"
                :style="getEventCardStyle(ev.categoryId)"
                @click="openEditEventModal(ev, $event)"
              >
                <!-- Time slot indicator -->
                <div class="list-time-indicator">
                  <span class="list-time-start">{{ ev.timeStart }}</span>
                  <span class="list-time-end">até {{ ev.timeEnd }}</span>
                </div>
                
                <!-- Main details -->
                <div class="list-card-details">
                  <span class="list-card-title">{{ ev.title }}</span>
                  <span v-if="ev.recurrence || ev._isRecurringInstance" class="recur-icon">⟳</span>
                  <p v-if="ev.description" class="list-card-desc">{{ ev.description }}</p>
                  
                  <div class="list-card-meta" style="display: flex; gap: 4px; align-items: center;">
                    <span class="category-tag-badge" :style="{ backgroundColor: getCategoryColor(ev.categoryId), color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }">
                      {{ getCategoryName(ev.categoryId) }}
                    </span>
                    <span class="subcategory-tag-badge" :style="{ border: `1px solid ${getCategoryColor(ev.categoryId)}`, color: getCategoryColor(ev.categoryId), fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }">
                      {{ getSubcategoryName(ev.categoryId, ev.subcategoryId) }}
                    </span>
                  </div>
                </div>
                
                <!-- Edit button helper -->
                <div style="color: var(--text-muted);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </section>
      
      <!-- Floating Action Button for creating events -->
      <button @click="openAddEventModal()" class="fab-btn" title="Novo Evento">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
      </button>
      
    </main>
    
    <!-- MODAL: ADD EVENT -->
    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-content">
        <header class="modal-header">
          <span class="modal-title">Novo Compromisso</span>
          <button @click="showAddModal = false" class="modal-close-btn">&times;</button>
        </header>
        
        <form @submit.prevent="saveNewEvent" class="modal-body">
          <!-- Event Title -->
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input 
              type="text" 
              required 
              placeholder="Digite o título do compromisso" 
              v-model="eventForm.title"
              class="form-input"
            />
          </div>
          
          <!-- Event Description -->
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea 
              placeholder="Adicione detalhes, local, link de reuniões..." 
              v-model="eventForm.description"
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          
          <!-- Event Date -->
          <div class="form-group">
            <label class="form-label">Data</label>
            <input 
              type="date" 
              required
              v-model="eventForm.date"
              class="form-input"
            />
          </div>
          
          <!-- Time Start and End -->
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Hora Início</label>
              <input 
                type="time" 
                required
                v-model="eventForm.timeStart"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Hora Fim</label>
              <input 
                type="time" 
                required
                v-model="eventForm.timeEnd"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row-2col">
            <!-- Category -->
            <div class="form-group">
              <label class="form-label">Categoria Principal *</label>
              <select v-model="eventForm.categoryId" class="form-select" @change="onFormCategoryChange">
                <option v-for="cat in categoriesData" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            
            <!-- Subcategory -->
            <div class="form-group">
              <label class="form-label">Subcategoria *</label>
              <select v-model="eventForm.subcategoryId" class="form-select">
                <option v-for="sub in getSubcategoriesForForm()" :key="sub.id" :value="sub.id">
                  {{ sub.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Recurrence -->
          <div class="form-group">
            <label class="form-label">Frequência</label>
            <select v-model="recurForm.freq" class="form-select">
              <option value="none">Não repete</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
              <option value="yearly">Anualmente</option>
            </select>
          </div>

          <template v-if="recurForm.freq !== 'none'">
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Intervalo</label>
                <input type="number" min="1" max="99" v-model.number="recurForm.interval" class="form-input" />
              </div>
            </div>

            <div v-if="recurForm.freq === 'weekly'" class="form-group">
              <label class="form-label">Dias da semana</label>
              <div class="recur-day-chips">
                <button
                  type="button"
                  v-for="(name, idx) in ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']"
                  :key="idx"
                  class="recur-day-chip"
                  :class="{ active: recurForm.byDay.includes(idx) }"
                  @click="toggleDayChip(idx)"
                >{{ name }}</button>
              </div>
            </div>

            <div v-if="recurForm.freq === 'monthly'" class="form-group">
              <label class="form-label">Dia do mês</label>
              <input type="number" min="1" max="31" v-model.number="recurForm.byMonthDay" class="form-input" style="width: 80px;" />
            </div>

            <div class="form-group">
              <label class="form-label">Encerrar</label>
              <select v-model="recurForm.endType" class="form-select">
                <option value="never">Nunca</option>
                <option value="count">Após X ocorrências</option>
                <option value="date">Em uma data específica</option>
              </select>
            </div>

            <div v-if="recurForm.endType === 'count'" class="form-group">
              <label class="form-label">Número de ocorrências</label>
              <input type="number" min="1" max="365" v-model.number="recurForm.endCount" class="form-input" style="width: 100px;" />
            </div>

            <div v-if="recurForm.endType === 'date'" class="form-group">
              <label class="form-label">Data de término</label>
              <input type="date" v-model="recurForm.endDate" class="form-input" />
            </div>
          </template>
        </form>

        <footer class="modal-footer">
          <button @click="showAddModal = false" class="btn-secondary">Cancelar</button>
          <button @click="saveNewEvent" :disabled="!eventForm.title.trim()" class="btn-primary">
            Salvar
          </button>
        </footer>
      </div>
    </div>
    
    <!-- MODAL: EDIT / DELETE EVENT -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <header class="modal-header">
          <span class="modal-title">Editar Compromisso</span>
          <button @click="closeEditModal" class="modal-close-btn">&times;</button>
          </header>
        <form @submit.prevent="saveEditedEvent" class="modal-body">
          <!-- Event Title -->
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input 
              type="text" 
              required 
              placeholder="Digite o título do compromisso" 
              v-model="eventForm.title"
              class="form-input"
            />
          </div>
          
          <!-- Event Description -->
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea 
              placeholder="Adicione detalhes, local, link de reuniões..." 
              v-model="eventForm.description"
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          
          <!-- Event Date -->
          <div class="form-group">
            <label class="form-label">Data</label>
            <input 
              type="date" 
              required
              v-model="eventForm.date"
              class="form-input"
            />
          </div>
          
          <!-- Time Start and End -->
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Hora Início</label>
              <input 
                type="time" 
                required
                v-model="eventForm.timeStart"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Hora Fim</label>
              <input 
                type="time" 
                required
                v-model="eventForm.timeEnd"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row-2col">
            <!-- Category -->
            <div class="form-group">
              <label class="form-label">Categoria Principal *</label>
              <select v-model="eventForm.categoryId" class="form-select" @change="onFormCategoryChange">
                <option v-for="cat in categoriesData" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            
            <!-- Subcategory -->
            <div class="form-group">
              <label class="form-label">Subcategoria *</label>
              <select v-model="eventForm.subcategoryId" class="form-select">
                <option v-for="sub in getSubcategoriesForForm()" :key="sub.id" :value="sub.id">
                  {{ sub.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Recurrence -->
          <div class="form-group">
            <label class="form-label">Frequência</label>
            <select v-model="recurForm.freq" class="form-select">
              <option value="none">Não repete</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
              <option value="yearly">Anualmente</option>
            </select>
          </div>

          <template v-if="recurForm.freq !== 'none'">
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Intervalo</label>
                <input type="number" min="1" max="99" v-model.number="recurForm.interval" class="form-input" />
              </div>
            </div>

            <div v-if="recurForm.freq === 'weekly'" class="form-group">
              <label class="form-label">Dias da semana</label>
              <div class="recur-day-chips">
                <button
                  type="button"
                  v-for="(name, idx) in ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']"
                  :key="idx"
                  class="recur-day-chip"
                  :class="{ active: recurForm.byDay.includes(idx) }"
                  @click="toggleDayChip(idx)"
                >{{ name }}</button>
              </div>
            </div>

            <div v-if="recurForm.freq === 'monthly'" class="form-group">
              <label class="form-label">Dia do mês</label>
              <input type="number" min="1" max="31" v-model.number="recurForm.byMonthDay" class="form-input" style="width: 80px;" />
            </div>

            <div class="form-group">
              <label class="form-label">Encerrar</label>
              <select v-model="recurForm.endType" class="form-select">
                <option value="never">Nunca</option>
                <option value="count">Após X ocorrências</option>
                <option value="date">Em uma data específica</option>
              </select>
            </div>

            <div v-if="recurForm.endType === 'count'" class="form-group">
              <label class="form-label">Número de ocorrências</label>
              <input type="number" min="1" max="365" v-model.number="recurForm.endCount" class="form-input" style="width: 100px;" />
            </div>

            <div v-if="recurForm.endType === 'date'" class="form-group">
              <label class="form-label">Data de término</label>
              <input type="date" v-model="recurForm.endDate" class="form-input" />
            </div>
          </template>
        </form>

        <footer class="modal-footer">
          <button @click="handleDeleteClick" class="btn-danger">Excluir</button>
          <button @click="closeEditModal" class="btn-secondary">Cancelar</button>
          <button @click="saveEditedEvent" :disabled="!eventForm.title.trim()" class="btn-primary">
            Atualizar
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL: RECURRENCE CONFIRMATION -->
    <div v-if="showRecurrenceConfirm" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <header class="modal-header">
          <span class="modal-title">Evento Recorrente</span>
          <button @click="showRecurrenceConfirm = false; recurrencePending = null" class="modal-close-btn">&times;</button>
        </header>
        <div class="modal-body" style="padding: 20px 24px;">
          <p style="margin: 0 0 16px; font-size: 14px; color: var(--text-secondary);">
            {{ recurrencePending?.action === 'delete' ? 'Excluir' : 'Editar' }} este evento que se repete.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button @click="handleRecurrenceConfirm('all')" class="btn-primary" style="width: 100%; justify-content: center;">
              {{ recurrencePending?.action === 'delete' ? 'Excluir' : 'Editar' }} toda a série
            </button>
            <button @click="handleRecurrenceConfirm('this')" class="btn-secondary" style="width: 100%; justify-content: center;">
              {{ recurrencePending?.action === 'delete' ? 'Excluir' : 'Editar' }} apenas esta ocorrência
            </button>
            <button @click="showRecurrenceConfirm = false; recurrencePending = null" class="btn-secondary" style="width: 100%; justify-content: center;">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: SETTINGS (CONFIGURAÇÕES DE CATEGORIAS E SUBCATEGORIAS) -->
    <div v-if="showSettingsModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column;">
        <header class="modal-header">
          <span class="modal-title">Configurações de Categorias</span>
          <button @click="showSettingsModal = false" class="modal-close-btn">&times;</button>
        </header>
        
        <div class="modal-body" style="overflow-y: auto; flex-grow: 1; padding: 20px; display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Section A: Add New Main Category -->
          <div class="settings-section-card" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">+ Criar Nova Categoria Principal</h4>
            
            <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
              <div class="form-group" style="flex-grow: 1; margin-bottom: 0; min-width: 180px;">
                <label class="form-label" style="font-size: 11px;">Nome da Categoria</label>
                <input type="text" v-model="newCategoryName" placeholder="Ex: Estudos, Saúde..." class="form-input" />
              </div>
              
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Cor</label>
                <div style="display: flex; gap: 6px; align-items: center; height: 40px;">
                  <button 
                    v-for="color in colorPalette" 
                    :key="color"
                    type="button"
                    @click="newCategoryColor = color"
                    class="color-pick-circle"
                    :style="{ backgroundColor: color, border: newCategoryColor === color ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)' }"
                    style="width: 22px; height: 22px; border-radius: 50%; cursor: pointer; padding: 0; transition: transform 0.15s;"
                    :class="{ 'selected': newCategoryColor === color }"
                  ></button>
                </div>
              </div>
              
              <button @click="addCategory" :disabled="!newCategoryName.trim()" class="btn-primary" style="height: 40px; padding: 0 16px;">Criar</button>
            </div>
          </div>
          
          <!-- Section B: List and Manage existing Categories -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Categorias Existentes</h4>
            
            <div v-for="cat in categoriesData" :key="cat.id" class="settings-category-row" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 12px; background-color: var(--bg-primary);">
              
              <!-- Category Header: Title editing and Color editing -->
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-grow: 1;">
                  <span style="width: 12px; height: 12px; border-radius: 50%;" :style="{ backgroundColor: cat.colorCode }"></span>
                  
                  <!-- If editing this main category -->
                  <div v-if="editingCategoryId === cat.id" style="display: flex; gap: 6px; align-items: center; flex-grow: 1;">
                    <input type="text" v-model="editingCategoryName" class="form-input" style="height: 32px; padding: 4px 8px; font-size: 13px;" />
                    <button @click="saveEditCategory" class="btn-primary" style="height: 32px; padding: 0 10px; font-size: 12px;">Ok</button>
                    <button @click="editingCategoryId = null" class="btn-secondary" style="height: 32px; padding: 0 10px; font-size: 12px;">X</button>
                  </div>
                  <span v-else style="font-weight: 700; font-size: 15px; color: var(--text-primary);">
                    {{ cat.name }}
                  </span>
                </div>
                
                <!-- Palette selector for this category color change -->
                <div style="display: flex; gap: 4px; align-items: center;">
                  <button 
                    v-for="color in colorPalette" 
                    :key="color"
                    type="button"
                    @click="updateCategoryColor(cat.id, color)"
                    class="color-pick-circle-mini"
                    :style="{ backgroundColor: color, border: cat.colorCode === color ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)' }"
                    style="width: 14px; height: 14px; border-radius: 50%; cursor: pointer; padding: 0;"
                  ></button>
                </div>
                
                <!-- Main Category actions (Edit name / Delete) -->
                <div style="display: flex; gap: 6px;">
                  <button @click="startEditCategory(cat)" class="btn-secondary" style="height: 28px; padding: 0 8px; font-size: 11px;" title="Editar Nome">Editar</button>
                  <button @click="deleteCategory(cat.id)" class="btn-danger" style="height: 28px; padding: 0 8px; font-size: 11px; background-color: var(--danger-glow); color: var(--danger);" title="Excluir Categoria">Excluir</button>
                </div>
              </div>
              
              <!-- Subcategories Nested Management Block -->
              <div style="padding-left: 16px; border-left: 2px dashed var(--border-color); display: flex; flex-direction: column; gap: 8px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Subcategorias de {{ cat.name }}</span>
                
                <!-- Subcategory pills list with inline deletes -->
                <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                  <div 
                    v-for="sub in cat.subcategories" 
                    :key="sub.id"
                    class="settings-sub-pill"
                    style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 20px; font-size: 12px;"
                  >
                    <!-- If editing this subcategory -->
                    <div v-if="editingSubcategoryId === sub.id" style="display: flex; gap: 4px; align-items: center;">
                      <input type="text" v-model="editingSubcategoryName" class="form-input" style="height: 24px; padding: 2px 6px; font-size: 11px; width: 90px;" />
                      <button @click="saveEditSubcategory(cat.id)" class="btn-primary" style="height: 24px; padding: 0 6px; font-size: 10px;">Ok</button>
                    </div>
                    <span v-else @dblclick="startEditSubcategory(sub)" style="cursor: pointer;" title="Clique duplo para renomear">{{ sub.name }}</span>
                    
                    <button @click="startEditSubcategory(sub)" style="background: none; border: none; padding: 0; color: var(--text-muted); cursor: pointer; display: flex; align-items: center;" title="Renomear">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button @click="deleteSubcategory(cat.id, sub.id)" style="background: none; border: none; padding: 0; color: var(--danger); font-weight: bold; cursor: pointer;" title="Remover subcategoria">&times;</button>
                  </div>
                  
                  <span v-if="cat.subcategories.length === 0" style="font-size: 12px; color: var(--text-muted); font-style: italic;">Sem subcategorias cadastradas.</span>
                </div>
                
                <!-- Quick add form for subcategory -->
                <div style="display: flex; gap: 8px; margin-top: 4px; max-width: 320px;">
                  <input 
                    type="text" 
                    placeholder="Adicionar nova subcategoria..." 
                    v-model="newSubcategoryNames[cat.id]"
                    class="form-input" 
                    style="height: 32px; padding: 4px 8px; font-size: 12px;"
                    @keyup.enter="addSubcategory(cat.id)"
                  />
                  <button @click="addSubcategory(cat.id)" class="btn-secondary" style="height: 32px; padding: 0 12px; font-size: 12px;">+ Add</button>
                </div>
                
              </div>
              
            </div>
          </div>
          
        </div>
        
        <footer class="modal-footer" style="padding: 16px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; background-color: var(--bg-secondary);">
          <button @click="showSettingsModal = false" class="btn-primary">Fechar Configurações</button>
        </footer>
      </div>
    </div>
    
  </div>
</template>
