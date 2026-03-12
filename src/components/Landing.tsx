import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Clock, ChevronRight, CheckCircle,
  BarChart3, Target, Brain, Cpu, Heart, Scale, Calendar,
  History, MessageCircle, Sparkles, Trophy, Zap, Layers, Tag
} from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/51900266810?text=Hola,%20quiero%20acceso%20a%20la%20plataforma%20SimulaUNA', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://medicina.unap.edu.pe/sites/medicinahumana.dev.unap.edu.pe/files/2025-11/Foto-infraestructura-universitaria.jpg"
            alt="Universidad Nacional del Altiplano"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/95 via-primary-800/90 to-primary-700/85" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Preguntas extraídas de exámenes ya tomados</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
              Prepárate para la
              <span className="block bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Admisión UNA 2025
              </span>
            </h1>

            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              Practica con <strong className="text-white">preguntas reales</strong> extraídas de los
              exámenes de admisión UNA Puno desde 1993 y <strong className="text-white">cuadernillos CEPREUNA</strong>.
            </p>

            {/* Stats inline */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {[
                { value: '60', label: 'preguntas' },
                { value: '18', label: 'asignaturas' },
                { value: '32+', label: 'años de exámenes' }
              ].map((stat, i) => (
                <div key={i} className="text-center px-4">
                  <p className="text-3xl md:text-4xl font-bold">{stat.value}</p>
                  <p className="text-xs text-primary-200 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/registro')}
                className="group px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Comenzar Simulacro
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleWhatsAppClick}
                className="px-8 py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Obtener Acceso
              </button>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full">
            <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 30 1380 25L1440 20V80H0Z" fill="#F8FAFC"/>
          </svg>
        </div>
      </section>

      {/* ¿Sabías que? Section */}
      <section className="py-10 bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">💡</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 mb-1">¿Sabías que...?</h3>
              <p className="text-amber-800">
                <strong>Los exámenes de admisión de la UNA Puno casi siempre se basan en preguntas de años anteriores.</strong>{' '}
                Practica con las preguntas que ya fueron tomadas por la universidad y aumenta significativamente
                tus probabilidades de éxito. ¡Muchas preguntas se repiten o son muy similares!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bancos Section - Principal */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
              Elige tu modo de práctica
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Dos bancos especializados para tu preparación
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Banco General */}
            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <History className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Banco General</h3>
                    <p className="text-sm text-slate-500">Exámenes de Admisión 1993-2024</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  Preguntas <strong>reales extraídas</strong> de más de 30 años de exámenes de admisión ya tomados por la UNA Puno.
                </p>

                <ul className="space-y-2 mb-6 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    Preguntas que ya cayeron en exámenes reales
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    3 áreas: Ingenierías, Biomédicas, Sociales
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    60 preguntas con puntaje según prospecto
                  </li>
                </ul>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/registro')}
                    className="flex-1 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Target className="w-4 h-4" />
                    Simulacro
                  </button>
                  <button
                    onClick={() => navigate('/banqueo')}
                    className="flex-1 py-3 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" />
                    Banqueo
                  </button>
                </div>
              </div>
            </div>

            {/* Banco CEPREUNA */}
            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Banco CEPREUNA</h3>
                    <p className="text-sm text-slate-500">Cuadernillos Semanales 2024-2025</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  Preguntas de los <strong>cuadernillos semanales</strong> del Centro Pre-Universitario de la UNA Puno.
                </p>

                <ul className="space-y-2 mb-6 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Preguntas organizadas por semana (S1-S16)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Filtrado por área: ING, BIO, SOC
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Ideal para estudiantes del CEPRE
                  </li>
                </ul>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/simulacro-cepreuna')}
                    className="flex-1 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Target className="w-4 h-4" />
                    Simulacro
                  </button>
                  <button
                    onClick={() => navigate('/banqueo-cepreuna')}
                    className="flex-1 py-3 bg-emerald-50 text-emerald-600 text-sm font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" />
                    Banqueo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Banqueo por Tema - NEW */}
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-orange-200">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-800">Banqueo por Tema</h3>
                      <span className="text-xs font-medium bg-orange-500 text-white px-2 py-0.5 rounded-full">NUEVO</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Practica preguntas filtradas por <strong>curso, tema y subtema</strong>. Combina preguntas de ambos bancos para una práctica más específica.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/banqueo-tema')}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                  >
                    <Tag className="w-5 h-5" />
                    Practicar por Tema
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Áreas Académicas */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              3 Áreas Académicas
            </h2>
            <p className="text-slate-500">Ponderaciones según el prospecto vigente</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <button
              onClick={() => navigate('/registro')}
              className="p-5 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <Cpu className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-bold text-slate-800 mb-1">Ingenierías</h3>
              <p className="text-xs text-slate-500">Sistemas, Civil, Minas...</p>
            </button>
            <button
              onClick={() => navigate('/registro')}
              className="p-5 rounded-xl border-2 border-rose-100 bg-rose-50/50 hover:border-rose-300 hover:shadow-md transition-all text-left"
            >
              <Heart className="w-8 h-8 text-rose-500 mb-3" />
              <h3 className="font-bold text-slate-800 mb-1">Biomédicas</h3>
              <p className="text-xs text-slate-500">Medicina, Enfermería...</p>
            </button>
            <button
              onClick={() => navigate('/registro')}
              className="p-5 rounded-xl border-2 border-amber-100 bg-amber-50/50 hover:border-amber-300 hover:shadow-md transition-all text-left"
            >
              <Scale className="w-8 h-8 text-amber-500 mb-3" />
              <h3 className="font-bold text-slate-800 mb-1">Sociales</h3>
              <p className="text-xs text-slate-500">Derecho, Contabilidad...</p>
            </button>
          </div>
        </div>
      </section>

      {/* Features - Compacto */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              Todo lo que necesitas
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Clock, title: 'Cronómetro', desc: 'Control de tiempo real' },
              { icon: BarChart3, title: 'Estadísticas', desc: 'Por asignatura' },
              { icon: Trophy, title: 'Historial', desc: 'Guarda tu progreso' },
              { icon: Zap, title: 'PDF', desc: 'Descarga resultados' }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{f.title}</h4>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo Funciona - Simplificado */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Comienza en 3 pasos
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">1</div>
                <span className="font-medium text-slate-700">Ingresa DNI</span>
                <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">2</div>
                <span className="font-medium text-slate-700">Elige área</span>
                <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">3</div>
                <span className="font-medium text-slate-700">¡Resuelve!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Asignaturas - Tags compactos */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-700">18 asignaturas evaluadas</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {[
              'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
              'Física', 'Química', 'Biología', 'Anatomía',
              'Psicología', 'Filosofía', 'Historia', 'Geografía',
              'Cívica', 'Economía', 'Comunicación', 'Literatura',
              'R. Matemático', 'R. Verbal'
            ].map((s, i) => (
              <span key={i} className="px-3 py-1 bg-white text-slate-600 text-xs rounded-full border border-slate-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4 text-center">
          <Brain className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            ¿Listo para practicar?
          </h2>
          <p className="text-primary-100 mb-6 max-w-md mx-auto text-sm">
            Conoce tu nivel real y prepárate para el examen de admisión
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/registro')}
              className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Comenzar Ahora
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleWhatsAppClick}
              className="px-8 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp: 900 266 810
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Limpio */}
      <footer className="bg-slate-800 text-slate-400 py-10">
        <div className="container mx-auto px-4">
          {/* SINAPSIS */}
          <div className="text-center mb-6">
            <p className="text-xl font-bold text-white mb-1">SINAPSIS</p>
            <p className="text-sm">Plataforma educativa para tu éxito</p>
          </div>

          {/* Social */}
          <div className="flex justify-center gap-4 mb-6">
            <a
              href="https://www.facebook.com/Sinapquiz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-slate-700 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@sinapsisperu"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-slate-700 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
              </svg>
            </a>
            <a
              href="https://wa.me/51900266810?text=Hola,%20quiero%20acceso%20a%20la%20plataforma%20SimulaUNA"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-slate-700 hover:bg-green-500 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>

          {/* Bottom */}
          <div className="text-center pt-6 border-t border-slate-700">
            <div className="flex items-center justify-center gap-2 text-sm">
              <GraduationCap className="w-4 h-4" />
              <span className="font-medium text-white">SimulaUNA</span>
              <span className="text-slate-500">•</span>
              <span>UNA Puno</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
