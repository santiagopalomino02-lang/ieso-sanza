import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Award, BookOpen, Check, ChevronRight, CirclePlay, Clock3, FileText, GraduationCap, Lock, Menu, Plus, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase, createTempClient } from './lib/supabase'
import './styles.css'
import './admin.css'
import './v3.css'
import './v4.css'
import './v5.css'

// ============================================================
// USUARIO <-> CORREO SINTÃ‰TICO
// (el estudiante solo ve "usuario", Supabase por dentro usa correo)
// ============================================================
const DOMAIN = '@ieso.local'
const usernameToEmail = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + DOMAIN

// ============================================================
// SESIÃ“N Y PERFIL
// ============================================================
type Profile = { id: string; username: string; role: 'admin' | 'student' }

function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase!.from('profiles').select('id,username,role').eq('id', userId).single()
    setProfile((data as Profile) || null)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return { session, profile, loading }
}

// ============================================================
// COMPONENTES BASE
// ============================================================
const Logo = ({ light = false }: { light?: boolean }) =>
  <div className={'logo ' + (light ? 'light' : '')}>
    <div className="logo-mark">I</div>
    <div><strong>IESO</strong><span>Instituto de EducaciÃ³n Superior Oficial</span><small>REINO DE SANZA</small></div>
  </div>

const Progress = ({ value }: { value: number }) =>
  <div className="progress"><i style={{ width: `${value}%` }} /></div>

