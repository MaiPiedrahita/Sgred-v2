import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleAlert, Clock3, Dumbbell, Eye, EyeOff, Filter, LayoutDashboard,
  LockKeyhole, LogOut, MapPin, Menu, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Trophy, User, Users, Waves, X,
} from 'lucide-react'
import heroImage from './assets/sgred-hero.png'
import { apiRequest, setApiToken } from './services/api'

type View =
  | 'home' | 'catalog' | 'unit' | 'availability' | 'request' | 'success' | 'reservations'
  | 'profile' | 'login' | 'register' | 'recovery' | 'new-password' | 'internal-login'
  | 'admin' | 'admin-detail' | 'scenarios' | 'schedule' | 'staff'

type ApiUnit = { Id: number; Nombre: string; Direccion: string; Activa: boolean; Zona: string; Tipo: string }
type ApiScenario = { Id: number; Nombre: string; Capacidad: number; Estado: string; Tipo: string; UnidadId: number; Unidad: string }
type ApiCatalogItem = { Id: number; Nombre: string }
type ApiSlot = { horaInicio: string; horaFin: string; estado: string; seleccionable: boolean }
type ApiReservation = {
  Id: number; Codigo: string; Escenario: string; Unidad: string; FechaReserva: string
  HoraInicio: string; HoraFin: string; TipoUso: string; Estado: string
  Participantes?: number; MotivoRechazo?: string
}
type AdminRequest = {
  Id: number; Codigo: string; Nombres: string; Apellidos: string; EntidadRepresentada?: string
  Escenario: string; FechaReserva: string; HoraInicio: string; HoraFin: string
  TipoUso: string; Participantes: number; FechaSolicitud: string; Estado?: string
}
type AdminRequestDetail = AdminRequest & {
  Documento: string; Correo: string; Telefono: string; Observaciones?: string
}
type AuthUser = { id?: number; rol: string; nombres: string; apellidos: string; correo?: string; unidades?: Array<{ Id: number; Nombre: string }> }
type ReservationDraft = { escenarioId: number; fecha: string; horaInicio: string; horaFin: string }

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error'
const requestJson = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data === undefined ? {} : { body: JSON.stringify(data) }),
})
const formatTime = (value: string) => value.includes('T') ? value.slice(11, 16) : value.slice(0, 5)
const formatDate = (value: string) => {
  const date = value.slice(0, 10)
  const [year, month, day] = date.split('-').map(Number)
  return year && month && day
    ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
    : value
}
const dateForInput = (value: string) => value.slice(0, 10)
const displayError = (message: string) => message && <div className="alert-error"><CircleAlert /><span>{message}</span></div>

const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')

function Button({ children, variant = 'primary', className, onClick, disabled, type = 'button' }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white'
  className?: string; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={cn('btn', `btn-${variant}`, className)}>{children}</button>
}

function Field({ label, placeholder, type = 'text', icon, value, readOnly, error, name, onChange, required, min }: {
  label: string; placeholder?: string; type?: string; icon?: React.ReactNode; value?: string; readOnly?: boolean; error?: string
  name?: string; onChange?: (value: string) => void; required?: boolean; min?: number
}) {
  const [show, setShow] = useState(false)
  return <label className="field">
    <span className="field-label">{label}{readOnly && <LockKeyhole size={13} />}</span>
    <span className={cn('input-wrap', error && 'input-error', readOnly && 'input-readonly')}>
      {icon}<input type={show ? 'text' : type} placeholder={placeholder} value={onChange || readOnly ? value ?? '' : undefined} defaultValue={onChange || readOnly ? undefined : value} readOnly={readOnly} name={name} required={required} min={min} onChange={onChange ? e => onChange(e.target.value) : undefined} />
      {type === 'password' && <button type="button" className="icon-btn mini" onClick={() => setShow(!show)} aria-label="Mostrar contraseña">{show ? <EyeOff /> : <Eye />}</button>}
    </span>
    {error && <span className="error-text"><CircleAlert size={14} />{error}</span>}
  </label>
}

function SelectField({ label, children, value, onChange, name }: {
  label: string; children: React.ReactNode; value?: string; onChange?: (value: string) => void; name?: string
}) {
  return <label className="field"><span className="field-label">{label}</span><span className="input-wrap">
    <select name={name} value={onChange ? value ?? '' : undefined} defaultValue={onChange ? undefined : ''} onChange={onChange ? e => onChange(e.target.value) : undefined}><option value="" disabled>Seleccionar</option>{children}</select><ChevronDown size={17} />
  </span></label>
}

function Badge({ status }: { status: string }) {
  return <span className={cn('badge', `badge-${status.toLowerCase().replace(/ /g, '-')}`)}>
    <span className="status-dot" />{status}
  </span>
}

function Logo({ light = false }: { light?: boolean }) {
  return <div className={cn('logo', light && 'logo-light')}><span className="logo-mark"><Trophy /></span><span><b>SGRED</b><small>Medellín se mueve</small></span></div>
}

function PublicHeader({ go, signedIn, onMenu }: { go: (v: View) => void; signedIn: boolean; onMenu: () => void }) {
  return <header className="public-header">
    <div className="container nav-inner">
      <button className="logo-button" onClick={() => go('home')}><Logo /></button>
      <nav className="desktop-nav"><button onClick={() => go('home')}>Inicio</button><button onClick={() => go('catalog')}>Escenarios</button><button>¿Cómo funciona?</button></nav>
      <div className="nav-actions">
        {signedIn ? <>
          <Button variant="ghost" onClick={() => go('reservations')}><CalendarDays /> Mis reservas</Button>
          <button className="avatar" onClick={() => go('profile')}>JL</button>
        </> : <>
          <Button variant="ghost" onClick={() => go('login')}>Iniciar sesión</Button>
          <Button onClick={() => go('register')}>Crear cuenta</Button>
        </>}
      </div>
      <button className="mobile-menu" onClick={onMenu}><Menu /></button>
    </div>
  </header>
}

function Footer() {
  return <footer><div className="container footer-grid"><Logo light /><p>Reserva escenarios deportivos públicos de Medellín de forma fácil, transparente y segura.</p><div><b>Explora</b><span>Unidades deportivas</span><span>Cómo funciona</span><span>Preguntas frecuentes</span></div><div><b>Soporte</b><span>Centro de ayuda</span><span>contacto@sgred.gov.co</span><span>Línea 604 444 44 44</span></div></div><div className="container copyright">© 2025 SGRED · Alcaldía de Medellín <span>Términos · Privacidad · Accesibilidad</span></div></footer>
}

