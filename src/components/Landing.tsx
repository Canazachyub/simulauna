import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Clock, Award, ChevronRight, CheckCircle,
  Users, FileText, BarChart3, Zap, Target, Brain, Cpu, Heart, Scale
} from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: 'Preguntas de Exámenes Reales',
      description: 'Preguntas extraídas de todos los procesos de admisión UNA Puno desde 1993'
    },
    {
      icon: Clock,
      title: 'Cronómetro en Tiempo Real',
      description: 'Simula las condiciones reales del examen controlando tu tiempo de respuesta'
    },
    {
      icon: BarChart3,
      title: 'Análisis Detallado',
      description: 'Gráficos y estadísticas de tu rendimiento por cada una de las 18 asignaturas'
    },
    {
      icon: FileText,
      title: 'Reporte PDF',
      description: 'Descarga tus resultados en PDF con el detalle completo de tu desempeño'
    },
    {
      icon: Target,
      title: 'Puntaje según Prospecto',
      description: 'Cálculo exacto del puntaje usando las ponderaciones del prospecto vigente'
    },
    {
      icon: Zap,
      title: 'Banco Histórico',
      description: 'Más de 30 años de preguntas recopiladas de exámenes oficiales de admisión'
    }
  ];

  const areas = [
    {
      icon: Cpu,
      name: 'Ingenierías',
      color: 'bg-blue-500',
      careers: 'Sistemas, Civil, Mecánica, Electrónica, Minas, Agrícola, etc.'
    },
    {
      icon: Scale,
      name: 'Sociales',
      color: 'bg-amber-500',
      careers: 'Derecho, Contabilidad, Administración, Educación, Turismo, etc.'
    },
    {
      icon: Heart,
      name: 'Biomédicas',
      color: 'bg-rose-500',
      careers: 'Medicina, Enfermería, Odontología, Nutrición, Biología, etc.'
    }
  ];

  const stats = [
    { value: '60', label: 'Preguntas por simulacro' },
    { value: '18', label: 'Asignaturas evaluadas' },
    { value: '3', label: 'Áreas académicas' },
    { value: '32+', label: 'Años de exámenes' }
  ];

  const benefits = [
    'Preguntas reales de exámenes de admisión desde 1993',
    'Puntaje calculado según el prospecto vigente',
    'Navegación libre entre preguntas (avanzar y retroceder)',
    'Revisión detallada de cada respuesta al finalizar',
    'Identificación de fortalezas y áreas de mejora',
    'Funciona en móvil y desktop'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white">
        {/* Background image with blur overlay */}
        <div className="absolute inset-0">
          <img
            src="https://medicina.unap.edu.pe/sites/medicinahumana.dev.unap.edu.pe/files/2025-11/Foto-infraestructura-universitaria.jpg"
            alt="Universidad Nacional del Altiplano"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/85 to-primary-700/80 backdrop-blur-sm" />
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400 rounded-full opacity-20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full opacity-5 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 animate-fade-in">
              <GraduationCap className="w-10 h-10" />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight animate-slide-up">
              Prepárate para el
              <span className="block text-primary-200">Examen de Admisión UNA 2025</span>
            </h1>

            <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Practica con <strong>preguntas reales</strong> extraídas de los exámenes
              de admisión UNA Puno desde 1993 hasta el último proceso de admisión.
              Obtén tu puntaje calculado según el <strong>prospecto vigente</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => navigate('/registro')}
                className="btn-primary text-lg px-8 py-4 bg-white text-primary-700 hover:bg-primary-50 shadow-xl"
              >
                Comenzar Simulacro
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/banqueo')}
                className="btn text-lg px-8 py-4 bg-primary-500/20 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-sm"
              >
                <BookOpen className="w-5 h-5" />
                Banqueo por Curso
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-primary-200">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#F8FAFC"
            />
          </svg>
        </div>
      </section>

      {/* Areas Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Elige tu área académica
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Cada área tiene su propio conjunto de asignaturas y ponderaciones,
              igual que en el examen real de la UNA Puno
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {areas.map((area, index) => (
              <div
                key={index}
                className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => navigate('/registro')}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 ${area.color} text-white rounded-xl mb-4 group-hover:scale-110 transition-transform`}>
                  <area.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {area.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {area.careers}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              ¿Por qué usar SimulaUNA?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              La herramienta más completa para prepararte y conocer tu nivel real
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
                  Fácil y rápido
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
                  Comienza en 3 simples pasos
                </h2>
                <p className="text-slate-600 mb-8">
                  No necesitas crear una cuenta ni proporcionar datos personales.
                  Solo ingresa tu DNI para identificar tu resultado y comienza a practicar.
                </p>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Ingresa tus datos</h4>
                      <p className="text-sm text-slate-500">DNI y nombre completo</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">Selecciona tu área</h4>
                      <p className="text-sm text-slate-500">Ingenierías, Sociales o Biomédicas</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">¡Resuelve y obtén tu puntaje!</h4>
                      <p className="text-sm text-slate-500">60 preguntas con tiempo libre</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects preview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              18 asignaturas evaluadas
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              El examen cubre todas las materias del currículo nacional,
              cada una con su propia ponderación según el área elegida
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {[
              'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
              'Física', 'Química', 'Biología y Anatomía', 'Psicología y Filosofía',
              'Geografía', 'Historia', 'Educación Cívica', 'Economía',
              'Comunicación', 'Literatura', 'Razonamiento Matemático',
              'Razonamiento Verbal', 'Inglés', 'Quechua y Aimara'
            ].map((subject, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-primary-100 hover:text-primary-700 transition-colors"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para conocer tu nivel?
          </h2>
          <p className="text-primary-100 mb-8 max-w-xl mx-auto">
            Practica con simulacros realistas y llega preparado al día del examen.
            ¡El conocimiento es poder!
          </p>
          <button
            onClick={() => navigate('/registro')}
            className="btn bg-white text-primary-700 hover:bg-primary-50 text-lg px-10 py-4 shadow-xl"
          >
            Iniciar Simulacro
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              <span className="font-semibold text-white">SimulaUNA</span>
              <span className="hidden sm:inline">- Universidad Nacional del Altiplano</span>
            </p>
            <p className="text-sm text-center md:text-right">
              Preguntas reales de exámenes de admisión UNA Puno desde 1993
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