function Nav({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const logout = async () => { await supabase?.auth.signOut(); nav('/') }
  return (
    <header>
      <Link to="/" className="brand"><Logo /></Link>
      <nav className={open ? 'open' : ''}>
        <Link to="/programas">Programas</Link>
        {session
          ? <>
              {profile?.role === 'admin' && <Link to="/gestion">GestiÃ³n</Link>}
              <button className="outline-btn" onClick={logout}>Cerrar sesiÃ³n <Lock size={15} /></button>
            </>
          : <Link className="outline-btn" to="/ingresar">Iniciar sesiÃ³n <ArrowRight size={15} /></Link>
        }
      </nav>
      <button className="menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={14} /> EDUCACIÃ“N PÃšBLICA Â· REINO DE SANZA</div>
        <h1>EducaciÃ³n superior pÃºblica para construir el <em>futuro</em> de Sanza.</h1>
        <p>Accede gratuitamente a programas de formaciÃ³n diseÃ±ados para fortalecer el servicio pÃºblico, el desarrollo econÃ³mico y el crecimiento del Reino de Sanza.</p>
        <div className="actions">
          <Link className="primary-btn" to="/programas">Explorar programas <ArrowRight size={17} /></Link>
          <Link className="text-btn" to="/ingresar">Iniciar sesiÃ³n <ChevronRight size={17} /></Link>
        </div>
      </div>
      <div className="hero-art">
        <div className="sun"></div><div className="arch arch-a"></div><div className="arch arch-b"></div>
        <div className="art-card card-one"><GraduationCap /><span>Aprendizaje<br /><b>sin fronteras</b></span></div>
        <div className="art-card card-two"><span>FORMACIÃ“N</span><b>Acceso<br />pÃºblico</b></div>
        <div className="ribbon">IESO Â· SANZA Â· IESO Â· SANZA Â· IESO Â· SANZA Â·</div>
      </div>
    </section>
  )
}

// ============================================================
// DATOS: PROGRAMAS
// ============================================================
type ProgramRow = { id: string; title: string; description: string; duration: string }
type ProgramCardData = ProgramRow & { moduleCount: number; progress: number; color: string; icon: string }
const PALETTE = ['blue', 'amber', 'teal', 'violet', 'green', 'coral', 'olive']

async function fetchProgramCards(userId?: string): Promise<ProgramCardData[]> {
  if (!supabase) return []
  const { data: programs } = await supabase.from('programs').select('id,title,description,duration').eq('published', true)
  if (!programs) return []
  const { data: modules } = await supabase.from('modules').select('id,program_id')
  let completedIds: string[] = []
  if (userId) {
    const { data: completions } = await supabase.from('module_completions').select('module_id').eq('user_id', userId)
    completedIds = (completions || []).map(c => c.module_id)
  }
  return programs.map((p, i) => {
    const mods = (modules || []).filter(m => m.program_id === p.id)
    const done = mods.filter(m => completedIds.includes(m.id)).length
    return {
      ...p,
      moduleCount: mods.length,
      progress: mods.length ? Math.round((done / mods.length) * 100) : 0,
      color: PALETTE[i % PALETTE.length],
      icon: String(i + 1).padStart(2, '0'),
    }
  })
}

function ProgramCard({ p }: { p: ProgramCardData }) {
  return (
    <motion.article className="program-card" whileHover={{ y: -5 }} transition={{ duration: .25 }}>
      <div className={'program-visual ' + p.color}><span>{p.icon}</span><div className="visual-shape"></div><BookOpen size={24} /></div>
      <div className="program-content">
        <div className="program-meta"><span>{p.duration}</span><span>{p.moduleCount} mÃ³dulos</span></div>
        <h3>{p.title}</h3><p>{p.description}</p>
        {p.progress > 0 && <div className="card-progress"><div><span>Tu avance</span><b>{p.progress}%</b></div><Progress value={p.progress} /></div>}
        <Link to={`/curso/${p.id}`} className="card-link">Ingresar <ArrowRight size={16} /></Link>
      </div>
    </motion.article>
  )
}

function Home({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const [items, setItems] = useState<ProgramCardData[]>([])
  useEffect(() => { fetchProgramCards(session?.user.id).then(setItems) }, [session?.user.id])
  return (
    <>
      <Nav session={session} profile={profile} />
      <main>
        <Hero />
        <section className="program-section">
          <div className="section-head">
            <div><div className="eyebrow">OFERTA ACADÃ‰MICA</div><h2>Programas que impulsan<br /><em>el bien comÃºn.</em></h2></div>
            <Link to="/programas" className="see-all">Ver todos los programas <ArrowRight size={17} /></Link>
          </div>
          <div className="program-grid">{items.slice(0, 3).map(p => <ProgramCard key={p.id} p={p} />)}</div>
        </section>
      </main>
      <footer><Logo light /><span>Â© 2026 Instituto de EducaciÃ³n Superior Oficial de Sanza</span></footer>
    </>
  )
}

function ProgramsPage({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const [items, setItems] = useState<ProgramCardData[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => { fetchProgramCards(session?.user.id).then(setItems) }, [session?.user.id])
  const shown = items.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <Nav session={session} profile={profile} />
      <main className="listing">
        <div className="listing-intro"><div className="eyebrow">OFERTA ACADÃ‰MICA</div><h1>Encuentra tu prÃ³ximo<br /><em>propÃ³sito.</em></h1><p>Programas gratuitos, modulares y orientados a los retos reales de Sanza.</p></div>
        <div className="catalog-tools"><div className="search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar programa" /></div></div>
        <div className="program-grid all">{shown.map(p => <ProgramCard key={p.id} p={p} />)}</div>
      </main>
      <footer><Logo light /></footer>
    </>
  )
}

// ============================================================
// CURSO
// ============================================================
type ModuleRow = { id: string; program_id: string; position: number; title: string; content: string | null; material_path: string | null; video_url: string | null }

function CoursePage({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const { id } = useParams()
  const [program, setProgram] = useState<ProgramRow | null>(null)
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!supabase || !id || !session) return
    (async () => {
      const { data: prog } = await supabase.from('programs').select('id,title,description,duration').eq('id', id).single()
      setProgram(prog || null)
      const { data: enr } = await supabase.from('enrollments').select('user_id').eq('user_id', session.user.id).eq('program_id', id).maybeSingle()
      setEnrolled(!!enr)
      if (enr) {
        const { data: mods } = await supabase.from('modules').select('*').eq('program_id', id).order('position')
        setModules(mods || [])
        const { data: comp } = await supabase.from('module_completions').select('module_id').eq('user_id', session.user.id)
        setCompleted((comp || []).map(c => c.module_id))
      }
    })()
  }, [id, session?.user.id])

  if (!session) return <Navigate to="/ingresar" replace />
  if (enrolled === false) {
    return (
      <>
        <Nav session={session} profile={profile} />
        <main className="assessment"><section className="question"><Lock size={28} /><h2>Programa no autorizado</h2><p>Tu cuenta aÃºn no tiene acceso a este programa. Solicita la autorizaciÃ³n al administrador del IESO.</p><Link className="primary-btn" to="/programas">Ver programas</Link></section></main>
      </>
    )
  }
  if (!program) return null

  const allDone = modules.length > 0 && modules.every(m => completed.includes(m.id))
  const active = modules[selected]

  return (
    <>
      <Nav session={session} profile={profile} />
      <main className="course">
        <div className="crumb"><Link to="/programas">Programas</Link><ChevronRight size={14} /><span>{program.title}</span></div>
        <section className="course-head">
          <div>
            <div className="eyebrow">PROGRAMA ACADÃ‰MICO</div><h1>{program.title}</h1><p>{program.description}</p>
            <div className="course-facts"><span><Clock3 size={17} />{program.duration}</span><span><BookOpen size={17} />{modules.length} mÃ³dulos</span><span><Award size={17} />CertificaciÃ³n IESO</span></div>
          </div>
          <div className="course-cover blue"><span>IESO</span><GraduationCap size={68} /><b>{program.title}</b></div>
        </section>
        <div className="course-body">
          <aside>
            <div className="aside-title">CONTENIDO DEL PROGRAMA</div>
            {modules.map((m, i) => {
              const done = completed.includes(m.id)
              const unlocked = i === 0 || completed.includes(modules[i - 1].id)
              return (
                <button disabled={!unlocked} className={'module-nav ' + (selected === i ? 'selected' : '')} onClick={() => setSelected(i)} key={m.id}>
                  <div><b>MÃ“DULO {String(i + 1).padStart(2, '0')}</b><span>{m.title}</span></div>
                  {done ? <Check size={16} /> : unlocked ? <ChevronRight size={15} /> : <Lock size={15} />}
                </button>
              )
            })}
          </aside>
          <section className="lesson">
            {active ? (
              <>
                <div className="lesson-top"><span>MÃ“DULO {String(selected + 1).padStart(2, '0')}</span><b>{completed.includes(active.id) ? 'Completado' : 'Disponible'}</b></div>
                <h2>{active.title}</h2><p>{active.content}</p>
                {active.video_url && <a className="resource" href={active.video_url} target="_blank" rel="noreferrer"><CirclePlay size={18} /> Ver video</a>}
                {active.material_path && <a className="resource" href={active.material_path} target="_blank" rel="noreferrer"><FileText size={18} /> Descargar material</a>}
                {!completed.includes(active.id) && <Link className="primary-btn continue" to={`/evaluacion/${program.id}?module=${active.id}`}>Presentar evaluaciÃ³n del mÃ³dulo <ArrowRight size={17} /></Link>}
              </>
            ) : <p className="no-content">El administrador aÃºn no ha publicado mÃ³dulos para este programa.</p>}
            {allDone && <div className="final-box"><Award size={25} /><div><b>Has completado todos los mÃ³dulos.</b><span>Presenta la evaluaciÃ³n final para obtener el certificado.</span></div><Link className="primary-btn" to={`/evaluacion/${program.id}?final=1`}>EvaluaciÃ³n final</Link></div>}
          </section>
        </div>
      </main>
    </>
  )
}