function Home({ go, onSelectUnit }: { go: (v: View) => void; onSelectUnit: (unit: ApiUnit) => void }) {
  const [units, setUnits] = useState<ApiUnit[]>([])
  const [scenarios, setScenarios] = useState<ApiScenario[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    void Promise.all([apiRequest<ApiUnit[]>('/unidades'), apiRequest<ApiScenario[]>('/escenarios')])
      .then(([unitData, scenarioData]) => { setUnits(unitData); setScenarios(scenarioData) })
      .catch(requestError => setError(errorMessage(requestError)))
  }, [])
  return <><section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,23,18,.93) 0%, rgba(8,23,18,.62) 47%, rgba(8,23,18,.12) 100%), url(${heroImage})` }}>
    <div className="container hero-content"><span className="eyebrow-light"><Sparkles /> El deporte de Medellín, más cerca de ti</span>
      <h1>Tu espacio para<br /><em>moverte y crecer.</em></h1>
      <p>Encuentra y reserva los mejores escenarios deportivos públicos de la ciudad, en pocos pasos.</p>
      <div className="quick-search"><div><Search /><span><small>¿Qué deporte buscas?</small><b>Fútbol, natación, baloncesto...</b></span></div><div><MapPin /><span><small>Zona o barrio</small><b>Todo Medellín</b></span></div><Button onClick={() => go('catalog')}>Buscar espacios <ArrowRight /></Button></div>
      <div className="hero-stats"><span><b>{units.length}</b> unidades deportivas</span><i /><span><b>{scenarios.filter(scenario => scenario.Estado === 'Activo').length}</b> escenarios disponibles</span><i /><span><b>+8.000</b> reservas gestionadas</span></div>
    </div>
  </section>
  <section className="section"><div className="container"><div className="section-heading"><div><span className="eyebrow">ESPACIOS PARA TODOS</span><h2>Escenarios destacados</h2><p>Instalaciones de calidad para practicar el deporte que te apasiona.</p></div><Button variant="secondary" onClick={() => go('catalog')}>Ver todos <ArrowRight /></Button></div>
    {displayError(error)}
    <div className="featured-grid">{units.slice(0, 3).map((unit, index) => {
      const unitScenarios = scenarios.filter(scenario => scenario.UnidadId === unit.Id)
      const Icon = index === 1 ? Waves : index === 2 ? Users : Trophy
      return <article className={`feature-card ${['feature-green', 'feature-blue', 'feature-orange'][index]}`} key={unit.Id}><div className="feature-icon"><Icon /></div><Badge status={unit.Activa ? 'Disponible' : 'No disponible'} /><h3>{unit.Nombre}</h3><p><MapPin /> {unit.Zona} · {unit.Direccion}</p><div className="sport-tags">{Array.from(new Set(unitScenarios.map(scenario => scenario.Tipo))).slice(0, 4).map(type => <span key={type}>{type}</span>)}</div><button onClick={() => { onSelectUnit(unit); go('unit') }}>Explorar unidad <ArrowRight /></button></article>
    })}</div>
  </div></section>
  <section className="how"><div className="container"><span className="eyebrow">SIMPLE Y TRANSPARENTE</span><h2>Reserva en tres pasos</h2><div className="steps"><div><b>01</b><span><Search /></span><h3>Encuentra tu espacio</h3><p>Filtra por deporte, zona y disponibilidad.</p></div><i /><div><b>02</b><span><CalendarDays /></span><h3>Elige fecha y hora</h3><p>Consulta las franjas disponibles en tiempo real.</p></div><i /><div><b>03</b><span><BadgeCheck /></span><h3>Envía tu solicitud</h3><p>Recibe confirmación y sigue su estado.</p></div></div></div></section>
  <section className="cta"><div><h2>¿Listo para moverte?</h2><p>Crea tu cuenta y empieza a reservar escenarios deportivos.</p></div><Button variant="white" onClick={() => go('register')}>Crear cuenta gratis <ArrowRight /></Button></section></>
}

function Catalog({ onSelectUnit }: { onSelectUnit: (unit: ApiUnit) => void }) {
  const [units, setUnits] = useState<ApiUnit[]>([])
  const [scenarios, setScenarios] = useState<ApiScenario[]>([])
  const [zones, setZones] = useState<ApiCatalogItem[]>([])
  const [unitTypes, setUnitTypes] = useState<ApiCatalogItem[]>([])
  const [scenarioTypes, setScenarioTypes] = useState<ApiCatalogItem[]>([])
  const [search, setSearch] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [unitTypeId, setUnitTypeId] = useState('')
  const [scenarioTypeId, setScenarioTypeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCatalog = async (filters = { search, zoneId, unitTypeId, scenarioTypeId }) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filters.zoneId) params.set('zonaId', filters.zoneId)
      if (filters.unitTypeId) params.set('tipoUnidadId', filters.unitTypeId)
      if (filters.scenarioTypeId) params.set('tipoEscenarioId', filters.scenarioTypeId)
      const query = params.toString()
      const [unitData, scenarioData] = await Promise.all([
        apiRequest<ApiUnit[]>('/unidades'),
        apiRequest<ApiScenario[]>(`/escenarios${query ? `?${query}` : ''}`),
      ])
      const searchTerm = filters.search.trim().toLocaleLowerCase()
      setUnits(unitData)
      setScenarios(searchTerm
        ? scenarioData.filter(scenario => scenario.Nombre.toLocaleLowerCase().includes(searchTerm) || scenario.Unidad.toLocaleLowerCase().includes(searchTerm))
        : scenarioData)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([
      apiRequest<ApiCatalogItem[]>('/catalogos/zonas'),
      apiRequest<ApiCatalogItem[]>('/catalogos/tipos-unidad'),
      apiRequest<ApiCatalogItem[]>('/catalogos/tipos-escenario'),
    ]).then(([zoneData, unitTypeData, scenarioTypeData]) => {
      setZones(zoneData)
      setUnitTypes(unitTypeData)
      setScenarioTypes(scenarioTypeData)
    }).catch(requestError => setError(errorMessage(requestError)))
    void loadCatalog()
  }, [])

  const filteredUnits = units.filter(unit => scenarios.some(scenario => scenario.UnidadId === unit.Id))
  const activeFilters = [
    zones.find(item => String(item.Id) === zoneId)?.Nombre,
    unitTypes.find(item => String(item.Id) === unitTypeId)?.Nombre,
    scenarioTypes.find(item => String(item.Id) === scenarioTypeId)?.Nombre,
    search.trim(),
  ].filter((value): value is string => !!value)
  const removeFilter = (filter: string) => {
    const next = {
      search: search.trim() === filter ? '' : search,
      zoneId: zones.find(item => String(item.Id) === zoneId)?.Nombre === filter ? '' : zoneId,
      unitTypeId: unitTypes.find(item => String(item.Id) === unitTypeId)?.Nombre === filter ? '' : unitTypeId,
      scenarioTypeId: scenarioTypes.find(item => String(item.Id) === scenarioTypeId)?.Nombre === filter ? '' : scenarioTypeId,
    }
    setSearch(next.search)
    setZoneId(next.zoneId)
    setUnitTypeId(next.unitTypeId)
    setScenarioTypeId(next.scenarioTypeId)
    void loadCatalog(next)
  }

  return <main className="page-bg"><div className="container page-content">
    <div className="breadcrumbs">Inicio <ChevronRight /> Escenarios deportivos</div>
    <div className="title-row"><div><span className="eyebrow">EXPLORA MEDELLÍN</span><h1>Encuentra tu próximo escenario</h1><p>Descubre espacios deportivos disponibles cerca de ti.</p></div><div className="result-count"><b>{scenarios.length}</b><span>escenarios<br />encontrados</span></div></div>
    <div className="catalog-layout"><aside className="filters-panel"><div className="filter-title"><b><SlidersHorizontal /> Filtros</b><button onClick={() => { setSearch(''); setZoneId(''); setUnitTypeId(''); setScenarioTypeId('') }}>Limpiar</button></div>
      <Field label="Buscar" placeholder="Nombre del escenario" icon={<Search size={18} />} value={search} onChange={setSearch} />
      <SelectField label="Zona o barrio" value={zoneId} onChange={setZoneId}>{zones.map(item => <option value={item.Id} key={item.Id}>{item.Nombre}</option>)}</SelectField>
      <SelectField label="Tipo de unidad" value={unitTypeId} onChange={setUnitTypeId}>{unitTypes.map(item => <option value={item.Id} key={item.Id}>{item.Nombre}</option>)}</SelectField>
      <SelectField label="Disciplina" value={scenarioTypeId} onChange={setScenarioTypeId}>{scenarioTypes.map(item => <option value={item.Id} key={item.Id}>{item.Nombre}</option>)}</SelectField>
      <Button className="full" onClick={() => void loadCatalog()}>Aplicar filtros</Button>
    </aside>
    <section className="results"><div className="active-filters">{activeFilters.map(f => <button key={f} onClick={() => removeFilter(f)}>{f}<X /></button>)}{activeFilters.length > 0 && <button className="clear" onClick={() => { setSearch(''); setZoneId(''); setUnitTypeId(''); setScenarioTypeId(''); void loadCatalog({ search: '', zoneId: '', unitTypeId: '', scenarioTypeId: '' }) }}>Limpiar todos</button>}<span className="sort">Ordenar por <b>Más cercanos</b><ChevronDown /></span></div>
      {displayError(error)}
      {loading ? <div className="loading-state"><Clock3 /></div> : filteredUnits.map((unit, index) => {
        const unitScenarios = scenarios.filter(scenario => scenario.UnidadId === unit.Id)
        const Icon = index % 3 === 1 ? Waves : index % 3 === 2 ? Users : Trophy
        return <article className="unit-card" key={unit.Id} onClick={() => onSelectUnit(unit)}><div className={cn('unit-visual', ['stadium', 'pool', 'court'][index % 3])}><span>{unitScenarios.length} escenarios</span><Icon /></div><div className="unit-info"><div><Badge status={unit.Activa ? 'Disponible' : 'No disponible'} /></div><h3>{unit.Nombre}</h3><p><MapPin /> {unit.Zona} · {unit.Direccion}</p><div className="sport-tags dark">{Array.from(new Set(unitScenarios.map(scenario => scenario.Tipo))).slice(0, 4).map(type => <span key={type}>{type}</span>)}</div><button onClick={event => { event.stopPropagation(); onSelectUnit(unit) }}>Ver escenarios <ArrowRight /></button></div></article>
      })}
    </section></div>
  </div></main>
}

function Unit({ unit, onSelectScenario, go }: { unit: ApiUnit | null; onSelectScenario: (scenario: ApiScenario) => void; go: (v: View) => void }) {
  const [scenarios, setScenarios] = useState<ApiScenario[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!unit) return
    void apiRequest<ApiScenario[]>(`/escenarios?unidadId=${unit.Id}`).then(setScenarios).catch(error => setError(errorMessage(error)))
  }, [unit])
  return <main><section className="unit-hero"><div className="container"><button className="back-light" onClick={() => go('catalog')}><ArrowLeft /> Volver al catálogo</button><div><span className="eyebrow-light"><MapPin /> {unit?.Zona?.toUpperCase() || 'LAURELES'}</span><h1>{unit?.Nombre || 'Unidad Deportiva'}<br /></h1><p>{unit?.Direccion || ''} · Medellín, Antioquia</p><div className="sport-tags">{Array.from(new Set(scenarios.map(scenario => scenario.Tipo))).slice(0, 4).map(type => <span key={type}>{type}</span>)}</div></div></div></section>
    <div className="container unit-content"><div className="unit-title"><div><span className="eyebrow">ELIGE TU ESPACIO</span><h2>Escenarios de esta unidad</h2><p>Consulta la disponibilidad y solicita tu reserva.</p></div><div className="legend"><b>Estado</b><Badge status="Disponible" /><Badge status="No disponible" /></div></div>
      {displayError(error)}
      <div className="scenario-grid">{scenarios.map(scenario => {
        const available = scenario.Estado === 'Activo'
        return <article className={cn('scenario-card', !available && 'disabled')} key={scenario.Id}><div className="scenario-icon"><Trophy /></div><div><Badge status={available ? 'Disponible' : 'No disponible'} /><h3>{scenario.Nombre}</h3><p>{scenario.Tipo} · Capacidad máxima: {scenario.Capacidad} personas</p></div>{available ? <Button onClick={() => onSelectScenario(scenario)}>Ver disponibilidad <ArrowRight /></Button> : <Button disabled>No disponible</Button>}</article>
      })}</div>
      <div className="info-strip"><Clock3 /><div><b>Horario general de la unidad</b><p>Lunes a domingo de 6:00 a.m. a 10:00 p.m. Los horarios pueden variar según el escenario.</p></div></div>
    </div>
  </main>
}

function Availability({ scenario, draft, onDraftChange, go }: {
  scenario: ApiScenario | null; draft: ReservationDraft; onDraftChange: (draft: ReservationDraft) => void; go: (v: View) => void
}) {
  const [selectedDate, setSelectedDate] = useState(draft.fecha || (() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return dateForInput(new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString())
  })())
  const [selected, setSelected] = useState(draft.horaInicio)
  const [slots, setSlots] = useState<ApiSlot[]>([])
  const [hours, setHours] = useState<{ apertura: string; cierre: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [week, setWeek] = useState(() => {
    const first = new Date()
    first.setDate(first.getDate() + 1)
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(first)
      date.setDate(first.getDate() + index)
      return date
    })
  })

  useEffect(() => {
    if (!scenario) return
    setLoading(true)
    setError('')
    void apiRequest<{ fecha: string; horario?: { apertura: string; cierre: string }; franjas: ApiSlot[] }>(
      `/escenarios/${scenario.Id}/disponibilidad?fecha=${selectedDate}`,
    ).then(result => {
      setSlots(result.franjas)
      setHours(result.horario ?? null)
      if (!result.franjas.some(slot => slot.horaInicio === selected && slot.seleccionable)) setSelected('')
    }).catch(requestError => setError(errorMessage(requestError))).finally(() => setLoading(false))
  }, [scenario, selectedDate])

  const selectDate = (date: Date) => {
    const value = dateForInput(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString())
    setSelectedDate(value)
    setSelected('')
  }
  const dates = week.map(date => ({
    date,
    value: dateForInput(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()),
    day: new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(date).replace('.', '').toUpperCase(),
    month: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
  }))
  const selectedLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))

  return <main className="page-bg"><div className="container page-content">
    <button className="back" onClick={() => go('unit')}><ArrowLeft /> {scenario?.Unidad || 'Unidad Deportiva Atanasio Girardot'}</button>
    <div className="availability-head"><div><span className="eyebrow">{scenario?.Nombre.toUpperCase() || 'CANCHA DE FÚTBOL 1'}</span><h1>Consulta la disponibilidad</h1><p>Selecciona una fecha y una franja disponible para continuar.</p></div><div className="legend large"><Badge status="Disponible" /><Badge status="Reservada" /><Badge status="En revisión" /><Badge status="No disponible" /></div></div>
    <div className="date-strip"><button disabled><ArrowLeft /></button>{dates.map(({ date, value, day, month }) => <button className={value === selectedDate ? 'active' : ''} key={value} onClick={() => selectDate(date)}><small>{day}</small><b>{date.getDate()}</b><span>{month}</span></button>)}<button onClick={() => setWeek(current => { const nextWeek = current.map(date => { const next = new Date(date); next.setDate(date.getDate() + 5); return next }); selectDate(nextWeek[0]); return nextWeek })}><ArrowRight /></button></div>
    {displayError(error)}
    <section className="schedule-card"><div className="schedule-title"><div><CalendarDays /><span><b>{selectedLabel}</b><small>{hours ? `Horario de operación: ${hours.apertura} – ${hours.cierre}` : 'Horario de operación: 6:00 a.m. – 10:00 p.m.'}</small></span></div><span>Selecciona una franja</span></div>
      <div className="slots">{loading ? <div className="loading-state"><Clock3 /></div> : slots.map(slot => <button key={slot.horaInicio} disabled={!slot.seleccionable} onClick={() => setSelected(slot.horaInicio)} className={cn(`slot-${slot.estado.toLowerCase().replace(' ', '-')}`, selected === slot.horaInicio && 'selected')}><span>{formatTime(slot.horaInicio)}</span><small>{formatTime(slot.horaFin)}</small><b>{slot.estado === 'Disponible' ? selected === slot.horaInicio ? 'Seleccionada' : 'Disponible' : slot.estado}</b>{selected === slot.horaInicio && <Check />}</button>)}</div>
      <div className="schedule-footer"><span><CircleAlert /> Las fechas pasadas y franjas ocupadas no pueden seleccionarse.</span><Button disabled={!scenario || !selected || loading} onClick={() => { const slot = slots.find(item => item.horaInicio === selected); if (scenario && slot) { onDraftChange({ escenarioId: scenario.Id, fecha: selectedDate, horaInicio: slot.horaInicio, horaFin: slot.horaFin }); go('request') } }}>Continuar con la reserva <ArrowRight /></Button></div>
    </section>
  </div></main>
}

function Request({ scenario, draft, onSuccess, go }: {
  scenario: ApiScenario | null; draft: ReservationDraft; onSuccess: (reservation: { id: number; codigo: string; estado: string; mensaje: string }) => void; go: (v: View) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const result = await apiRequest<{ id: number; codigo: string; estado: string; mensaje: string }>(
        '/reservas',
        requestJson('POST', {
          escenarioId: draft.escenarioId,
          fecha: draft.fecha,
          horaInicio: draft.horaInicio,
          horaFin: draft.horaFin,
          tipoUso: form.get('tipoUso'),
          participantes: Number(form.get('participantes')),
          observaciones: form.get('observaciones'),
        }),
      )
      onSuccess(result)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="page-bg"><div className="container narrow page-content"><button className="back" onClick={() => go('availability')}><ArrowLeft /> Volver a disponibilidad</button>
    <div className="stepper"><span className="done"><Check /></span><i /><span className="active">2</span><i /><span>3</span><div><b>Seleccionar franja</b><b>Completar solicitud</b><b>Confirmación</b></div></div>
    <form className="request-layout" onSubmit={submit}><section><span className="eyebrow">SOLICITUD DE RESERVA</span><h1>Cuéntanos sobre tu actividad</h1><p>Completa la información para enviar tu solicitud.</p>
      <div className="form-card">{displayError(error)}<div className="two-col"><Field label="Escenario" value={scenario?.Nombre || ''} readOnly /><Field label="Fecha" value={draft.fecha ? formatDate(draft.fecha) : ''} readOnly /><Field label="Hora de inicio" value={draft.horaInicio} readOnly /><Field label="Hora de fin" value={draft.horaFin} readOnly /></div><SelectField label="Tipo de uso *" name="tipoUso"><option value="Entrenamiento">Entrenamiento</option><option value="Torneo">Torneo</option><option value="Práctica libre">Práctica libre</option></SelectField><Field label="Número de participantes *" name="participantes" type="number" required min={1} />
      <label className="field"><span className="field-label">Observaciones <small>Opcional</small></span><textarea name="observaciones" placeholder="Cuéntanos cualquier detalle relevante para tu solicitud..." /><small className="char-count">0 / 300</small></label>
      <label className="terms"><input type="checkbox" defaultChecked /><span>Acepto las normas de uso del escenario y confirmo que la información es correcta.</span></label></div>
    </section>
    <aside className="summary"><span className="eyebrow">RESUMEN</span><h3>Tu reserva</h3><div className="summary-place"><span><Trophy /></span><div><b>{scenario?.Nombre}</b><small>{scenario?.Unidad}</small></div></div><dl><div><dt><CalendarDays /> Fecha</dt><dd>{draft.fecha ? formatDate(draft.fecha) : ''}</dd></div><div><dt><Clock3 /> Horario</dt><dd>{draft.horaInicio} – {draft.horaFin}</dd></div><div><dt><Users /> Capacidad</dt><dd>Máximo {scenario?.Capacidad} personas</dd></div></dl><div className="notice"><ShieldCheck /><p><b>Tu solicitud será revisada</b>Recibirás una notificación cuando el personal administrativo tome una decisión.</p></div><Button className="full" type="submit" disabled={submitting || !scenario || !draft.escenarioId}>{submitting ? 'Enviando solicitud…' : <>Enviar solicitud <ArrowRight /></>}</Button><small className="secure"><LockKeyhole /> Tus datos están protegidos</small></aside>
    </form></div></main>
}

function Success({ reservation, scenario, draft, user, go }: { reservation: { id: number; codigo: string; estado: string; mensaje: string } | null; scenario: ApiScenario | null; draft: ReservationDraft; user: AuthUser | null; go: (v: View) => void }) {
  return <main className="success-page"><section className="success-card"><div className="success-icon"><Check /></div><span className="eyebrow">SOLICITUD ENVIADA</span><h1>¡Todo listo, {user?.nombres || ''}!</h1><p>Recibimos tu solicitud y ya está en proceso de revisión.</p><div className="tracking"><small>CÓDIGO DE SEGUIMIENTO</small><b>{reservation?.codigo}</b><span>Guárdalo para consultar tu solicitud</span></div><div className="success-details"><div><CalendarDays /><span><small>Fecha y hora</small><b>{draft.fecha ? formatDate(draft.fecha) : ''} · {draft.horaInicio}–{draft.horaFin}</b></span></div><div><Trophy /><span><small>Escenario</small><b>{scenario?.Nombre}</b></span></div><div><Clock3 /><span><small>Estado</small><Badge status={reservation?.estado || 'Pendiente'} /></span></div></div><Button onClick={() => go('reservations')}>Ver mis reservas <ArrowRight /></Button><Button variant="ghost" onClick={() => go('catalog')}>Volver al catálogo</Button></section></main>
}

function Reservations({ go, toast }: { go: (v: View) => void; toast: (s: string) => void }) {
  const [cancel, setCancel] = useState(false)
  const [filter, setFilter] = useState('Todas')
  const [reservations, setReservations] = useState<ApiReservation[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    void apiRequest<ApiReservation[]>('/reservas/mias').then(setReservations).catch(requestError => setError(errorMessage(requestError)))
  }, [])
  const filteredReservations = reservations.filter(reservation => filter === 'Todas' || reservation.Estado === filter.slice(0, -1))
  return <main className="page-bg"><div className="container page-content">
    <div className="dashboard-head"><div><span className="eyebrow">TU ACTIVIDAD</span><h1>Mis reservas</h1><p>Consulta y gestiona tus solicitudes deportivas.</p></div><Button onClick={() => go('catalog')}>Nueva reserva <ArrowRight /></Button></div>
    <div className="tabs">{['Todas', 'Pendientes', 'Aprobadas', 'Rechazadas'].map(x => <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>{x}<span>{x === 'Todas' ? reservations.length : reservations.filter(reservation => reservation.Estado === x.slice(0, -1)).length}</span></button>)}</div>
    {displayError(error)}
    <div className="reservation-list">{filteredReservations.map(reservation => <article className="reservation-card" key={reservation.Id}><div className="res-icon"><Trophy /></div><div className="res-main"><div><span className="code">{reservation.Codigo}</span><Badge status={reservation.Estado} /></div><h3>{reservation.Escenario}</h3><p><CalendarDays /> {formatDate(reservation.FechaReserva)}<Clock3 /> {formatTime(reservation.HoraInicio)} – {formatTime(reservation.HoraFin)}<Users /> {reservation.TipoUso}</p>{reservation.Estado === 'Rechazada' && reservation.MotivoRechazo && <div className="rejection"><CircleAlert /> <span><b>Motivo del rechazo</b>{reservation.MotivoRechazo}</span></div>}</div><div className="res-actions"><Button variant="secondary">Ver detalle</Button>{reservation.Estado !== 'Rechazada' && <Button variant="ghost" onClick={() => setCancel(true)}>Cancelar reserva</Button>}</div></article>)}</div>
    {cancel && <div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={() => setCancel(false)}><X /></button><div className="modal-icon danger"><CircleAlert /></div><h2>¿Cancelar esta reserva?</h2><p>Esta acción no se puede deshacer. La franja volverá a estar disponible para otros usuarios.</p><div className="modal-summary"><b>Cancha de fútbol 1</b><span>24 Jun 2025 · 08:00–09:00</span></div><div className="modal-actions"><Button variant="secondary" onClick={() => setCancel(false)}>No, mantener reserva</Button><Button variant="danger" onClick={() => { setCancel(false); toast('Reserva cancelada correctamente') }}>Sí, cancelar reserva</Button></div></div></div>}
  </div></main>
}

function AuthPage({ mode, go, login }: { mode: 'login' | 'register' | 'recovery' | 'new-password' | 'internal'; go: (v: View) => void; login: (session: { token: string; usuario: { rol: string; nombres: string; apellidos: string } }) => void }) {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isInternal = mode === 'internal'
  const title = mode === 'register' ? 'Crea tu cuenta' : mode === 'recovery' ? 'Recupera tu contraseña' : mode === 'new-password' ? 'Crea una nueva contraseña' : isInternal ? 'Acceso administrativo' : 'Qué bueno verte de nuevo'
  return <main className={cn('auth-page', isInternal && 'auth-internal')}><section className="auth-brand"><Logo light /><div><span className="eyebrow-light">{isInternal ? 'CANAL INTERNO' : 'DEPORTE PARA TODOS'}</span><h1>{isInternal ? <>Gestión eficiente para<br /><em>servir mejor.</em></> : <>Reserva. Muévete.<br /><em>Vive Medellín.</em></>}</h1><p>{isInternal ? 'Administra solicitudes, escenarios y horarios desde un solo lugar.' : 'Accede a los escenarios deportivos de la ciudad de forma simple y transparente.'}</p></div><small>© 2025 SGRED · Alcaldía de Medellín</small></section>
    <section className="auth-form"><button className="auth-back" onClick={() => go('home')}><ArrowLeft /> Volver al inicio</button><div className="auth-box">
      {isInternal && <span className="internal-icon"><ShieldCheck /></span>}<span className="eyebrow">{isInternal ? 'PERSONAL AUTORIZADO' : mode === 'register' ? 'EMPECEMOS' : 'BIENVENIDO'}</span><h2>{title}</h2>
      <p>{mode === 'register' ? 'Regístrate para solicitar y gestionar tus reservas.' : mode === 'recovery' ? 'Ingresa tu correo y te enviaremos las instrucciones.' : mode === 'new-password' ? 'Debe tener al menos 8 caracteres e incluir números.' : isInternal ? 'Ingresa con tus credenciales institucionales.' : 'Ingresa a tu cuenta para continuar.'}</p>
      {sent ? <div className="sent-state"><div className="success-icon small"><Check /></div><h3>Revisa tu correo</h3><p>Si el correo existe, recibirás instrucciones para restablecer tu contraseña.</p><Button className="full" onClick={() => go('login')}>Volver a iniciar sesión</Button></div> :
      <form onSubmit={async e => {
        e.preventDefault()
        setError('')
        if (mode === 'recovery') { setSent(true); return }
        if (mode === 'new-password') { go('login'); return }
        const values = new FormData(e.currentTarget)
        setSubmitting(true)
        try {
          if (mode === 'register') {
            await apiRequest('/auth/registro', requestJson('POST', {
              documento: values.get('documento'),
              nombres: values.get('nombres'),
              apellidos: values.get('apellidos'),
              correo: values.get('correo'),
              password: values.get('password'),
              confirmacionPassword: values.get('confirmacionPassword'),
            }))
            go('login')
          } else {
            const session = await apiRequest<{ token: string; usuario: { rol: string; nombres: string; apellidos: string } }>('/auth/login', requestJson('POST', {
              correo: values.get('correo'),
              password: values.get('password'),
            }))
            login(session)
          }
        } catch (requestError) {
          setError(errorMessage(requestError))
        } finally {
          setSubmitting(false)
        }
      }}>
        {error && <div className="alert-error"><CircleAlert /><span>{error}</span></div>}
        {mode === 'register' && <><div className="two-col"><Field name="documento" label="Documento de identidad *" placeholder="Ej. 1020304050" /><Field name="nombres" label="Nombres *" placeholder="Tus nombres" /></div><div className="two-col"><Field name="apellidos" label="Apellidos *" placeholder="Tus apellidos" /><Field name="correo" label="Correo electrónico *" placeholder="nombre@correo.com" type="email" /></div></>}
        {(mode === 'login' || mode === 'internal' || mode === 'recovery') && <Field name="correo" label={isInternal ? 'Correo institucional' : 'Correo electrónico'} placeholder={isInternal ? 'empleado1@sgred.com' : 'usuario1@sgred.com'} type="email" icon={<User size={18} />} />}
        {(mode === 'login' || mode === 'internal' || mode === 'register' || mode === 'new-password') && <Field name="password" label={mode === 'new-password' ? 'Nueva contraseña' : 'Contraseña'} placeholder="••••••••" type="password" icon={<LockKeyhole size={18} />} />}
        {(mode === 'register' || mode === 'new-password') && <><div className="strength"><span /><span /><span /><span /><small>Fortaleza: <b>Buena</b></small></div><Field name="confirmacionPassword" label="Confirmar contraseña *" placeholder="••••••••" type="password" icon={<LockKeyhole size={18} />} /></>}
        {mode === 'login' && <div className="form-options"><label><input type="checkbox" /> Recordarme</label><button type="button" onClick={() => go('recovery')}>Olvidé mi contraseña</button></div>}
        <Button className="full" type="submit" disabled={submitting}>{mode === 'register' ? 'Crear mi cuenta' : mode === 'recovery' ? 'Enviar instrucciones' : mode === 'new-password' ? 'Actualizar contraseña' : 'Ingresar'} <ArrowRight /></Button>
        {mode === 'login' && <p className="switch-auth">¿Aún no tienes una cuenta? <button type="button" onClick={() => go('register')}>Regístrate gratis</button></p>}
        {mode === 'register' && <p className="switch-auth">¿Ya tienes una cuenta? <button type="button" onClick={() => go('login')}>Inicia sesión</button></p>}
      </form>}
      {isInternal && <div className="internal-note"><LockKeyhole /> Acceso exclusivo para personal autorizado de las unidades deportivas.</div>}
    </div></section>
  </main>
}

function Profile({ go, toast, logout }: { go: (v: View) => void; toast: (s: string) => void; logout: () => void }) {
  const [phoneError, setPhoneError] = useState(false)
  const [profile, setProfile] = useState({ Nombres: '', Apellidos: '', Documento: '', Correo: '', Telefono: '', EntidadRepresentada: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    void apiRequest<typeof profile>('/perfil').then(setProfile).catch(requestError => setError(errorMessage(requestError)))
  }, [])
  const update = (key: keyof typeof profile) => (value: string) => setProfile(current => ({ ...current, [key]: value }))
  const save = async () => {
    setError('')
    try {
      const saved = await apiRequest<typeof profile>('/perfil', requestJson('PUT', {
        nombres: profile.Nombres,
        apellidos: profile.Apellidos,
        telefono: profile.Telefono,
        entidadRepresentada: profile.EntidadRepresentada,
      }))
      setProfile(saved)
      setPhoneError(false)
      toast('Perfil actualizado correctamente')
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }
  return <main className="page-bg"><div className="container narrow page-content"><button className="back" onClick={() => go('home')}><ArrowLeft /> Volver</button><div className="profile-head"><div className="profile-avatar">{`${profile.Nombres[0] || ''}${profile.Apellidos[0] || ''}`}</div><div><span className="eyebrow">MI CUENTA</span><h1>Mi perfil</h1><p>Mantén tus datos personales actualizados.</p></div></div>{displayError(error)}<section className="form-card profile-form"><h3>Información personal</h3><div className="two-col"><Field label="Nombres" value={profile.Nombres} onChange={update('Nombres')} /><Field label="Apellidos" value={profile.Apellidos} onChange={update('Apellidos')} /><Field label="Documento de identidad" value={profile.Documento} readOnly /><Field label="Correo electrónico" value={profile.Correo} readOnly /><Field label="Teléfono" value={phoneError ? '123' : profile.Telefono} onChange={update('Telefono')} error={phoneError ? 'El número de teléfono no es válido' : undefined} /><Field label="Club o institución que representa" value={profile.EntidadRepresentada} onChange={update('EntidadRepresentada')} /></div><div className="profile-actions"><Button variant="ghost" onClick={logout}><LogOut /> Cerrar sesión</Button><Button variant="secondary" onClick={() => setPhoneError(true)}>Probar validación</Button><Button onClick={() => void save()}>Guardar cambios</Button></div></section></div></main>
}

function AdminShell({ view, go, children, logout, user }: { view: View; go: (v: View) => void; children: React.ReactNode; logout: () => void; user: AuthUser | null }) {
  const initials = `${user?.nombres[0] || ''}${user?.apellidos[0] || ''}`
  const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return <div className="admin-shell"><aside className="sidebar"><Logo light /><div className="admin-unit"><span>UD</span><div><small>UNIDAD ASIGNADA</small><b>{user?.unidades?.[0]?.Nombre || ''}</b></div></div><nav>
    <button className={view === 'admin' || view === 'admin-detail' ? 'active' : ''} onClick={() => go('admin')}><LayoutDashboard /> Solicitudes <span className="count">3</span></button>
    <button className={view === 'scenarios' ? 'active' : ''} onClick={() => go('scenarios')}><Trophy /> Escenarios</button>
    <button className={view === 'schedule' ? 'active' : ''} onClick={() => go('schedule')}><CalendarDays /> Horarios y bloqueos</button>
    <button className={view === 'staff' ? 'active' : ''} onClick={() => go('staff')}><Users /> Personal</button><button><Settings2 /> Configuración</button>
  </nav><div className="side-profile"><span>{initials}</span><div><b>{user ? `${user.nombres} ${user.apellidos}` : ''}</b><small>Administrador</small></div><button onClick={logout}><LogOut /></button></div></aside><main className="admin-main"><header className="admin-top"><button className="mobile-menu"><Menu /></button><div><Search /><input placeholder="Buscar solicitudes..." /></div><button className="bell"><Bell /><span /></button><span className="today">{today}</span></header>{children}</main></div>
}

function AdminDashboard({ go, onSelect, user }: { go: (v: View) => void; onSelect: (request: AdminRequest) => void; user: AuthUser | null }) {
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    void apiRequest<AdminRequest[]>('/admin/solicitudes').then(setRequests).catch(requestError => setError(errorMessage(requestError)))
  }, [])
  return <div className="admin-content"><div className="admin-welcome"><div><span className="eyebrow">PANEL ADMINISTRATIVO</span><h1>Buenos días, {user?.nombres}</h1><p>Estas son las solicitudes que requieren tu atención.</p></div><Button><CalendarDays /> Ver calendario</Button></div>
    <div className="stats-grid"><article><span className="stat-icon amber"><Clock3 /></span><div><small>Solicitudes pendientes</small><b>{requests.length}</b><em>Requieren revisión</em></div></article><article><span className="stat-icon green"><Check /></span><div><small>Aprobadas este mes</small><b>28</b><em>+12% vs. mes anterior</em></div></article><article><span className="stat-icon blue"><CalendarDays /></span><div><small>Reservas esta semana</small><b>16</b><em>En 4 escenarios</em></div></article><article><span className="stat-icon slate"><Trophy /></span><div><small>Escenarios activos</small><b>3/4</b><em>1 inactivo</em></div></article></div>
    {displayError(error)}
    <section className="admin-card"><div className="admin-card-head"><div><h2>Solicitudes pendientes <span>{requests.length}</span></h2><p>Ordenadas por antigüedad · las más antiguas primero</p></div><div><Button variant="secondary"><Filter /> Filtrar</Button><Button variant="secondary">Exportar</Button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Código</th><th>Solicitante</th><th>Escenario</th><th>Fecha y franja</th><th>Uso</th><th>Participantes</th><th>Solicitud</th><th /></tr></thead><tbody>{requests.map(request => <tr key={request.Id} onClick={() => { onSelect(request); go('admin-detail') }}><td><b className="green-text">{request.Codigo}</b></td><td><b>{request.Nombres} {request.Apellidos}</b><small>{request.EntidadRepresentada || ''}</small></td><td>{request.Escenario}</td><td><b>{formatDate(request.FechaReserva)}</b><small>{formatTime(request.HoraInicio)}–{formatTime(request.HoraFin)}</small></td><td>{request.TipoUso}</td><td><Users /> {request.Participantes}</td><td><Badge status="Pendiente" /><small>{formatDate(request.FechaSolicitud)}</small></td><td><ChevronRight /></td></tr>)}</tbody></table></div>
    </section>
  </div>
}

function AdminDetail({ request, go, toast }: { request: AdminRequest | null; go: (v: View) => void; toast: (s: string) => void }) {
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<AdminRequestDetail | null>(null)
  useEffect(() => {
    if (!request) return
    void apiRequest<AdminRequestDetail>(`/admin/solicitudes/${request.Id}`)
      .then(setDetail).catch(requestError => setError(errorMessage(requestError)))
  }, [request])
  const decide = async () => {
    if (!request || !modal) return
    setSubmitting(true)
    setError('')
    try {
      await apiRequest(`/admin/solicitudes/${request.Id}/${modal === 'approve' ? 'aprobar' : 'rechazar'}`, requestJson('POST', modal === 'reject' ? { motivo: reason } : {}))
      toast(modal === 'approve' ? 'Solicitud aprobada correctamente' : 'Solicitud rechazada correctamente')
      setModal(null)
      go('admin')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }
  if (!request) return <div className="admin-content">{displayError('Selecciona una solicitud para consultar su detalle.')}<Button variant="secondary" onClick={() => go('admin')}>Volver a solicitudes</Button></div>
  const shown = detail || request
  return <div className="admin-content"><button className="back" onClick={() => go('admin')}><ArrowLeft /> Volver a solicitudes</button><div className="detail-head"><div><span className="eyebrow">SOLICITUD {shown.Codigo}</span><h1>Detalle de solicitud</h1><p>Recibida el {formatDate(shown.FechaSolicitud)}</p></div><Badge status={shown.Estado || 'Pendiente'} /></div>
    {displayError(error)}
    <div className="detail-layout"><section className="admin-card detail-card"><h3>Información de la reserva</h3><div className="summary-place large"><span><Trophy /></span><div><b>{shown.Escenario}</b><small>{shown.EntidadRepresentada || ''}</small></div></div><div className="detail-grid"><div><small>Fecha</small><b><CalendarDays /> {formatDate(shown.FechaReserva)}</b></div><div><small>Horario</small><b><Clock3 /> {formatTime(shown.HoraInicio)} – {formatTime(shown.HoraFin)}</b></div><div><small>Tipo de uso</small><b><Dumbbell /> {shown.TipoUso}</b></div><div><small>Participantes</small><b><Users /> {shown.Participantes} personas</b></div></div><div className="observations"><small>OBSERVACIONES</small><p>{detail?.Observaciones || ''}</p></div></section>
      <aside className="admin-card applicant"><h3>Solicitante</h3><div className="applicant-head"><span>{`${shown.Nombres[0] || ''}${shown.Apellidos[0] || ''}`}</span><div><b>{shown.Nombres} {shown.Apellidos}</b><small>CC {detail?.Documento || ''}</small></div></div><dl><div><dt>Correo</dt><dd>{detail?.Correo || ''}</dd></div><div><dt>Teléfono</dt><dd>{detail?.Telefono || ''}</dd></div><div><dt>Club / Institución</dt><dd>{shown.EntidadRepresentada || ''}</dd></div></dl></aside></div>
    <div className="decision-bar"><div><ShieldCheck /><span><b>Decisión administrativa</b><small>Verifica que la información sea correcta antes de continuar.</small></span></div><Button variant="danger" onClick={() => setModal('reject')}>Rechazar solicitud</Button><Button onClick={() => setModal('approve')}><Check /> Aprobar solicitud</Button></div>
    {modal && <div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={() => setModal(null)}><X /></button><div className={cn('modal-icon', modal === 'approve' ? 'success' : 'danger')}>{modal === 'approve' ? <Check /> : <X />}</div><h2>{modal === 'approve' ? '¿Aprobar esta solicitud?' : 'Rechazar solicitud'}</h2><p>{modal === 'approve' ? 'La franja quedará reservada y la solicitante recibirá una notificación.' : 'Indica el motivo. Esta información será enviada a la solicitante.'}</p>{modal === 'reject' && <label className="field"><span className="field-label">Motivo del rechazo *</span><textarea value={reason} onChange={event => setReason(event.target.value)} /><small className="char-count">{reason.length} / 300 · Mínimo 10 caracteres</small></label>}<div className="modal-actions"><Button variant="secondary" onClick={() => setModal(null)}>Volver</Button><Button disabled={submitting || (modal === 'reject' && reason.trim().length < 10)} variant={modal === 'approve' ? 'primary' : 'danger'} onClick={() => void decide()}>{modal === 'approve' ? 'Sí, aprobar' : 'Confirmar rechazo'}</Button></div></div></div>}
  </div>
}

function Scenarios({ toast }: { toast: (s: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [scenarios, setScenarios] = useState<Array<ApiScenario & { TipoEscenarioId?: number; Descripcion?: string }>>([])
  const [error, setError] = useState('')
  useEffect(() => {
    void apiRequest<Array<ApiScenario & { TipoEscenarioId?: number; Descripcion?: string }>>('/admin/escenarios')
      .then(setScenarios).catch(requestError => setError(errorMessage(requestError)))
  }, [])
  const changeStatus = async (scenario: ApiScenario, active: boolean) => {
    setError('')
    try {
      await apiRequest(`/admin/escenarios/${scenario.Id}/estado`, requestJson('PATCH', { estado: active ? 'Activo' : 'Inactivo' }))
      setScenarios(current => current.map(item => item.Id === scenario.Id ? { ...item, Estado: active ? 'Activo' : 'Inactivo' } : item))
      toast(active ? 'Escenario activado' : 'Escenario inactivado')
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }
  return <div className="admin-content"><div className="admin-welcome"><div><span className="eyebrow">CONFIGURACIÓN</span><h1>Gestión de escenarios</h1><p>Administra los espacios deportivos de tu unidad.</p></div><Button onClick={() => setEditing(true)}>+ Nuevo escenario</Button></div>
    {displayError(error)}
    <section className="admin-card"><div className="admin-card-head"><div><h2>Escenarios <span>{scenarios.length}</span></h2><p>Unidad Deportiva Atanasio Girardot</p></div><Field label="" placeholder="Buscar escenario..." icon={<Search size={17} />} /></div><div className="scenario-admin-list">{scenarios.map(scenario => <article key={scenario.Id}><span className="scenario-icon"><Trophy /></span><div><h3>{scenario.Nombre}</h3><p>{scenario.Tipo} · Capacidad: {scenario.Capacidad} personas</p></div><Badge status={scenario.Estado} /><label className="toggle"><input type="checkbox" checked={scenario.Estado === 'Activo'} onChange={event => void changeStatus(scenario, event.target.checked)} /><span /></label><Button variant="ghost" onClick={() => setEditing(true)}>Editar</Button></article>)}</div></section>
    {editing && <div className="drawer-backdrop"><aside className="drawer"><div className="drawer-head"><div><span className="eyebrow">ESCENARIO</span><h2>Editar escenario</h2></div><button onClick={() => setEditing(false)}><X /></button></div><div className="drawer-body"><Field label="Nombre del escenario *" value="Cancha de fútbol 1" /><Field label="Unidad deportiva" value="Unidad Deportiva Atanasio Girardot" readOnly /><div className="two-col"><SelectField label="Tipo *"><option>Fútbol 11</option></SelectField><Field label="Capacidad *" value="22" /></div><Field label="Zona / Barrio *" value="Laureles" /><label className="field"><span className="field-label">Descripción</span><textarea defaultValue="Cancha reglamentaria de grama natural con iluminación." /></label></div><div className="drawer-footer"><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={() => { setEditing(false); toast('Escenario actualizado correctamente') }}>Guardar cambios</Button></div></aside></div>}
  </div>
}

function Schedule({ toast }: { toast: (s: string) => void }) {
  const [block, setBlock] = useState(false)
  return <div className="admin-content"><div className="admin-welcome"><div><span className="eyebrow">OPERACIÓN</span><h1>Horarios y bloqueos</h1><p>Configura la disponibilidad de tus escenarios.</p></div><Button onClick={() => setBlock(true)}>+ Bloquear franja</Button></div>
    <div className="schedule-admin-layout"><section className="admin-card hours"><div className="admin-card-head"><div><h2>Horario de operación</h2><p>Cancha de fútbol 1</p></div><Button variant="secondary">Guardar horario</Button></div>{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d,i) => <div className="day-row" key={d}><label className="toggle"><input type="checkbox" defaultChecked={i<6} /><span /></label><b>{d}</b><input type="time" defaultValue="06:00" disabled={i===6} /><span>a</span><input type="time" defaultValue="22:00" disabled={i===6} />{i===6 && <small>Cerrado</small>}</div>)}</section>
    <section className="admin-card blockers"><div className="admin-card-head"><div><h2>Bloqueos programados</h2><p>Junio 2025</p></div><div className="legend"><Badge status="Bloqueada" /><Badge status="Aprobada" /></div></div><div className="mini-calendar"><div className="week-head">{['Lun','Mar','Mié','Jue','Vie'].map(d=><b key={d}>{d}</b>)}</div>{[23,24,25,26,27].map(n=><div className="calendar-col" key={n}><b>{n}</b>{n===25 && <span className="calendar-book">08:00 Reserva</span>}{n===26 && <button className="calendar-block" onClick={() => setBlock(true)}>14:00 Mantenimiento</button>}{n===27 && <span className="calendar-book">10:00 Reserva</span>}</div>)}</div><div className="block-list"><div><span className="block-color" /><div><b>Mantenimiento del césped</b><small>26 Jun · 14:00–17:00 · Cancha de fútbol 1</small></div><Button variant="ghost" onClick={() => toast('Bloqueo eliminado correctamente')}>Desbloquear</Button></div></div></section></div>
    {block && <div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={() => setBlock(false)}><X /></button><div className="modal-icon warning"><CalendarDays /></div><h2>Bloquear una franja</h2><p>El espacio no estará disponible para reservas durante este periodo.</p><SelectField label="Escenario *"><option>Cancha de fútbol 1</option></SelectField><div className="two-col"><Field label="Fecha *" value="26/06/2025" /><Field label="Horario *" value="14:00 – 17:00" /></div><Field label="Motivo *" value="Mantenimiento del césped" /><div className="modal-actions"><Button variant="secondary" onClick={() => setBlock(false)}>Cancelar</Button><Button onClick={() => { setBlock(false); toast('Franja bloqueada correctamente') }}>Confirmar bloqueo</Button></div></div></div>}
  </div>
}

function Staff({ toast }: { toast: (s: string) => void }) {
  const [confirm, setConfirm] = useState(false)
  const [denied, setDenied] = useState(false)
  if (denied) return <div className="admin-content permission-state"><div className="permission-icon"><LockKeyhole /></div><span className="eyebrow">ACCESO RESTRINGIDO</span><h1>Sin permisos</h1><p>No tienes permisos para realizar esta acción. Contacta al administrador principal de la plataforma.</p><Button variant="secondary" onClick={() => setDenied(false)}>Volver al formulario</Button></div>
  return <div className="admin-content"><div className="admin-welcome"><div><span className="eyebrow">ADMINISTRACIÓN DE ACCESO</span><h1>Registrar personal administrativo</h1><p>Crea un acceso y asigna la unidad deportiva correspondiente.</p></div><Button variant="secondary" onClick={() => setDenied(true)}><LockKeyhole /> Ver estado sin permisos</Button></div>
    <section className="admin-card staff-form"><div className="staff-note"><ShieldCheck /><div><b>Acceso institucional</b><p>La persona recibirá en su correo las instrucciones para activar la cuenta.</p></div></div><div className="two-col"><Field label="Documento de identidad *" placeholder="Ej. 1032456789" /><Field label="Correo institucional *" value="empleado1@sgred.com" /><Field label="Nombres *" placeholder="Nombres del empleado" /><Field label="Apellidos *" placeholder="Apellidos del empleado" /></div><label className="field"><span className="field-label">Unidad deportiva asignada *</span><span className="input-wrap"><Search size={17} /><input defaultValue="Unidad Deportiva Atanasio Girardot" /><ChevronDown size={17} /></span></label><div className="profile-actions"><Button variant="secondary">Cancelar</Button><Button onClick={() => setConfirm(true)}>Revisar y guardar <ArrowRight /></Button></div></section>
    {confirm && <div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={() => setConfirm(false)}><X /></button><div className="modal-icon success"><User /></div><h2>Confirmar nuevo acceso</h2><p>Verifica los datos antes de registrar a esta persona como personal administrativo.</p><div className="confirm-data"><span><small>Correo</small><b>empleado1@sgred.com</b></span><span><small>Unidad asignada</small><b>U.D. Atanasio Girardot</b></span></div><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirm(false)}>Corregir datos</Button><Button onClick={() => { setConfirm(false); toast('Personal administrativo registrado correctamente') }}>Confirmar y guardar</Button></div></div></div>}
  </div>
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [signedIn, setSignedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [mobile, setMobile] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<ApiUnit | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<ApiScenario | null>(null)
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft>({ escenarioId: 0, fecha: '', horaInicio: '', horaFin: '' })
  const [createdReservation, setCreatedReservation] = useState<{ id: number; codigo: string; estado: string; mensaje: string } | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null)

  const go = (v: View) => { setView(v); setMobile(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const toast = (message: string) => { setToastMessage(message); setTimeout(() => setToastMessage(''), 3200) }
  const login = (session: { token: string; usuario: AuthUser }) => {
    setApiToken(session.token)
    setUser(session.usuario)
    const admin = session.usuario.rol === 'administrativo'
    setSignedIn(true)
    setIsAdmin(admin)
    setGlobalError('')
    go(admin ? 'admin' : 'home')
    toast(admin ? 'Bienvenido al canal administrativo' : 'Sesión iniciada correctamente')
  }
  const logout = async () => {
    try {
      if (signedIn) await apiRequest('/auth/logout', requestJson('POST'))
      setApiToken(null)
      setUser(null)
      setSignedIn(false)
      setIsAdmin(false)
      go('login')
      toast('Tu sesión se cerró correctamente')
    } catch (requestError) {
      setGlobalError(errorMessage(requestError))
    }
  }
  useEffect(() => {
    const expired = (event: Event) => {
      setApiToken(null)
      setUser(null)
      setSignedIn(false)
      setIsAdmin(false)
      setMobile(false)
      setView('login')
      setGlobalError((event as CustomEvent<string>).detail || 'La sesión ha expirado. Inicia sesión nuevamente.')
    }
    window.addEventListener('sgred-session-expired', expired)
    return () => window.removeEventListener('sgred-session-expired', expired)
  }, [])

  const authViews: View[] = ['login','register','recovery','new-password','internal-login']
  const adminViews: View[] = ['admin','admin-detail','scenarios','schedule','staff']
  const content = view === 'home' ? <Home go={go} onSelectUnit={unit => setSelectedUnit(unit)} /> : view === 'catalog' ? <Catalog onSelectUnit={unit => { setSelectedUnit(unit); go('unit') }} /> : view === 'unit' ? <Unit unit={selectedUnit} go={go} onSelectScenario={scenario => { setSelectedScenario(scenario); setReservationDraft({ escenarioId: scenario.Id, fecha: '', horaInicio: '', horaFin: '' }); go('availability') }} /> :
    view === 'availability' ? <Availability scenario={selectedScenario} draft={reservationDraft} onDraftChange={setReservationDraft} go={go} /> : view === 'request' ? <Request scenario={selectedScenario} draft={reservationDraft} onSuccess={result => { setCreatedReservation(result); go('success') }} go={go} /> : view === 'success' ? <Success reservation={createdReservation} scenario={selectedScenario} draft={reservationDraft} user={user} go={go} /> :
    view === 'reservations' ? <Reservations go={go} toast={toast} /> : view === 'profile' ? <Profile go={go} toast={toast} logout={logout} /> : null

  return <div className="app">
    {globalError && displayError(globalError)}
    {authViews.includes(view) ? <AuthPage mode={view === 'internal-login' ? 'internal' : view as 'login'|'register'|'recovery'|'new-password'} go={go} login={login} /> :
    adminViews.includes(view) ? <AdminShell view={view} go={go} logout={() => { void logout() }} user={user}>{view === 'admin' ? <AdminDashboard go={go} onSelect={setSelectedRequest} user={user} /> : view === 'admin-detail' ? <AdminDetail request={selectedRequest} go={go} toast={toast} /> : view === 'scenarios' ? <Scenarios toast={toast} /> : view === 'schedule' ? <Schedule toast={toast} /> : <Staff toast={toast} />}</AdminShell> :
    <><PublicHeader go={go} signedIn={signedIn} onMenu={() => setMobile(!mobile)} />{mobile && <div className="mobile-nav"><button onClick={() => go('home')}>Inicio</button><button onClick={() => go('catalog')}>Escenarios</button><button onClick={() => go('login')}>Iniciar sesión</button><button onClick={() => go('internal-login')}>Canal administrativo</button></div>}{content}<Footer /></>}
    {toastMessage && <div className="toast"><span><Check /></span><div><b>Operación exitosa</b><p>{toastMessage}</p></div><button onClick={() => setToastMessage('')}><X /></button></div>}
    {view === 'home' && <button className="admin-shortcut" onClick={() => go(isAdmin ? 'admin' : 'internal-login')}><ShieldCheck /> Canal administrativo</button>}
  </div>
}