// ============================================================
// EVALUACIÃ“N
// ============================================================
type QuestionPublic = { id: string; program_id: string; module_id: string | null; question: string; options: string[] }

function AssessmentPage({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const moduleId = params.get('module')
  const final = params.get('final') === '1'
  const [questions, setQuestions] = useState<QuestionPublic[]>([])
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !id) return
    supabase.from('questions_public').select('*').eq('program_id', id)
      .then(({ data }) => {
        const all = (data || []) as QuestionPublic[]
        setQuestions(final ? all.filter(q => !q.module_id) : all.filter(q => q.module_id === moduleId))
      })
  }, [id, moduleId, final])

  if (!session) return <Navigate to="/ingresar" replace />
  if (!questions.length) {
    return (
      <>
        <Nav session={session} profile={profile} />
        <main className="assessment"><section className="question"><h2>EvaluaciÃ³n pendiente de configurar</h2><p>El administrador debe publicar las preguntas de esta evaluaciÃ³n antes de que puedas realizarla.</p><Link className="primary-btn" to={`/curso/${id}`}>Volver al curso</Link></section></main>
      </>
    )
  }

  const q = questions[step]

  const submit = async () => {
    if (answer === null || !supabase) return
    const merged = { ...answers, [q.id]: answer }
    setAnswers(merged)
    if (step < questions.length - 1) { setStep(step + 1); setAnswer(null); return }
    const payload = Object.entries(merged).map(([question_id, selected_index]) => ({ question_id, selected_index }))
    const { data, error: rpcError } = await supabase.rpc('submit_assessment_attempt', {
      p_program_id: id, p_module_id: final ? null : moduleId, p_is_final: final, p_answers: payload,
    })
    if (rpcError) { setError('No se pudo calificar el intento. Intenta de nuevo.'); return }
    const row = Array.isArray(data) ? data[0] : data
    if (row?.passed && !final && moduleId) {
      await supabase.from('module_completions').insert({ user_id: session.user.id, module_id: moduleId })
    }
    setResult({ score: row?.score ?? 0, passed: !!row?.passed })
  }

  return (
    <>
      <Nav session={session} profile={profile} />
      <main className="assessment">
        <div className="exam-label"><FileText /> {final ? 'EVALUACIÃ“N FINAL' : 'EVALUACIÃ“N DEL MÃ“DULO'}</div>
        {result ? (
          <section className="question result">
            <Award size={35} />
            <h2>{result.passed ? 'EvaluaciÃ³n aprobada' : 'EvaluaciÃ³n no aprobada'}</h2>
            <p>Obtuviste {result.score}%. {result.passed ? 'Tu resultado ha sido guardado.' : 'Necesitas 70% para aprobar.'}</p>
            <Link className="primary-btn" to={result.passed && final ? `/certificado/${id}` : `/curso/${id}`}>{result.passed && final ? 'Ver certificado' : 'Volver al curso'}</Link>
          </section>
        ) : (
          <>
            <h1>Comprueba lo que<br /><em>has aprendido.</em></h1>
            <div className="exam-progress"><span>Pregunta {step + 1} de {questions.length}</span><Progress value={(step + 1) / questions.length * 100} /><span>{Math.round((step + 1) / questions.length * 100)}%</span></div>
            <section className="question">
              <div className="question-number">{String(step + 1).padStart(2, '0')}</div>
              <h2>{q.question}</h2><p>Selecciona la respuesta mÃ¡s adecuada.</p>
              {q.options.map((x, i) => <button onClick={() => setAnswer(i)} className={'option ' + (answer === i ? 'chosen' : '')} key={i}><i>{String.fromCharCode(65 + i)}</i>{x}</button>)}
              {error && <div className="form-error">{error}</div>}
              <button disabled={answer === null} onClick={submit} className="primary-btn">{step === questions.length - 1 ? 'Finalizar evaluaciÃ³n' : 'Siguiente pregunta'} <ArrowRight size={17} /></button>
            </section>
          </>
        )}
      </main>
    </>
  )
}

// ============================================================
// CERTIFICADO
// ============================================================
function CertificatePage({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const { id } = useParams()
  const [program, setProgram] = useState<ProgramRow | null>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase || !id || !session) return
    (async () => {
      const { data: prog } = await supabase.from('programs').select('id,title,description,duration').eq('id', id).single()
      setProgram(prog || null)
      const { data: attempt } = await supabase.from('assessment_attempts').select('id').eq('user_id', session.user.id).eq('program_id', id).eq('is_final', true).eq('passed', true).maybeSingle()
      setEligible(!!attempt)
    })()
  }, [id, session?.user.id])

  if (!session) return <Navigate to="/ingresar" replace />
  if (eligible === false) return <Navigate to={`/curso/${id}`} replace />
  if (!program) return null

  return (
    <main className="certificate-page">
      <div className="certificate">
        <div className="cert-brand"><Logo /><ShieldCheck size={42} /></div>
        <div className="eyebrow">CERTIFICADO DE FINALIZACIÃ“N</div>
        <h1>Instituto de EducaciÃ³n Superior Oficial de Sanza</h1>
        <p>Certifica que</p><h2>{profile?.username}</h2>
        <p>ha completado satisfactoriamente el programa</p><h3>{program.title}</h3>
        <div className="cert-details"><span>Emitido el {new Date().toLocaleDateString('es-CO')}</span><span>CÃ³digo IESO-{program.id.slice(0, 5).toUpperCase()}-2026</span></div>
        <div className="cert-sign"><span>DirecciÃ³n AcadÃ©mica<br /><b>IESO Â· Reino de Sanza</b></span><i>â–¦</i></div>
      </div>
      <button className="primary-btn" onClick={() => window.print()}>Imprimir certificado</button>
    </main>
  )
}

// ============================================================
// LOGIN (usuario y contraseÃ±a; sin auto-registro)
// ============================================================
function LoginPage() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const nav = useNavigate()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!supabase) { setError('Supabase no estÃ¡ configurado.'); return }
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (authError || !data.session) { setError('No encontramos una cuenta autorizada con estos datos.'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
    nav(profile?.role === 'admin' ? '/gestion' : '/programas')
  }
  return (
    <main className="login-page">
      <Link to="/"><Logo /></Link>
      <div className="login-card">
        <div className="login-symbol"><GraduationCap /></div>
        <h1>Bienvenido al IESO</h1><p>Ingresa con las credenciales asignadas por el Instituto.</p>
        <form onSubmit={submit}>
          <label>Usuario<input value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario" autoComplete="username" /></label>
          <label>ContraseÃ±a<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseÃ±a" autoComplete="current-password" /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn">Iniciar sesiÃ³n <ArrowRight size={17} /></button>
        </form>
        <small>Las cuentas son creadas exclusivamente por la administraciÃ³n del IESO.</small>
      </div>
    </main>
  )
}

// ============================================================
// PANEL DE ADMINISTRACIÃ“N
// ============================================================
type StudentRow = { id: string; username: string }
type EnrollmentRow = { user_id: string; program_id: string }
type QuestionRow = { id: string; program_id: string; module_id: string | null; question: string }
type AttemptRow = { id: string; score: number; passed: boolean; is_final: boolean; created_at: string; profiles: { username: string } | null; programs: { title: string } | null }

function AdminPage({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const nav = useNavigate()
  const [tab, setTab] = useState<'Programas' | 'MÃ³dulos' | 'Evaluaciones' | 'Usuarios' | 'Accesos' | 'Notas'>('Programas')
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedModule, setSelectedModule] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [title, setTitle] = useState(''); const [text, setText] = useState(''); const [videoUrl, setVideoUrl] = useState(''); const [materialUrl, setMaterialUrl] = useState('')
  const [options, setOptions] = useState(''); const [correct, setCorrect] = useState(1); const [feedback, setFeedback] = useState('')
  const [newUsername, setNewUsername] = useState(''); const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  const reload = async () => {
    if (!supabase) return
    const { data: p } = await supabase.from('programs').select('id,title,description,duration')
    setPrograms(p || [])
    const { data: s } = await supabase.from('profiles').select('id,username').eq('role', 'student')
    setStudents(s || [])
    const { data: e } = await supabase.from('enrollments').select('user_id,program_id')
    setEnrollments(e || [])
  }
  useEffect(() => { reload() }, [])
  useEffect(() => {
    if (!supabase || !selectedProgram) { setModules([]); setQuestions([]); return }
    supabase.from('modules').select('*').eq('program_id', selectedProgram).order('position').then(({ data }) => setModules(data || []))
    supabase.from('questions').select('id,program_id,module_id,question').eq('program_id', selectedProgram).then(({ data }) => setQuestions(data || []))
  }, [selectedProgram])
  useEffect(() => {
    if (!supabase || tab !== 'Notas') return
    supabase.from('assessment_attempts').select('id,score,passed,is_final,created_at,profiles(username),programs(title)').order('created_at', { ascending: false })
      .then(({ data }) => setAttempts((data as any) || []))
  }, [tab])

  if (!session) return <Navigate to="/ingresar" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/programas" replace />
  if (!profile) return null

  const reset = () => { setTitle(''); setText(''); setVideoUrl(''); setMaterialUrl(''); setOptions(''); setFeedback(''); setNewUsername(''); setNewPassword('') }

  const createProgram = async () => {
    if (!title.trim() || !supabase) return
    await supabase.from('programs').insert({ title, description: text, duration: '10 semanas', published: true })
    setMessage('Programa publicado.'); reset(); reload()
  }
  const removeProgram = async (id: string) => { await supabase!.from('programs').delete().eq('id', id); setMessage('Programa eliminado.'); reload() }

  const createModule = async () => {
    if (!title.trim() || !selectedProgram || !supabase) return
    await supabase.from('modules').insert({ program_id: selectedProgram, position: modules.length + 1, title, content: text, video_url: videoUrl || null, material_path: materialUrl || null })
    setMessage('MÃ³dulo publicado.'); reset()
    const { data } = await supabase.from('modules').select('*').eq('program_id', selectedProgram).order('position'); setModules(data || [])
  }
  const removeModule = async (id: string) => {
    await supabase!.from('modules').delete().eq('id', id); setMessage('MÃ³dulo eliminado.')
    const { data } = await supabase!.from('modules').select('*').eq('program_id', selectedProgram).order('position'); setModules(data || [])
  }

  const createQuestion = async () => {
    if (!title.trim() || !selectedProgram || !supabase) return
    const opts = options.split('\n').map(o => o.trim()).filter(Boolean)
    if (opts.length < 2) { setMessage('Incluye al menos dos opciones.'); return }
    await supabase.from('questions').insert({ program_id: selectedProgram, module_id: selectedModule || null, question: title, options: opts, correct_index: Math.max(0, Math.min(opts.length - 1, correct - 1)), feedback: feedback || null })
    setMessage('Pregunta publicada.'); reset()
    const { data } = await supabase.from('questions').select('id,program_id,module_id,question').eq('program_id', selectedProgram); setQuestions(data || [])
  }
  const removeQuestion = async (id: string) => {
    await supabase!.from('questions').delete().eq('id', id); setMessage('Pregunta eliminada.')
    const { data } = await supabase!.from('questions').select('id,program_id,module_id,question').eq('program_id', selectedProgram); setQuestions(data || [])
  }

  const createStudent = async () => {
    if (!newUsername.trim() || !newPassword.trim()) { setMessage('Completa usuario y contraseÃ±a.'); return }
    const temp = createTempClient()
    if (!temp || !supabase) { setMessage('Supabase no estÃ¡ configurado.'); return }
    const { data, error } = await temp.auth.signUp({ email: usernameToEmail(newUsername), password: newPassword })
    if (error || !data.user) { setMessage('No se pudo crear la cuenta: ' + (error?.message || 'error desconocido')); return }
    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, username: newUsername.trim(), role: 'student' })
    if (profileError) { setMessage('Cuenta creada, pero fallÃ³ al guardar el perfil: ' + profileError.message); return }
    setMessage('Cuenta de estudiante creada.'); reset(); reload()
  }

  const toggleAccess = async (programId: string) => {
    if (!selectedStudent || !supabase) return
    const has = enrollments.some(e => e.user_id === selectedStudent && e.program_id === programId)
    if (has) await supabase.from('enrollments').delete().eq('user_id', selectedStudent).eq('program_id', programId)
    else await supabase.from('enrollments').insert({ user_id: selectedStudent, program_id: programId })
    reload()
  }

  const logout = async () => { await supabase?.auth.signOut(); nav('/') }

  return (
    <div className="admin">
      <aside className="admin-nav">
        <Logo light /><div className="admin-label">ADMINISTRACIÃ“N</div>
        {(['Programas', 'MÃ³dulos', 'Evaluaciones', 'Usuarios', 'Accesos', 'Notas'] as const).map(t =>
          <a className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setMessage(''); reset() }} key={t}>
            {t === 'Programas' && <BookOpen size={18} />}{t === 'MÃ³dulos' && <FileText size={18} />}{t === 'Evaluaciones' && <FileText size={18} />}{t === 'Usuarios' && <Users size={18} />}{t === 'Accesos' && <Users size={18} />}{t === 'Notas' && <Award size={18} />}
            {t}
          </a>
        )}
        <div className="admin-bottom"><a onClick={logout}><Lock size={17} />Cerrar sesiÃ³n</a></div>
      </aside>
      <main className="admin-main">
        <div className="admin-top"><div><span>GESTIÃ“N IESO</span><h1>{tab}</h1></div></div>

        {tab === 'Programas' && <>
          <section className="admin-form">
            <h2>Crear programa</h2>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del programa" />
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="DescripciÃ³n" />
            <button className="add-btn" onClick={createProgram}><Plus size={17} />Crear y publicar</button>
          </section>
          <section className="admin-table">
            <div className="table-head"><div><h2>Oferta acadÃ©mica</h2></div></div>
            {programs.map(p => <div className="tr" key={p.id}><span><b>{p.title}</b></span><span><em>Publicado</em></span><button className="plain-btn" onClick={() => removeProgram(p.id)}>Eliminar</button></div>)}
          </section>
        </>}

        {tab === 'MÃ³dulos' && <>
          <section className="admin-form">
            <h2>Crear mÃ³dulo</h2>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}><option value="">Selecciona un programa</option>{programs.map(p => <option value={p.id} key={p.id}>{p.title}</option>)}</select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="TÃ­tulo del mÃ³dulo" />
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Contenido de la lecciÃ³n" />
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="URL de video (opcional)" />
            <input value={materialUrl} onChange={e => setMaterialUrl(e.target.value)} placeholder="URL de material (opcional)" />
            <button className="add-btn" onClick={createModule}><Plus size={17} />Guardar mÃ³dulo</button>
          </section>
          <section className="admin-table">
            <div className="table-head"><div><h2>MÃ³dulos del programa seleccionado</h2></div></div>
            {modules.map(m => <div className="tr" key={m.id}><span><b>{m.title}</b></span><span>PosiciÃ³n {m.position}</span><button className="plain-btn" onClick={() => removeModule(m.id)}>Eliminar</button></div>)}
          </section>
        </>}

        {tab === 'Evaluaciones' && <>
          <section className="admin-form">
            <h2>AÃ±adir pregunta</h2>
            <select value={selectedProgram} onChange={e => { setSelectedProgram(e.target.value); setSelectedModule('') }}><option value="">Selecciona un programa</option>{programs.map(p => <option value={p.id} key={p.id}>{p.title}</option>)}</select>
            <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}><option value="">EvaluaciÃ³n final del curso</option>{modules.map(m => <option value={m.id} key={m.id}>Final del mÃ³dulo: {m.title}</option>)}</select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enunciado de la pregunta" />
            <textarea value={options} onChange={e => setOptions(e.target.value)} placeholder="Opciones: una por lÃ­nea" />
            <input type="number" min={1} value={correct} onChange={e => setCorrect(Number(e.target.value))} placeholder="NÃºmero de la respuesta correcta" />
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="RetroalimentaciÃ³n (opcional)" />
            <button className="add-btn" onClick={createQuestion}><Plus size={17} />Guardar pregunta</button>
          </section>
          <section className="admin-table">
            <div className="table-head"><div><h2>Preguntas del programa seleccionado</h2></div></div>
            {questions.map(q => <div className="tr" key={q.id}><span><b>{q.question}</b></span><span>{q.module_id ? 'MÃ³dulo' : 'Final'}</span><button className="plain-btn" onClick={() => removeQuestion(q.id)}>Eliminar</button></div>)}
          </section>
        </>}

        {tab === 'Usuarios' && <>
          <section className="admin-form">
            <h2>Crear cuenta de estudiante</h2>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Usuario" />
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="ContraseÃ±a" />
            <button className="add-btn" onClick={createStudent}><Plus size={17} />Crear cuenta</button>
          </section>
          <section className="admin-table">
            <div className="table-head"><div><h2>Usuarios autorizados</h2></div></div>
            {students.length ? students.map(s => <div className="tr" key={s.id}><span><b>{s.username}</b></span><span>Estudiante</span></div>) : <p className="empty">AÃºn no hay cuentas de estudiantes creadas.</p>}
          </section>
        </>}

        {tab === 'Accesos' && <>
          <section className="admin-form">
            <h2>AutorizaciÃ³n por programa</h2>
            <p>Una cuenta solo podrÃ¡ abrir los programas marcados aquÃ­.</p>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}><option value="">Selecciona un estudiante</option>{students.map(s => <option value={s.id} key={s.id}>{s.username}</option>)}</select>
            {selectedStudent && <div className="access-list">
              {programs.map(p => {
                const checked = enrollments.some(e => e.user_id === selectedStudent && e.program_id === p.id)
                return <label key={p.id}><input type="checkbox" checked={checked} onChange={() => toggleAccess(p.id)} />{p.title}</label>
              })}
            </div>}
          </section>
        </>}

        {tab === 'Notas' && <section className="admin-table">
          <div className="table-head"><div><h2>Notas e intentos de estudiantes</h2></div></div>
          {attempts.length ? attempts.map(a => <div className="tr" key={a.id}><span><b>{a.profiles?.username || 'â€”'}</b></span><span>{a.programs?.title || 'â€”'}</span><span>{a.is_final ? 'Final' : 'MÃ³dulo'} Â· {a.score}%</span><span><em>{a.passed ? 'Aprobado' : 'Reprobado'}</em></span></div>) : <p className="empty">AÃºn no hay evaluaciones presentadas.</p>}
        </section>}

        {message && <div className="admin-notice"><Check size={17} />{message}</div>}
      </main>
    </div>
  )
}

// ============================================================
// APP
// ============================================================
function App() {
  const { session, profile, loading } = useSession()
  if (loading) return null
  return (
    <Routes>
      <Route path="/" element={<Home session={session} profile={profile} />} />
      <Route path="/programas" element={<ProgramsPage session={session} profile={profile} />} />
      <Route path="/curso/:id" element={<CoursePage session={session} profile={profile} />} />
      <Route path="/evaluacion/:id" element={<AssessmentPage session={session} profile={profile} />} />
      <Route path="/certificado/:id" element={<CertificatePage session={session} profile={profile} />} />
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/gestion" element={<AdminPage session={session} profile={profile} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)
